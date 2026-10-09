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
const authMiddleware = require("./middleware/authMiddleware");
app.use("/api/auth", authRoutes);


app.post("/api/rooms/create", authMiddleware, (req, res) => {
    const { roomName } = req.body;
    if (typeof roomName !== "string" || !roomName.trim()) {
        return res.status(400).json({
            message: "Room name is required"
        });
    }

    const name = roomName.trim();

    if (name.length > 50) {
        return res.status(400).json({
            message: "Room name must be 50 characters or less"
        });
    }

    if (rooms.has(name)) {
        return res.status(409).json({
            message: "Room already exists!"
        });
    }

    rooms.set(name, new Set());

    return res.status(201).json({
        message: "Room created successfully",
        roomName: name
    });
});

app.post("/api/rooms/join", authMiddleware, (req, res) => {
    const { roomName } = req.body;

    if (typeof roomName !== "string" || !roomName.trim()) {
        return res.status(400).json({
            message: "Room name is required"
        });
    }

    const name = roomName.trim();

    if (!rooms.has(name)) {
        return res.status(404).json({
            message: "Room does not exist!"
        });
    }

    return res.status(200).json({
        message: "Room found",
        roomName: name
    });
});


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
    console.log("Room members:", newRoom.size);
    ws.room = roomName;
    return true;
}


function getCookieValue(req, name) {
    const cookieHeader = req.headers.cookie || "";

    for (const item of cookieHeader.split(";")) {
        const separatorIndex = item.indexOf("=");

        if (separatorIndex === -1) continue;

        const key = item.slice(0, separatorIndex).trim();
        const value = item.slice(separatorIndex + 1).trim();

        if (key === name) {
            try {
                return decodeURIComponent(value);
            } catch {
                return null;
            }
        }
    }
    return null;
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



wss.on("connection", (ws, req) => {
    //console.log("New client connected...");
    console.log("New WebSocket connection");
    console.log("Total clients:", wss.clients.size);

    try {
        const token = getCookieValue(req, "token");

        if (!token) {
            ws.close(1008, "Please login first");
            return;
        }

        const decoded = jwt.verify(
            token,
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

        console.log(`${ws.username} authenticated successfully`);

    } catch (error) {
        ws.close(1008, "Invalid or expired token");
        return;
    }

    ws.on("message", (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (!ws.isAuthenticated) {
                ws.send(JSON.stringify({
                    type: "error",
                    message: "Please authenticate first"
                }));
                return;
            }

            if (data.type === "createRoom") {
                if (
                    typeof data.roomName !== "string" ||
                    !data.roomName.trim()
                ) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Room name is required"
                    }));
                    return;
                }

                const roomName = data.roomName.trim();

                if (roomName.length > 50) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Room name is too long"
                    }));
                    return;
                }

                const created = createRoom(roomName);

                if (!created) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Room already exists!"
                    }));
                    return;
                }

                joinRoom(roomName, ws);
                sendRoomOnlineCount(roomName);

                ws.send(JSON.stringify({
                    type: "roomCreated",
                    roomName
                }));

                return;
            }

            if (data.type === "joinRoom") {
                if (
                    typeof data.roomName !== "string" ||
                    !data.roomName.trim()
                ) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Room name is required"
                    }));
                    return;
                }

                const roomName = data.roomName.trim();
                const joined = joinRoom(roomName, ws);

                if (!joined) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Room does not exist!"
                    }));
                    return;
                }

                sendRoomOnlineCount(roomName);

                ws.send(JSON.stringify({
                    type: "roomJoined",
                    roomName
                }));

                const room = rooms.get(roomName);

                const notification = JSON.stringify({
                    type: "notification",
                    message: `${ws.username} joined the room`
                });

                room.forEach((client) => {
                    if (
                        client !== ws &&
                        client.readyState === WebSocket.OPEN
                    ) {
                        client.send(notification);
                    }
                });

                return;
            }

            if (data.type === "chat") {
                const roomName = ws.room;

                if (!roomName) {
                    ws.send(JSON.stringify({
                        type: "error",
                        message: "Join a room first"
                    }));
                    return;
                }

                const room = rooms.get(roomName);
                if (!room) return;

                // Never trust the username sent by the client.
                const chatMessage = JSON.stringify({
                    ...data,
                    username: ws.username
                });

                room.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(chatMessage);
                    }
                });

                return;
            }

            ws.send(JSON.stringify({
                type: "error",
                message: "Unknown message type"
            }));

        } catch (error) {
            ws.send(JSON.stringify({
                type: "error",
                message: "Invalid message format"
            }));
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected...");
        if (ws.room) {
            const roomName = ws.room;
            const room = rooms.get(roomName);

            if (room) {
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

                room.delete(ws);

                if (room.size === 0) {
                    rooms.delete(roomName);
                } else {
                    sendRoomOnlineCount(roomName);
                }
            }
        }
    });

    ws.on("error", (error) => {
        console.error("WebSocket error:", error.message);
    });
});


const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

