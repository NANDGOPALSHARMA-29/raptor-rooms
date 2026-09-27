const usernameInput = document.getElementById("username");
const joinBtn = document.getElementById("join-btn");
const joinScreen = document.getElementById("join-screen");
const chatScreen = document.getElementById("chat-screen");
const onlineCount = document.getElementById("online-count");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const chatForm = document.getElementById("chat-form");

let ws;
let username;

// Join Chat
joinBtn.addEventListener("click", () => {
    username = usernameInput.value.trim();

    if (username === "") {
        alert("Please enter your name!");
        return;
    }

    // WebSocket connection
    ws = new WebSocket(`ws://${location.host}`);

    ws.onopen = () => {
        ws.send(JSON.stringify({
            type: "join",
            username: username
        }))

        joinScreen.style.display = "none";
        chatScreen.style.display = "flex";
    };

    ws.onmessage = (event) => {
        
        const data = JSON.parse(event.data);
        if (data.type === "onlineCount") {
            onlineCount.textContent = `🟢 Online: ${data.count}`;
            return;
        }
        
        if (data.type === "notification") {
            const notificationDiv = document.createElement("div");
            notificationDiv.classList.add("notification");
            notificationDiv.textContent = data.message;
            messagesDiv.appendChild(notificationDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

            return;
        }

        if(data.type==="chat"){
            const messageDiv = document.createElement("div");
            messageDiv.classList.add("message");

            const nameSpan = document.createElement("span");
            nameSpan.classList.add("username");
            nameSpan.textContent = data.username;

            const textSpan = document.createElement("span");
            textSpan.classList.add("text");
            textSpan.textContent = data.message;

            messageDiv.appendChild(nameSpan);
            messageDiv.appendChild(textSpan);

            messagesDiv.appendChild(messageDiv);

            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
    };

    ws.onerror = () => {
        alert("WebSocket connection error!");
    };
});

// Send Message
chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (message === "" || !ws || ws.readyState !== WebSocket.OPEN) {
        return;
    }

    const data = {
        type: "chat",
        username: username,
        message: message
    };
    ws.send(JSON.stringify(data));
    messageInput.value = "";
});
