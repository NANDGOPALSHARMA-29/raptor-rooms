
const currentUser = document.getElementById("current-user");
const currentRoom = document.getElementById("current-room");
const onlineCount = document.getElementById("online-count");
const messages = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const backBtn = document.getElementById("back-to-rooms-btn");
const chatStatus = document.getElementById("chat-status");

let socket;
let authenticated = false;
let joinedRoom = false;

const roomName = sessionStorage.getItem("raptorRoom");

if (!roomName) {
    window.location.replace("/room.html");
} else {
    currentRoom.textContent = roomName;
    initializeChat();
}

async function initializeChat() {
    try {
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
            sessionStorage.removeItem("raptorRoom");
            window.location.replace("/");
            return;
        }

        const data = await response.json();
        currentUser.textContent = data.user.username;

        const protocol =
            location.protocol === "https:" ? "wss:" : "ws:";

        socket = new WebSocket(`${protocol}//${location.host}`);

        socket.onopen = () => {
            chatStatus.textContent = "Authenticating...";
        };

        socket.onmessage = (event) => {
            let data;

            try {
                data = JSON.parse(event.data);
            } catch {
                return;
            }

            if (data.type === "authenticated") {
                authenticated = true;

                socket.send(JSON.stringify({
                    type: "joinRoom",
                    roomName
                }));

                return;
            }

            if (data.type === "roomJoined") {
                joinedRoom = true;
                chatStatus.textContent = "Connected to room.";
                messageInput.focus();
                return;
            }

            if (data.type === "onlineCount") {
                onlineCount.textContent =
                    `🟢 Online: ${data.count}`;
                return;
            }

            if (data.type === "notification") {
                addMessage(data.message);
                return;
            }

            if (data.type === "chat") {
                addMessage(`${data.username}: ${data.message}`);
                return;
            }

            if (data.type === "error") {
                chatStatus.textContent = data.message;

                // A missing room cannot be joined.
                if (data.message === "Room does not exist!") {
                    sessionStorage.removeItem("raptorRoom");
                    window.location.replace("/room.html");
                }
            }
        };

        socket.onclose = () => {
            authenticated = false;
            joinedRoom = false;
            chatStatus.textContent =
                "Disconnected. Refresh to reconnect.";
        };

        socket.onerror = () => {
            chatStatus.textContent = "WebSocket connection failed.";
        };
    } catch (error) {
        console.error("Chat initialization failed:", error);
        chatStatus.textContent = "Unable to connect to chat.";
    }
}

function addMessage(message) {
    const p = document.createElement("p");
    p.textContent = message;
    messages.appendChild(p);
    messages.scrollTop = messages.scrollHeight;
}

chatForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message) return;

    if (
        !authenticated ||
        !joinedRoom ||
        !socket ||
        socket.readyState !== WebSocket.OPEN
    ) {
        chatStatus.textContent = "Please wait until you join the room.";
        return;
    }

    socket.send(JSON.stringify({
        type: "chat",
        message
    }));

    messageInput.value = "";
    messageInput.focus();
});

backBtn.addEventListener("click", () => {
    // Navigation closes this page's WebSocket connection.
    window.location.assign("/room.html");
});
