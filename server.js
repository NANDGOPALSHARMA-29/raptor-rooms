const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
const console = require("console");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server});

app.use(express.static(path.join(__dirname, "public")));


function sendOnlineCount() {
    const count = wss.clients.size;
    const data = {
        type: "onlineCount",
        count: count
    };
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

wss.on("connection",(ws)=>{
    console.log("New client connected...");
    sendOnlineCount();


    ws.on("message", (message) => {
        const data = JSON.parse(message.toString());
    // Join notification
        if (data.type === "join") {
            ws.username = data.username;
            const notification = JSON.stringify({
                type: "notification",
                message: `${ws.username} joined the chat`
            })
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(notification);
                }
            })
            return;
        }
    // Normal chat message
        if (data.type === "chat") {
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            })
        }
    })

    ws.on("close",()=>{
        console.log("Client disconnected...");
        sendOnlineCount();
        if (ws.username) {
            const notification = JSON.stringify({
                type: "notification",
                message: `${ws.username} left the chat`
            });

            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(notification);
                }
            });
        }
    })
})

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

