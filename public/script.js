// ✅ URL correta do seu Render
const SERVER_URL = "https://chat-online-tafo.onrender.com";

// ✅ Conexão definitiva
const socket = io(SERVER_URL, {
  path: "/socket.io",
  transports: ["polling", "websocket"],
  upgrade: true,
  reconnection: true,
  timeout: 20000
});

// ===== SOCKET =====
let myId = "";
socket.on("connect", () => {
  myId = socket.id;
  console.log("✅ conectado:", myId);
});

// ===== USUÁRIO =====
let username = localStorage.getItem("username") || "";

if (!username) {
  username = prompt("Digite seu nome:");
  if (username) {
    localStorage.setItem("username", username);
  }
}

const myUserId = username.toLowerCase().replace(/\s+/g, "_");

if (username) {
  socket.emit("registerUser", username);
}

// ===== ELEMENTOS =====
const homeScreen = document.getElementById("home-screen");
const contactsScreen = document.getElementById("contacts-screen");
const chatScreen = document.getElementById("chat-screen");

const chatList = document.getElementById("chat-list");
const contactsList = document.getElementById("contacts-list");

const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("send-btn");
const chatBox = document.getElementById("chat-box");
const typingIndicator = document.getElementById("typing-indicator");
const imageInput = document.getElementById("imageInput");

const chatTitle = document.getElementById("chat-title");
const chatStatus = document.getElementById("chat-status");
const searchInput = document.getElementById("search-input");

// ===== ESTADO =====
let currentChatUser = null;
let onlineUsers = [];

let contacts = JSON.parse(localStorage.getItem("contacts")) || [];
let conversations = JSON.parse(localStorage.getItem("conversations")) || [];

// ===== HELPERS =====
function saveContacts() {
  localStorage.setItem("contacts", JSON.stringify(contacts));
}

function saveConversations() {
  localStorage.setItem("conversations", JSON.stringify(conversations));
}

function getConversationKey(userId) {
  return `messages_${userId}`;
}

function saveConversationMessages(userId, messages) {
  localStorage.setItem(getConversationKey(userId), JSON.stringify(messages));
}

function loadConversationMessages(userId) {
  const saved = localStorage.getItem(getConversationKey(userId));
  return saved ? JSON.parse(saved) : [];
}

function getAvatarLetter(name) {
  return name && name.length ? name.charAt(0).toUpperCase() : "?";
}

function ensureConversation(user) {
  const exists = conversations.find(c => c.id === user.id);
  if (!exists) {
    conversations.unshift({
      id: user.id,
      name: user.name,
      lastMessage: "",
      time: "",
      unread: 0,
      status: user.status || "offline"
    });
    saveConversations();
  }
}

function updateConversationPreview(userId, text) {
  const conversation = conversations.find(c => c.id === userId);

  if (conversation) {
    conversation.lastMessage = text;
    conversation.time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  } else {
    const contact = contacts.find(c => c.id === userId);
    if (contact) {
      conversations.unshift({
        id: contact.id,
        name: contact.name,
        lastMessage: text,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit"
        }),
        unread: 0,
        status: contact.status || "offline"
      });
    }
  }

  saveConversations();
  renderChatList(searchInput?.value || "");
}

function markConversationUnread(userId) {
  const conversation = conversations.find(c => c.id === userId);
  if (conversation) {
    conversation.unread = (conversation.unread || 0) + 1;
    saveConversations();
  }
}

function clearTypingIndicator() {
  if (typingIndicator) typingIndicator.innerText = "";
}

// ===== TELAS =====
function showHomeScreen() {
  homeScreen.classList.remove("hidden");
  contactsScreen.classList.add("hidden");
  chatScreen.classList.add("hidden");
  clearTypingIndicator();
  renderChatList(searchInput?.value || "");
}

function openContactsScreen() {
  homeScreen.classList.add("hidden");
  contactsScreen.classList.remove("hidden");
  chatScreen.classList.add("hidden");
  renderContacts();
}

function openChat(user) {
  currentChatUser = user;

  homeScreen.classList.add("hidden");
  contactsScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");

  chatTitle.textContent = user.name;
  chatStatus.textContent = user.status || "offline";

  const conversation = conversations.find(c => c.id === user.id);
  if (conversation) {
    conversation.unread = 0;
    saveConversations();
  }

  loadChatHistory();
  renderChatList(searchInput?.value || "");
}

