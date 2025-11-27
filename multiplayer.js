// --------- SETUP ---------
const socket = io();
const grid = document.getElementById("grid");
const roomUI = document.getElementById("roomUI");
const gameBoard = document.getElementById("gameBoard");
const roomDisplay = document.getElementById("roomDisplay");

let myTurn = false;
let myRoom = null;

const createRoomBtn = document.getElementById("createRoomBtn");
const joinRoomBtn = document.getElementById("joinRoomBtn");
const joinCodeInput = document.getElementById("joinCodeInput");

// Create Room
createRoomBtn.addEventListener("click", () => {
    socket.emit("createRoom");
});

// Join Room
joinRoomBtn.addEventListener("click", () => {
    const code = joinCodeInput.value.trim();
    socket.emit("joinRoom", code);
});


// build grid buttons
const buttons = [];
for (let i = 0; i < 25; i++) {
    const btn = document.createElement("button");
    btn.textContent = "";
    grid.appendChild(btn);
    buttons.push(btn);

    btn.addEventListener("click", () => {
        if (!myTurn) return;

        const number = parseInt(btn.textContent);
        socket.emit("selectNumber", { room: myRoom, number });

        setButtonActive(number);

        myTurn = false;
    });
}


// -------- ROOM CREATE --------
document.getElementById("createRoomBtn").onclick = () => {
    socket.emit("createRoom");
};

// -------- JOIN ROOM ----------
document.getElementById("joinRoomBtn").onclick = () => {
    const code = document.getElementById("joinInput").value.trim();
    if (code.length === 4) {
        socket.emit("joinRoom", code);
    }
};


// ----------- SERVER EVENTS ------------

// Room created
socket.on("roomCreated", (code) => {
    myRoom = code;
    roomDisplay.style.display = "block";
    roomDisplay.textContent = "Room Code: " + code;
    roomUI.style.display = "none";
    gameBoard.style.display = "block";

    generateNumbers();
});

// Joined existing room
socket.on("roomJoined", (code) => {
    myRoom = code;
    roomDisplay.style.display = "block";
    roomDisplay.textContent = "Room Code: " + code;
    roomUI.style.display = "none";
    gameBoard.style.display = "block";
    
    generateNumbers();
});

// ✅ Add this at the bottom
socket.on("joinedRoom", ({ code }) => {
    document.getElementById("roomCodeDisplay").style.display = "block";
    document.getElementById("roomCodeDisplay").textContent = "Room Code: " + code;
});

// Room full
socket.on("roomFull", () => {
    alert("Room is FULL!");
});

// Turn indicator
socket.on("yourTurn", () => {
    myTurn = true;
});

// Someone selected a number
socket.on("playerSelectedNumber", ({ number }) => {
    setButtonActive(number);
});


// ---------- WIN / LOSE ----------
socket.on("youLose", () => {
    alert("You Lose!");
});


// -------------------------------------------------
// GRID NUMBER GENERATION
// -------------------------------------------------
function generateNumbers() {
    const nums = Array.from({ length: 25 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);

    nums.forEach((n, i) => {
        buttons[i].textContent = n;
    });

    // NEW: Host sends grid to server
    socket.emit("sendGrid", { code: myRoom, grid: nums });
}


// -------------------------------------------------
// HELPER: Activate a button everywhere
// -------------------------------------------------
function setButtonActive(num) {
    const btn = buttons.find(b => parseInt(b.textContent) === num);
    if (btn) btn.classList.add("active");
}
socket.on("receiveGrid", (grid) => {
    grid.forEach((num, i) => {
        buttons[i].textContent = num;
    });
});
