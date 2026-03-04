// Substitua pela URL real do seu servidor no Render
const SERVER_URL = "https://chat-app-q6u7.onrender.com";

// Conectar ao servidor WebSocket usando a URL absoluta (necessário para o APK)
const socket = io(SERVER_URL);

let username = localStorage.getItem("username") || "";

// Perguntar o nome se ainda não tiver
if (!username) {
    username = prompt("Digite seu nome:");
    if (username) {
        localStorage.setItem("username", username);
    }
}

// Enviar o nome do usuário para o servidor
if (username) {
    socket.emit("registerUser", username);
}

// Captura de elementos
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send-btn");
const chatBox = document.getElementById("chat-box");
const typingIndicator = document.getElementById("typing-indicator");

const imageInput = document.getElementById("imageInput");

// Função para salvar as mensagens no localStorage
function saveMessages(messages) {
    localStorage.setItem("messages", JSON.stringify(messages));
}

// Função para carregar as mensagens do localStorage
function loadMessages() {
    const savedMessages = localStorage.getItem("messages");
    return savedMessages ? JSON.parse(savedMessages) : [];
}

// Carregar e exibir as mensagens salvas ao carregar a página
function loadChatHistory() {
    const messages = loadMessages();
    messages.forEach((messageData) => {
        // Se tiver imagem, mostra imagem; senão, mostra texto
        if (messageData.image) displayImage(messageData, false);
        else displayMessage(messageData, false);
    });
}

// Enviar mensagem de texto
function sendMessage() {
    const message = messageInput.value.trim();

    if (message && username) {
        const messageData = { username, message, time: new Date().toLocaleTimeString() };
        displayMessage(messageData, true);
        socket.emit("chatMessage", messageData);

        // Salvar a nova mensagem no localStorage
        const messages = loadMessages();
        messages.push(messageData);
        saveMessages(messages);

        messageInput.value = "";
        stopTyping();
    } else {
        console.log("⚠️ Mensagem vazia ou usuário sem nome.");
    }
}

// Enviar imagem
function sendImage(event) {
    const file = event.target.files && event.target.files[0];
    if (file && username) {
        const reader = new FileReader();
        reader.onload = function () {
            const imageData = { username, image: reader.result, time: new Date().toLocaleTimeString() };
            displayImage(imageData, true);

            // Salvar a imagem no localStorage
            const messages = loadMessages();
            messages.push(imageData);
            saveMessages(messages);

            socket.emit("sendImage", imageData);
        };
        reader.readAsDataURL(file);
    }
}

// Receber mensagens do servidor
socket.on("chatMessage", (data) => {
    if (data.username !== username) {
        displayMessage(data, false);
    }
});

// Receber imagens do servidor
socket.on("receiveImage", (data) => {
    if (data.username !== username) {
        displayImage(data, false);
    }
});

// Exibir mensagens corretamente
function displayMessage(data, isSender) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", isSender ? "sent" : "received");
    messageElement.innerHTML = `<span class="username">${data.username}</span><p>${data.message}</p><span class="time">${data.time}</span>`;

    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Exibir imagens corretamente
function displayImage(data, isSender) {
    const imageElement = document.createElement("div");
    imageElement.classList.add("message", isSender ? "sent" : "received");
    imageElement.innerHTML = `<span class="username">${data.username}</span><img src="${data.image}" class="chat-image" /><span class="time">${data.time}</span>`;

    chatBox.appendChild(imageElement);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Notificar que o usuário está digitando
function notifyTyping() {
    if (username) {
        socket.emit("typing", username);
    }
}

// Parar de mostrar "está digitando..."
function stopTyping() {
    socket.emit("stopTyping");
}

// Receber evento de digitação do servidor
socket.on("typing", (user) => {
    if (typingIndicator) {
        typingIndicator.innerText = `${user} está digitando...`;
    }
});

// Remover "está digitando..." quando o usuário parar
socket.on("stopTyping", () => {
    if (typingIndicator) {
        typingIndicator.innerText = "";
    }
});

// Função para apagar a conversa (usada no menu)
function clearChat() {
    localStorage.removeItem("messages");
    chatBox.innerHTML = "";
}

const clearChatBtn = document.getElementById("clear-chat-btn");
if (clearChatBtn) {
    clearChatBtn.addEventListener("click", clearChat);
}

// Eventos
if (sendBtn) {
    sendBtn.addEventListener("click", sendMessage);
}
if (messageInput) {
    messageInput.addEventListener("input", notifyTyping);
}

if (imageInput) {
    imageInput.addEventListener("change", sendImage);
}

// Carregar o histórico de mensagens
loadChatHistory();

// Função para alternar a visibilidade do menu
function toggleMenu() {
    const menuDropdown = document.getElementById("menu-dropdown");
    if (menuDropdown) {
        menuDropdown.classList.toggle("show");
    }
}

function logout() {
    localStorage.removeItem("username");
    location.reload();
}