// ===== RENDER CONTATOS =====
function renderContacts() {
  contactsList.innerHTML = "";

  const sorted = [...contacts].sort((a, b) => {
    const nameA = (a?.name || "").toString();
    const nameB = (b?.name || "").toString();
    return nameA.localeCompare(nameB);
  });

  sorted.forEach(contact => {
    const item = document.createElement("div");
    item.className = "contact-item";
    item.innerHTML = `
      <div class="contact-item-avatar">${getAvatarLetter(contact.name || "?")}</div>
      <div class="contact-item-info">
        <div class="contact-item-name">${contact.name || "Sem nome"}</div>
        <div class="contact-item-status">${contact.status || "offline"}</div>
      </div>
    `;
    item.onclick = () => {
      ensureConversation(contact);
      openChat(contact);
    };
    contactsList.appendChild(item);
  });
}

// ===== RENDER CONVERSAS =====
function renderChatList(filter = "") {
  chatList.innerHTML = "";

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(filter.toLowerCase())
  );

  filtered.forEach(chat => {
    const item = document.createElement("div");
    item.className = "chat-item";
    item.innerHTML = `
      <div class="chat-item-avatar">${getAvatarLetter(chat.name)}</div>
      <div class="chat-item-content">
        <div class="chat-item-top">
          <div class="chat-item-name">${chat.name}</div>
          <div class="chat-item-time">${chat.time || ""}</div>
        </div>
        <div class="chat-item-bottom">
          <div class="chat-item-last">${chat.lastMessage || "Toque para conversar"}</div>
          ${chat.unread > 0 ? `<div class="chat-item-badge">${chat.unread}</div>` : ""}
        </div>
      </div>
    `;
    item.onclick = () => openChat(chat);
    chatList.appendChild(item);
  });
}

// ===== BUSCA =====
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    renderChatList(e.target.value);
  });
}

// ===== HISTÓRICO =====
function loadChatHistory() {
  if (!currentChatUser) return;

  const messages = loadConversationMessages(currentChatUser.id);
  chatBox.innerHTML = "";

  messages.forEach(msg => {
    const isSender = msg.from === myUserId || msg.senderId === myId;
    if (msg.image) {
      displayImage(msg, isSender);
    } else {
      displayMessage(msg, isSender);
    }
  });
}

// ===== ENVIAR TEXTO =====
function sendMessage() {
  const message = messageInput.value.trim();

  if (!message || !username || !currentChatUser) return;

  const messageData = {
    username,
    message,
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    }),
    to: currentChatUser.id,
    from: myUserId,
    senderId: myId
  };

  displayMessage(messageData, true);

  const messages = loadConversationMessages(currentChatUser.id);
  messages.push(messageData);
  saveConversationMessages(currentChatUser.id, messages);

  updateConversationPreview(currentChatUser.id, message);

  socket.emit("chatMessage", {
    username,
    message,
    time: messageData.time,
    to: currentChatUser.id
  });

  messageInput.value = "";
  stopTyping();
}

// ===== ENVIAR IMAGEM =====
function sendImage(event) {
  const file = event.target.files && event.target.files[0];

  if (!file || !username || !currentChatUser) return;

  const reader = new FileReader();
  reader.onload = function () {
    const imageData = {
      username,
      image: reader.result,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      }),
      to: currentChatUser.id,
      from: myUserId,
      senderId: myId
    };

    displayImage(imageData, true);

    const messages = loadConversationMessages(currentChatUser.id);
    messages.push(imageData);
    saveConversationMessages(currentChatUser.id, messages);

    updateConversationPreview(currentChatUser.id, "📷 Imagem");

    socket.emit("sendImage", {
      username,
      image: imageData.image,
      time: imageData.time,
      to: currentChatUser.id
    });
  };

  reader.readAsDataURL(file);
}

// ===== RECEBER TEXTO =====
socket.on("chatMessage", (data) => {
  const senderId = data.from || data.username.toLowerCase().replace(/\s+/g, "_");

  if (senderId === myUserId) return;

  let contact = contacts.find(c => c.id === senderId);
  if (!contact) {
    contact = {
      id: senderId,
      name: data.fromName || data.username,
      status: "online"
    };
    contacts.push(contact);
    saveContacts();
  }

  ensureConversation(contact);

  const messageData = {
    ...data,
    from: senderId
  };

  const messages = loadConversationMessages(senderId);
  messages.push(messageData);
  saveConversationMessages(senderId, messages);

  updateConversationPreview(senderId, data.message);

  if (!currentChatUser || currentChatUser.id !== senderId) {
    markConversationUnread(senderId);
  } else {
    displayMessage(messageData, false);
  }

  renderChatList(searchInput?.value || "");
});

