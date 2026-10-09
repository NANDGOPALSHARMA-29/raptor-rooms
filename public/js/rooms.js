
const roomScreen = document.getElementById("room-screen");
const currentUser = document.getElementById("current-user");

const createRoomInput = document.getElementById("create-room-input");
const createRoomBtn = document.getElementById("create-room-btn");
const joinRoomInput = document.getElementById("join-room-input");
const joinRoomBtn = document.getElementById("join-room-btn");
const roomStatus = document.getElementById("room-status");

async function initializeRooms() {
    try {
        const response = await fetch("/api/auth/me");

        if (!response.ok) {
            window.location.replace("/");
            return;
        }

        const data = await response.json();
        currentUser.textContent = data.user.username;
        roomScreen.style.display = "block";
        roomStatus.textContent = "Create or join a room.";
    } catch (error) {
        console.error("Session check failed:", error);
        roomStatus.textContent = "Unable to connect to server.";
    }
}

async function sendRoomAction(type, input, button) {
    const roomName = input.value.trim();

    if (!roomName) {
        roomStatus.textContent = "Please enter a room name.";
        return;
    }

    try {
        createRoomBtn.disabled = true;
        joinRoomBtn.disabled = true;
        roomStatus.textContent = "Processing...";

        const response = await fetch(`/api/rooms/${type}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ roomName })
        });

        const data = await response.json();

        if (!response.ok) {
            roomStatus.textContent = data.message;
            return;
        }

        sessionStorage.setItem("raptorRoom", data.roomName);
        window.location.assign("/chat.html");

    } catch (error) {
        console.error("Room request failed:", error);
        roomStatus.textContent = "Something went wrong. Try again.";
    } finally {
        createRoomBtn.disabled = false;
        joinRoomBtn.disabled = false;
    }
}

createRoomBtn.addEventListener("click", () => {
    sendRoomAction("create", createRoomInput, createRoomBtn);
});

joinRoomBtn.addEventListener("click", () => {
    sendRoomAction("join", joinRoomInput, joinRoomBtn);
});

initializeRooms();
