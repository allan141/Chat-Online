// ✅ URL correta do seu Render
const SERVER_URL = "https://chat-online-tafo.onrender.com";

// ✅ Conexão definitiva: polling + websocket (Android-friendly)
const socket = io(SERVER_URL, {
  path: "/socket.io",
  transports: ["polling", "websocket"],
  upgrade: true,
  reconnection: true,
  timeout: 20000
});

// ✅ ID da minha conexão (para não duplicar a minha própria msg)
let myId = "";
socket.on("connect", () => {
  myId = socket.id;
  console.log("✅ conectado:", myId);
});

let username = localStorage.getItem("username") || "";

// Perguntar o nome se ainda não tiver
if (!username) {
  username = prompt("Digite seu nome:");
  if (username) localStorage.setItem("username", username);
}

// Enviar o nome do usuário para o servidor
if (username) socket.emit("registerUser", username);

// Captura de elementos
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send-btn");
const chatBox = document.getElementById("chat-box");
const typingIndicator = document.getElementById("typing-indicator");
const imageInput = document.getElementById("imageInput");

function saveMessages(messages) {
  localStorage.setItem("messages", JSON.stringify(messages));
}

function loadMessages() {
  const savedMessages = localStorage.getItem("messages");
  return savedMessages ? JSON.parse(savedMessages) : [];
}

function loadChatHistory() {
  const messages = loadMessages();
  chatBox.innerHTML = "";
  messages.forEach((m) => {
    if (m.image) displayImage(m, m.senderId === myId);
    else displayMessage(m, m.senderId === myId);
  });
}

function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || !username) return;

  const messageData = { username, message, time: new Date().toLocaleTimeString() };

  // mostra na tela imediatamente
  displayMessage({ ...messageData, senderId: myId }, true);

  // manda para o servidor
  socket.emit("chatMessage", messageData);

  // salva localmente
  const messages = loadMessages();
  messages.push({ ...messageData, senderId: myId });
  saveMessages(messages);

  messageInput.value = "";
  stopTyping();
}

function sendImage(event) {
  const file = event.target.files && event.target.files[0];
  if (!file || !username) return;

  const reader = new FileReader();
  reader.onload = function () {
    const imageData = { username, image: reader.result, time: new Date().toLocaleTimeString() };

    displayImage({ ...imageData, senderId: myId }, true);
    socket.emit("sendImage", imageData);

    const messages = loadMessages();
    messages.push({ ...imageData, senderId: myId });
    saveMessages(messages);
  };
  reader.readAsDataURL(file);
}

// ✅ RECEBER: NÃO filtra por username. Filtra por senderId (se existir).
socket.on("chatMessage", (data) => {
  if (data.senderId && data.senderId === myId) return; // ignora só a minha própria conexão
  displayMessage(data, false);

  const messages = loadMessages();
  messages.push(data);
  saveMessages(messages);
});

socket.on("receiveImage", (data) => {
  if (data.senderId && data.senderId === myId) return;
  displayImage(data, false);

  const messages = loadMessages();
  messages.push(data);
  saveMessages(messages);
});

function displayMessage(data, isSender) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", isSender ? "sent" : "received");
  messageElement.innerHTML = `<span class="username">${data.username}</span><p>${data.message}</p><span class="time">${data.time}</span>`;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function displayImage(data, isSender) {
  const imageElement = document.createElement("div");
  imageElement.classList.add("message", isSender ? "sent" : "received");
  imageElement.innerHTML = `<span class="username">${data.username}</span><img src="${data.image}" class="chat-image" /><span class="time">${data.time}</span>`;
  chatBox.appendChild(imageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function notifyTyping() {
  if (username) socket.emit("typing", username);
}

function stopTyping() {
  socket.emit("stopTyping");
}

socket.on("typing", (user) => {
  if (typingIndicator) typingIndicator.innerText = `${user} está digitando...`;
});

socket.on("stopTyping", () => {
  if (typingIndicator) typingIndicator.innerText = "";
});

function clearChat() {
  localStorage.removeItem("messages");
  chatBox.innerHTML = "";
}

sendBtn?.addEventListener("click", sendMessage);
messageInput?.addEventListener("input", notifyTyping);
imageInput?.addEventListener("change", sendImage);

loadChatHistory();

function toggleMenu() {
  document.getElementById("menu-dropdown")?.classList.toggle("show");
}

function logout() {
  localStorage.removeItem("username");
  location.reload();
}