const ws = new WebSocket(`ws://${location.host}`);

// Screens
const joinScreen = document.getElementById("join-screen");
const roomScreen = document.getElementById("room-screen");
const chatScreen = document.getElementById("chat-screen");

// Username
const usernameInput = document.getElementById("username");
const joinBtn = document.getElementById("join-btn");

// Room elements
const createRoomInput = document.getElementById("create-room-input");
const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomInput = document.getElementById("join-room-input");
const joinRoomBtn = document.getElementById("join-room-btn");

// Chat elements
const currentRoom = document.getElementById("current-room");
const messages = document.getElementById("messages");
const onlineCount = document.getElementById("online-count");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");

let username = "";

// WebSocket connection
ws.onopen = () => {
    console.log("Connected to server");
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // Online count
    if (data.type === "onlineCount") {
        onlineCount.textContent = `🟢 Online: ${data.count}`;
    }

    // Room created successfully
    if (data.type === "roomCreated") {
        openChat(data.roomName);
        addMessage(`Room "${data.roomName}" created successfully`);
    }

    // Room joined successfully
    if (data.type === "roomJoined") {
        openChat(data.roomName);
        addMessage(`Joined room "${data.roomName}"`);
    }

    // Server error
    if (data.type === "error") {
        alert(data.message);
    }

    // Chat message
    if (data.type === "chat") {
        addMessage(`${data.username}: ${data.message}`);
    }

    // Notification
    if (data.type === "notification") {
        addMessage(data.message);
    }
};

// Username submit
joinBtn.addEventListener("click", () => {
    username = usernameInput.value.trim();
    if (!username) {
        alert("Please enter your name!");
        return;
    }
    if (ws.readyState !== WebSocket.OPEN) {
        alert("Server is not connected yet!");
        return;
    }

    // Send username to server
    ws.send(JSON.stringify({
        type: "join",
        username: username
    }));
    joinScreen.style.display = "none";
    roomScreen.style.display = "block";
});

// Create room
createRoomBtn.addEventListener("click", () => {
    const roomName = createRoomInput.value.trim();
    if (!roomName) {
        alert("Please enter a room name!");
        return;
    }
    ws.send(JSON.stringify({
        type: "createRoom",
        roomName: roomName
    }));
});

// Join room
joinRoomBtn.addEventListener("click", () => {
    const roomName = joinRoomInput.value.trim();
    if (!roomName) {
        alert("Please enter a room name!");
        return;
    }

    ws.send(JSON.stringify({
        type: "joinRoom",
        roomName: roomName
    }));
});

// Open chat screen
function openChat(roomName) {
    roomScreen.style.display = "none";
    chatScreen.style.display = "flex";
    currentRoom.textContent = roomName;
    messages.innerHTML = "";
}

// Display message
function addMessage(message) {
    const p = document.createElement("p");
    p.textContent = message;
    messages.appendChild(p);
    messages.scrollTop = messages.scrollHeight;
}

// Send chat message
chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();

    if (!message) return;

    ws.send(JSON.stringify({
        type: "chat",
        username: username,
        message: message
    }));

    messageInput.value = "";
});
