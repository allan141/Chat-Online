const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

app.use(cors());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, "public")));

// Rota principal para carregar o index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

let onlineUsers = new Set();

io.on("connection", (socket) => {
    console.log(`Usuário conectado: ${socket.id}`);

    // Registro de usuário
    socket.on("registerUser", (username) => {
        socket.username = username;
        onlineUsers.add(username);
        console.log(`${username} entrou no chat.`);
        io.emit("updateOnlineUsers", Array.from(onlineUsers));
    });

    socket.on("chatMessage", (data) => {
        io.emit("chatMessage", { ...data, senderId: socket.id });
    });

    socket.on("sendImage", (data) => {
        io.emit("receiveImage", { ...data, senderId: socket.id });
    });

    // Notificação de digitação
    socket.on("typing", (username) => {
        socket.broadcast.emit("typing", username);
    });

    socket.on("stopTyping", () => {
        socket.broadcast.emit("stopTyping");
    });

    // Desconexão do usuário
    socket.on("disconnect", () => {
        console.log(`Usuário desconectado: ${socket.id}`);
        if (socket.username) {
            onlineUsers.delete(socket.username);
            io.emit("updateOnlineUsers", Array.from(onlineUsers));
        }
    });
});

// Porta do servidor
const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});