// ===== RECEBER IMAGEM =====
socket.on("receiveImage", (data) => {
  const senderId = data.from || data.username.toLowerCase().replace(/\s+/g, "_");

  if (senderId === myUserId) return;

  let contact = contacts.find(c => c.id === senderId);
  if (!contact) {
    contact = {
      id: senderId,
      name: data.fromName || data.username,
      status: "online"
    };
    contacts.push(contact);
    saveContacts();
  }

  ensureConversation(contact);

  const imageData = {
    ...data,
    from: senderId
  };

  const messages = loadConversationMessages(senderId);
  messages.push(imageData);
  saveConversationMessages(senderId, messages);

  updateConversationPreview(senderId, "📷 Imagem");

  if (!currentChatUser || currentChatUser.id !== senderId) {
    markConversationUnread(senderId);
  } else {
    displayImage(imageData, false);
  }

  renderChatList(searchInput?.value || "");
});

// ===== FEEDBACK DE ENTREGA =====
socket.on("messageDelivered", (data) => {
  console.log("✅ mensagem entregue:", data);
});

socket.on("imageDelivered", (data) => {
  console.log("✅ imagem entregue:", data);
});

// ===== DIGITANDO =====
function notifyTyping() {
  if (!currentChatUser) return;

  socket.emit("typing", {
    to: currentChatUser.id
  });
}

function stopTyping() {
  if (!currentChatUser) return;

  socket.emit("stopTyping", {
    to: currentChatUser.id
  });
}

socket.on("typing", (data) => {
  if (!currentChatUser) return;
  if (data.from !== currentChatUser.id) return;

  typingIndicator.innerText = `${data.username} está digitando...`;
});

socket.on("stopTyping", (data) => {
  if (!currentChatUser) return;
  if (data.from !== currentChatUser.id) return;

  clearTypingIndicator();
});

// ===== ONLINE USERS =====
socket.on("updateOnlineUsers", (users) => {
  onlineUsers = users;

  contacts = users
    .filter(user => user.userId !== myUserId && user.username)
    .map(user => ({
      id: user.userId,
      name: user.username || "Sem nome",
      status: "online"
    }));

  saveContacts();

  // atualiza status nas conversas existentes
  conversations = conversations.map(convo => {
    const online = users.find(u => u.userId === convo.id);
    return {
      ...convo,
      status: online ? "online" : "offline"
    };
  });

  saveConversations();
  renderContacts();
  renderChatList(searchInput?.value || "");

  if (currentChatUser) {
    const online = users.find(u => u.userId === currentChatUser.id);
    chatStatus.textContent = online ? "online" : "offline";
  }
});

// ===== RENDER MENSAGENS =====
function displayMessage(data, isSender) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", isSender ? "sent" : "received");
  messageElement.innerHTML = `
    <span class="username">${data.username}</span>
    <p>${data.message}</p>
    <span class="time">${data.time}</span>
  `;
  chatBox.appendChild(messageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function displayImage(data, isSender) {
  const imageElement = document.createElement("div");
  imageElement.classList.add("message", isSender ? "sent" : "received");
  imageElement.innerHTML = `
    <span class="username">${data.username}</span>
    <img src="${data.image}" class="chat-image" />
    <span class="time">${data.time}</span>
  `;
  chatBox.appendChild(imageElement);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// ===== MENU =====
function clearChat() {
  conversations.forEach(convo => {
    localStorage.removeItem(getConversationKey(convo.id));
  });

  localStorage.removeItem("conversations");
  conversations = [];
  renderChatList();
}

function toggleMenu() {
  document.getElementById("menu-dropdown")?.classList.toggle("show");
}

function logout() {
  localStorage.removeItem("username");
  location.reload();
}

// ===== EVENTOS =====
// ===== EVENTOS =====
const newChatBtn = document.getElementById("new-chat-btn");

sendBtn?.addEventListener("click", sendMessage);
messageInput?.addEventListener("input", notifyTyping);
imageInput?.addEventListener("change", sendImage);
newChatBtn?.addEventListener("click", () => {
  openContactsScreen();
});

// ===== INÍCIO =====
renderChatList();
renderContacts();
showHomeScreen();


window.openContactsScreen = openContactsScreen;
window.showHomeScreen = showHomeScreen;
window.toggleMenu = toggleMenu;
window.logout = logout;
window.clearChat = clearChat;
window.sendMessage = sendMessage;
window.sendImage = sendImage;
window.notifyTyping = notifyTyping;
window.stopTyping = stopTyping;