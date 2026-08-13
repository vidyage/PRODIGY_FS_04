const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

dotenv.config();

const app = express();
const server = http.createServer(app);

const io = new Server(server);

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "local_secret_key";

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}

function initializeFile(file, defaultData) {
    if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify(defaultData, null, 2));
    }
}

initializeFile(USERS_FILE, []);
initializeFile(MESSAGES_FILE, []);

initializeFile(ROOMS_FILE, [
    {
        id: "general",
        name: "General",
        description: "General discussion room"
    },
    {
        id: "technology",
        name: "Technology",
        description: "Technology and programming discussions"
    }
]);

function readJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
        return [];
    }
}

function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function createToken(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email
        },
        JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Authentication required"
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

/* =========================
   REGISTER
========================= */

app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        if (username.length < 3) {
            return res.status(400).json({
                message: "Username must contain at least 3 characters"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters"
            });
        }

        const users = readJSON(USERS_FILE);

        const existingUser = users.find(
            user =>
                user.email.toLowerCase() === email.toLowerCase() ||
                user.username.toLowerCase() === username.toLowerCase()
        );

        if (existingUser) {
            return res.status(409).json({
                message: "Username or email already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = {
            id: crypto.randomUUID(),
            username: username.trim(),
            email: email.trim().toLowerCase(),
            password: hashedPassword,
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        writeJSON(USERS_FILE, users);

        res.status(201).json({
            message: "Registration successful"
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error during registration"
        });
    }
});

/* =========================
   LOGIN
========================= */

app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const users = readJSON(USERS_FILE);

        const user = users.find(
            item => item.email.toLowerCase() === email.toLowerCase()
        );

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = createToken(user);

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            message: "Server error during login"
        });
    }
});

/* =========================
   CURRENT USER
========================= */

app.get("/api/me", authenticateToken, (req, res) => {
    res.json({
        user: req.user
    });
});

/* =========================
   USERS
========================= */

app.get("/api/users", authenticateToken, (req, res) => {
    const users = readJSON(USERS_FILE);

    const safeUsers = users
        .filter(user => user.id !== req.user.id)
        .map(user => ({
            id: user.id,
            username: user.username,
            email: user.email
        }));

    res.json(safeUsers);
});

/* =========================
   ROOMS
========================= */

app.get("/api/rooms", authenticateToken, (req, res) => {
    const rooms = readJSON(ROOMS_FILE);

    res.json(rooms);
});

app.post("/api/rooms", authenticateToken, (req, res) => {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
        return res.status(400).json({
            message: "Room name is required"
        });
    }

    const rooms = readJSON(ROOMS_FILE);

    const newRoom = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description
            ? description.trim()
            : "Chat room"
    };

    rooms.push(newRoom);

    writeJSON(ROOMS_FILE, rooms);

    res.status(201).json(newRoom);
});

/* =========================
   ROOM MESSAGE HISTORY
========================= */

app.get(
    "/api/rooms/:roomId/messages",
    authenticateToken,
    (req, res) => {
        const rooms = readJSON(ROOMS_FILE);

        const roomExists = rooms.some(
            room => room.id === req.params.roomId
        );

        if (!roomExists) {
            return res.status(404).json({
                message: "Room not found"
            });
        }

        const messages = readJSON(MESSAGES_FILE);

        const roomMessages = messages
            .filter(message => message.roomId === req.params.roomId)
            .slice(-100);

        res.json(roomMessages);
    }
);

/* =========================
   PRIVATE MESSAGE HISTORY
========================= */

app.get(
    "/api/private/:userId/messages",
    authenticateToken,
    (req, res) => {
        const messages = readJSON(MESSAGES_FILE);

        const privateMessages = messages
            .filter(message =>
                message.type === "private" &&
                (
                    (
                        message.from === req.user.id &&
                        message.to === req.params.userId
                    ) ||
                    (
                        message.from === req.params.userId &&
                        message.to === req.user.id
                    )
                )
            )
            .slice(-100);

        res.json(privateMessages);
    }
);

/* =========================
   SOCKET AUTHENTICATION
========================= */

io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
        return next(new Error("Authentication required"));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        socket.user = decoded;

        next();
    } catch (error) {
        next(new Error("Invalid token"));
    }
});

/* =========================
   ONLINE USERS
========================= */

const onlineUsers = new Map();

function broadcastPresence() {
    io.emit(
        "presenceUpdate",
        Array.from(onlineUsers.keys())
    );
}

/* =========================
   SOCKET CONNECTION
========================= */

io.on("connection", socket => {
    const user = socket.user;

    socket.join(`user:${user.id}`);

    onlineUsers.set(user.id, {
        socketId: socket.id,
        username: user.username
    });

    broadcastPresence();

    socket.emit("connected", {
        message: "Connected to real-time chat"
    });

    /* =========================
       JOIN ROOM
    ========================= */

    socket.on("joinRoom", roomId => {
        const rooms = readJSON(ROOMS_FILE);

        const roomExists = rooms.some(
            room => room.id === roomId
        );

        if (!roomExists) {
            return;
        }

        socket.join(`room:${roomId}`);
    });

    /* =========================
       ROOM MESSAGE
    ========================= */

    socket.on("sendRoomMessage", data => {
        const { roomId, content } = data;

        if (!roomId || !content || !content.trim()) {
            return;
        }

        const rooms = readJSON(ROOMS_FILE);

        const roomExists = rooms.some(
            room => room.id === roomId
        );

        if (!roomExists) {
            return;
        }

        const message = {
            id: crypto.randomUUID(),
            type: "room",
            roomId,
            from: user.id,
            username: user.username,
            content: content.trim().substring(0, 1000),
            timestamp: new Date().toISOString()
        };

        const messages = readJSON(MESSAGES_FILE);

        messages.push(message);

        writeJSON(MESSAGES_FILE, messages);

        io.to(`room:${roomId}`).emit(
            "newRoomMessage",
            message
        );
    });

    /* =========================
       PRIVATE MESSAGE
    ========================= */

    socket.on("sendPrivateMessage", data => {
        const { to, content } = data;

        if (!to || !content || !content.trim()) {
            return;
        }

        const users = readJSON(USERS_FILE);

        const receiver = users.find(
            item => item.id === to
        );

        if (!receiver) {
            return;
        }

        const message = {
            id: crypto.randomUUID(),
            type: "private",
            from: user.id,
            to,
            username: user.username,
            content: content.trim().substring(0, 1000),
            timestamp: new Date().toISOString()
        };

        const messages = readJSON(MESSAGES_FILE);

        messages.push(message);

        writeJSON(MESSAGES_FILE, messages);

        io.to(`user:${user.id}`).emit(
            "newPrivateMessage",
            message
        );

        io.to(`user:${to}`).emit(
            "newPrivateMessage",
            message
        );
    });

    /* =========================
       DISCONNECT
    ========================= */

    socket.on("disconnect", () => {
        onlineUsers.delete(user.id);

        broadcastPresence();
    });
});

/* =========================
   START SERVER
========================= */

server.listen(PORT, () => {
    console.log(`=================================`);
    console.log(`Real-Time Chat Server Started`);
    console.log(`http://localhost:${PORT}`);
    console.log(`=================================`);
});