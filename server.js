const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
let lastWinnerId = null;

// Serve main menu
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main-menu.html'));
});

// Serve static files
app.use(express.static(path.join(__dirname)));

const rooms = {}; // { roomCode: { players: [], picked: [], turnIndex: 0, winner: null, restartRequested: false } }

io.on('connection', (socket) => {
  console.log('🔌 Connected:', socket.id);
  socket.on("gameResetRequest", ({ lastWinner }) => {
        let nextPlayerId;

        if (!lastWinner) {
            // First game: host starts
            nextPlayerId = getHostId(); // your function to get host socket
        } else {
            // Next game: loser goes first
            nextPlayerId = getOtherPlayerId(lastWinner);
        }

        io.to(socket.room).emit("gameReset", { nextPlayerId });
    });

    socket.on("bingoResult", ({ winnerId }) => {
        lastWinnerId = winnerId;
    });
  // --- Create Room ---
  socket.on("requestRoom", () => {
    let roomCode = Math.floor(100 + Math.random() * 900).toString();
    while (rooms[roomCode]) roomCode = Math.floor(100 + Math.random() * 900).toString();

    rooms[roomCode] = { players: [], picked: [], turnIndex: 0, winner: null, restartRequested: false };
    socket.emit("roomCreated", roomCode);
  });

  // --- Join Room ---
  socket.on('joinRoom', (roomCode) => {
    if (!rooms[roomCode]) {
      rooms[roomCode] = { players: [], picked: [], turnIndex: 0, winner: null, restartRequested: false };
      console.log('🏠 Room created:', roomCode);
    }

    const room = rooms[roomCode];
    
    if (room.players.length >= 3) {
      socket.emit('roomFull');
      return;
    }

    room.players.push(socket.id);
    socket.join(roomCode);

    socket.emit('roomJoined', {
      code: roomCode,
      picked: room.picked,
      players: room.players,
      turnIndex: room.turnIndex
    });
    
    socket.to(roomCode).emit('playerJoined', { players: room.players });
  });

  // --- Number Picked ---
  socket.on('numberPicked', ({ code, number }) => {
    const room = rooms[code];
    if (!room) return;

    if (!room.picked.includes(number)) {
      room.picked.push(number);

      room.turnIndex = (room.turnIndex + 1) % room.players.length;
      const nextPlayerId = room.players[room.turnIndex];

      io.to(code).emit('syncNumber', { number, nextPlayerId });
    }
  });

  // --- Race-Win BINGO ---
  socket.on("bingoPressed", (code) => {
    const room = rooms[code];
    if (!room || room.winner) return; // ignore if already won

    room.winner = socket.id;
    io.to(code).emit("bingoResult", { winnerId: socket.id });
    console.log("🏆 Winner:", socket.id, "Room:", code);
  });

  // --- Disconnect ---
  socket.on('disconnect', () => {
    console.log('⚠️ Disconnected:', socket.id);

    for (const code in rooms) {
      const room = rooms[code];
      const index = room.players.indexOf(socket.id);

      if (index !== -1) {
        room.players.splice(index, 1);
        socket.to(code).emit('playerLeft', room.players);

        if (room.turnIndex >= room.players.length) room.turnIndex = 0;

        if (room.players.length === 0) {
          delete rooms[code];
          console.log('🗑 Room', code, 'deleted.');
        }
      }
    }
  });

  // --- Restart Game ---
  socket.on("restartGame", (room) => {
    if (!rooms[room]) return;
    if (rooms[room].restartRequested) return;

    rooms[room].restartRequested = true;
    rooms[room].picked = [];
    rooms[room].turnIndex = 0;
    rooms[room].winner = null; // reset winner

    io.to(room).emit("gameReset", {
  nextPlayerId: rooms[room].players[0]
});


    setTimeout(() => {
      if (rooms[room]) rooms[room].restartRequested = false;
    }, 1000);
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

