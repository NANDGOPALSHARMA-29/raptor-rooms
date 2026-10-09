const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");
require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");


const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({server});
const rooms = new Map();


mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected");
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error);
    });


app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(cookieParser());

const authRoutes = require("./routes/authRoutes");
app.use("/api/auth", authRoutes);


function createRoom(roomName) {
    if (rooms.has(roomName)) {
        return false;
    }
    rooms.set(roomName, new Set());
    return true;
}


function joinRoom(roomName, ws) {
    if (!rooms.has(roomName)) {
        return false;
    }
    // Leave previous room
    if (ws.room) {
        const oldRoomName = ws.room;
        const oldRoom = rooms.get(oldRoomName);
        if (oldRoom) {
            // Notify old room members
            if (ws.username) {
                const notification = JSON.stringify({
                    type: "notification",
                    message: `${ws.username} left the room`
                });
                oldRoom.forEach((client) => {
                    if (
                        client !== ws &&
                        client.readyState === WebSocket.OPEN
                    ) {
                        client.send(notification);
                    }
                });
            }
            // Remove user
            oldRoom.delete(ws);
            // Update old room
            if (oldRoom.size === 0) {
                rooms.delete(oldRoomName);
            } else {
                sendRoomOnlineCount(oldRoomName);
            }
        }
    }
    // Join new room
    const newRoom = rooms.get(roomName);
    newRoom.add(ws);
    ws.room = roomName;
    return true;
}


function sendRoomOnlineCount(roomName){
    const room = rooms.get(roomName);
    if (!room) return;
    const data = {
        type: "onlineCount",
        count: room.size
    };
    room.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}


wss.on("connection",(ws)=>{
    console.log("New client connected...");
    ws.isAuthenticated = false;
    ws.on("message", (message) => {
        const data = JSON.parse(message.toString());

        if (data.type === "authenticate") {
                try {
                    const decoded = jwt.verify(
                        data.token,
                        process.env.JWT_SECRET
                    );
                    ws.userId = decoded.userId;
                    ws.username = decoded.username;
                    ws.isAuthenticated = true;
                    ws.send(JSON.stringify({
                        type: "authenticated",
                        message: "WebSocket authentication successful",
                        user: {
                            id: ws.userId,
                            username: ws.username
                        }
                    }));
                    console.log(
                        `${ws.username} authenticated successfully`
                    );
                } catch (error) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Invalid or expired token"
                    }));
                    ws.close();
                }
                return;
            }
            // Authentication required
            if (!ws.isAuthenticated) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Please authenticate first"
                }));
                return;
            }

        // Create Room
        if (data.type === "createRoom") {
            const roomName = data.roomName.trim();
            const created = createRoom(roomName);
            if (created){
                joinRoom(roomName, ws);
                sendRoomOnlineCount(roomName);
                ws.send(JSON.stringify({
                    type: "roomCreated",
                    roomName: roomName
                }));
            } else {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Room already exists!"
                }));
            }
            return;
        }

        // Join Room
        if (data.type === "joinRoom") {
            const roomName = data.roomName.trim();
            const joined = joinRoom(roomName, ws);
            if (joined) {
                sendRoomOnlineCount(roomName);
                ws.send(JSON.stringify({
                    type: "roomJoined",
                    roomName: roomName
                }));
                const room = rooms.get(roomName);
                const notification = JSON.stringify({
                    type: "notification",
                    message: `${ws.username} joined the room`
                });
                room.forEach((client) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(notification);
                    }
                });
            } else {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Room does not exist!"
                }));
            }
            return;
        }
    // Join notification
        // if (data.type === "join") {
        //     ws.username = data.username;
        //     return;
        // }
    // Normal chat message
        // Normal chat message
        if (data.type === "chat") {
            const roomName = ws.room;
            if (!roomName) {
                return;
            }
            const room = rooms.get(roomName);
            room.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        }
    })

    ws.on("close", () => {
        console.log("Client disconnected...");
        if (ws.room) {
            const roomName = ws.room;
            const room = rooms.get(roomName);
            if (room) {
                // Notify remaining members
                if (ws.username) {
                    const notification = JSON.stringify({
                        type: "notification",
                        message: `${ws.username} left the room`
                    });

                    room.forEach((client) => {
                        if (
                            client !== ws &&
                            client.readyState === WebSocket.OPEN
                        ) {
                            client.send(notification);
                        }
                    });
                }

                // Remove user from room
                room.delete(ws);

                // Update online count or delete empty room
                if (room.size === 0) {
                    rooms.delete(roomName);
                } else {
                    sendRoomOnlineCount(roomName);
                }
            }
        }
    });
})

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

