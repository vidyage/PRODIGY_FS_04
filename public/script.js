let token = localStorage.getItem("chatToken");
let currentUser = null;
let socket = null;

let currentChat = {
    type: null,
    id: null
};

let onlineUsers = [];


/* =========================
   DOM ELEMENTS
========================= */

const authSection =
    document.getElementById("authSection");

const chatSection =
    document.getElementById("chatSection");

const loginForm =
    document.getElementById("loginForm");

const registerForm =
    document.getElementById("registerForm");

const showRegister =
    document.getElementById("showRegister");

const showLogin =
    document.getElementById("showLogin");

const authMessage =
    document.getElementById("authMessage");

const currentUserElement =
    document.getElementById("currentUser");

const roomList =
    document.getElementById("roomList");

const userList =
    document.getElementById("userList");

const messagesElement =
    document.getElementById("messages");

const chatTitle =
    document.getElementById("chatTitle");

const chatStatus =
    document.getElementById("chatStatus");

const messageForm =
    document.getElementById("messageForm");

const messageInput =
    document.getElementById("messageInput");

const sendButton =
    document.getElementById("sendButton");

const logoutButton =
    document.getElementById("logoutButton");

const createRoomButton =
    document.getElementById("createRoomButton");

const notification =
    document.getElementById("notification");


/* =========================
   AUTH FORM SWITCH
========================= */

showRegister.addEventListener("click", () => {

    loginForm.classList.add("hidden");

    registerForm.classList.remove("hidden");

    authMessage.textContent = "";
});


showLogin.addEventListener("click", () => {

    registerForm.classList.add("hidden");

    loginForm.classList.remove("hidden");

    authMessage.textContent = "";
});


/* =========================
   REGISTER
========================= */

registerForm.addEventListener("submit", async event => {

    event.preventDefault();

    const username =
        document.getElementById("registerUsername").value;

    const email =
        document.getElementById("registerEmail").value;

    const password =
        document.getElementById("registerPassword").value;

    try {

        const response = await fetch("/api/register", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                username,
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        authMessage.style.color = "#4ade80";

        authMessage.textContent =
            "Registration successful. Please login.";

        registerForm.reset();

        setTimeout(() => {

            registerForm.classList.add("hidden");

            loginForm.classList.remove("hidden");

            authMessage.textContent = "";

        }, 1200);

    } catch (error) {

        authMessage.style.color = "#fca5a5";

        authMessage.textContent =
            error.message;
    }
});


/* =========================
   LOGIN
========================= */

loginForm.addEventListener("submit", async event => {

    event.preventDefault();

    const email =
        document.getElementById("loginEmail").value;

    const password =
        document.getElementById("loginPassword").value;

    try {

        const response = await fetch("/api/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                email,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        token = data.token;

        localStorage.setItem(
            "chatToken",
            token
        );

        currentUser = data.user;

        showChatApplication();

    } catch (error) {

        authMessage.style.color = "#fca5a5";

        authMessage.textContent =
            error.message;
    }
});


/* =========================
   SHOW CHAT
========================= */

async function showChatApplication() {

    authSection.classList.add("hidden");

    chatSection.classList.remove("hidden");

    currentUserElement.textContent =
        `@${currentUser.username}`;

    await loadRooms();

    await loadUsers();

    connectSocket();
}


/* =========================
   SOCKET CONNECTION
========================= */

function connectSocket() {

    socket = io({
        auth: {
            token
        }
    });

    socket.on("connect", () => {

        console.log(
            "Connected:",
            socket.id
        );
    });


    socket.on("connect_error", error => {

        console.error(
            "Socket error:",
            error.message
        );

        if (error.message === "Invalid token") {
            logout();
        }
    });


    socket.on("presenceUpdate", users => {

        onlineUsers = users;

        updateUserPresence();
    });


    socket.on("newRoomMessage", message => {

        if (
            currentChat.type === "room" &&
            currentChat.id === message.roomId
        ) {
            addMessage(message);
        } else {

            showNotification(
                `New message from ${message.username}`
            );
        }
    });


    socket.on("newPrivateMessage", message => {

        if (
            currentChat.type === "private" &&
            (
                currentChat.id === message.from ||
                currentChat.id === message.to
            )
        ) {
            addMessage(message);
        } else if (message.from !== currentUser.id) {

            showNotification(
                `New private message from ${message.username}`
            );
        }
    });
}


/* =========================
   LOAD ROOMS
========================= */

async function loadRooms() {

    try {

        const response = await fetch(
            "/api/rooms",
            {
                headers: authHeaders()
            }
        );

        if (!response.ok) {
            throw new Error("Failed to load rooms");
        }

        const rooms = await response.json();

        roomList.innerHTML = "";

        rooms.forEach(room => {

            const element =
                document.createElement("div");

            element.className =
                "chat-item";

            element.dataset.id =
                room.id;

            element.innerHTML = `
                <div class="avatar">#</div>

                <div class="user-info">
                    <strong>${escapeHTML(room.name)}</strong>
                    <small>Chat room</small>
                </div>
            `;

            element.addEventListener(
                "click",
                () => openRoom(room)
            );

            roomList.appendChild(element);
        });

    } catch (error) {

        console.error(error);
    }
}


/* =========================
   LOAD USERS
========================= */

async function loadUsers() {

    try {

        const response = await fetch(
            "/api/users",
            {
                headers: authHeaders()
            }
        );

        if (!response.ok) {
            throw new Error("Failed to load users");
        }

        const users = await response.json();

        userList.innerHTML = "";

        users.forEach(user => {

            const element =
                document.createElement("div");

            element.className =
                "chat-item";

            element.dataset.id =
                user.id;

            element.innerHTML = `
                <div class="avatar">
                    ${escapeHTML(
                        user.username
                            .charAt(0)
                            .toUpperCase()
                    )}
                </div>

                <div class="user-info">
                    <strong>${escapeHTML(user.username)}</strong>
                    <small class="presence-${user.id}">
                        Offline
                    </small>
                </div>
            `;

            element.addEventListener(
                "click",
                () => openPrivateChat(user)
            );

            userList.appendChild(element);
        });

        updateUserPresence();

    } catch (error) {

        console.error(error);
    }
}


/* =========================
   OPEN ROOM
========================= */

async function openRoom(room) {

    currentChat = {
        type: "room",
        id: room.id
    };

    chatTitle.textContent =
        `# ${room.name}`;

    chatStatus.textContent =
        room.description;

    messageInput.disabled = false;

    sendButton.disabled = false;

    setActiveChat(room.id);

    if (socket) {
        socket.emit(
            "joinRoom",
            room.id
        );
    }

    await loadRoomMessages(room.id);
}


/* =========================
   OPEN PRIVATE CHAT
========================= */

async function openPrivateChat(user) {

    currentChat = {
        type: "private",
        id: user.id
    };

    chatTitle.textContent =
        `@ ${user.username}`;

    chatStatus.textContent =
        onlineUsers.includes(user.id)
            ? "Online"
            : "Offline";

    messageInput.disabled = false;

    sendButton.disabled = false;

    setActiveChat(user.id);

    await loadPrivateMessages(user.id);
}


/* =========================
   ACTIVE CHAT
========================= */

function setActiveChat(id) {

    document
        .querySelectorAll(".chat-item")
        .forEach(item => {

            item.classList.remove("active");

            if (item.dataset.id === id) {
                item.classList.add("active");
            }
        });
}


/* =========================
   ROOM MESSAGES
========================= */

async function loadRoomMessages(roomId) {

    try {

        const response = await fetch(
            `/api/rooms/${roomId}/messages`,
            {
                headers: authHeaders()
            }
        );

        const messages = await response.json();

        messagesElement.innerHTML = "";

        if (messages.length === 0) {

            showEmptyMessage(
                "No messages yet. Start the conversation!"
            );

            return;
        }

        messages.forEach(
            message => addMessage(message)
        );

    } catch (error) {

        console.error(error);
    }
}


/* =========================
   PRIVATE MESSAGES
========================= */

async function loadPrivateMessages(userId) {

    try {

        const response = await fetch(
            `/api/private/${userId}/messages`,
            {
                headers: authHeaders()
            }
        );

        const messages = await response.json();

        messagesElement.innerHTML = "";

        if (messages.length === 0) {

            showEmptyMessage(
                "No private messages yet."
            );

            return;
        }

        messages.forEach(
            message => addMessage(message)
        );

    } catch (error) {

        console.error(error);
    }
}


/* =========================
   ADD MESSAGE
========================= */

function addMessage(message) {

    const welcome =
        messagesElement.querySelector(
            ".welcome-message"
        );

    if (welcome) {
        welcome.remove();
    }

    const element =
        document.createElement("div");

    const isMine =
        message.from === currentUser.id;

    element.className =
        `message-bubble ${
            isMine ? "mine" : ""
        }`;

    const date =
        new Date(message.timestamp);

    const time =
        date.toLocaleTimeString(
            [],
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    element.innerHTML = `
        <div class="message-name">
            ${escapeHTML(message.username)}
        </div>

        <div class="message-content">
            ${escapeHTML(message.content)}
        </div>

        <div class="message-time">
            ${time}
        </div>
    `;

    messagesElement.appendChild(element);

    messagesElement.scrollTop =
        messagesElement.scrollHeight;
}


/* =========================
   SEND MESSAGE
========================= */

messageForm.addEventListener(
    "submit",
    event => {

        event.preventDefault();

        const content =
            messageInput.value.trim();

        if (!content || !socket) {
            return;
        }

        if (!currentChat.type) {
            return;
        }

        if (currentChat.type === "room") {

            socket.emit(
                "sendRoomMessage",
                {
                    roomId: currentChat.id,
                    content
                }
            );

        } else if (
            currentChat.type === "private"
        ) {

            socket.emit(
                "sendPrivateMessage",
                {
                    to: currentChat.id,
                    content
                }
            );
        }

        messageInput.value = "";

        messageInput.focus();
    }
);


/* =========================
   CREATE ROOM
========================= */

createRoomButton.addEventListener(
    "click",
    async () => {

        const name =
            prompt("Enter room name:");

        if (!name || !name.trim()) {
            return;
        }

        const description =
            prompt(
                "Enter room description:"
            ) || "Chat room";

        try {

            const response = await fetch(
                "/api/rooms",
                {
                    method: "POST",

                    headers: {
                        ...authHeaders(),
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        name,
                        description
                    })
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(data.message);
            }

            await loadRooms();

            showNotification(
                "Room created successfully"
            );

        } catch (error) {

            showNotification(
                error.message
            );
        }
    }
);


/* =========================
   PRESENCE
========================= */

function updateUserPresence() {

    document
        .querySelectorAll("[class*='presence-']")
        .forEach(element => {

            const className =
                Array.from(
                    element.classList
                ).find(
                    item =>
                        item.startsWith("presence-")
                );

            if (!className) {
                return;
            }

            const userId =
                className.replace(
                    "presence-",
                    ""
                );

            if (
                onlineUsers.includes(userId)
            ) {

                element.textContent =
                    "Online";

                element.style.color =
                    "#4ade80";

            } else {

                element.textContent =
                    "Offline";

                element.style.color =
                    "#94a3b8";
            }
        });


    if (
        currentChat.type === "private"
    ) {

        chatStatus.textContent =
            onlineUsers.includes(
                currentChat.id
            )
                ? "Online"
                : "Offline";
    }
}


/* =========================
   LOGOUT
========================= */

logoutButton.addEventListener(
    "click",
    logout
);

function logout() {

    if (socket) {
        socket.disconnect();
    }

    localStorage.removeItem(
        "chatToken"
    );

    token = null;

    currentUser = null;

    socket = null;

    currentChat = {
        type: null,
        id: null
    };

    chatSection.classList.add(
        "hidden"
    );

    authSection.classList.remove(
        "hidden"
    );

    loginForm.reset();

    messagesElement.innerHTML = `
        <div class="welcome-message">

            <div class="welcome-icon">
                💬
            </div>

            <h2>
                Welcome to Real-Time Chat
            </h2>

            <p>
                Select a room or private user
                to start chatting.
            </p>

        </div>
    `;
}


/* =========================
   AUTH HEADERS
========================= */

function authHeaders() {

    return {
        Authorization: `Bearer ${token}`
    };
}


/* =========================
   EMPTY MESSAGE
========================= */

function showEmptyMessage(text) {

    messagesElement.innerHTML = `
        <div class="welcome-message">

            <div class="welcome-icon">
                💬
            </div>

            <h2>
                ${escapeHTML(text)}
            </h2>

        </div>
    `;
}


/* =========================
   NOTIFICATION
========================= */

function showNotification(text) {

    notification.textContent = text;

    notification.classList.add("show");

    setTimeout(() => {

        notification.classList.remove(
            "show"
        );

    }, 3000);
}


/* =========================
   HTML SECURITY
========================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent = value;

    return div.innerHTML;
}


/* =========================
   AUTO LOGIN
========================= */

async function checkExistingLogin() {

    if (!token) {
        return;
    }

    try {

        const response = await fetch(
            "/api/me",
            {
                headers: authHeaders()
            }
        );

        if (!response.ok) {
            throw new Error("Session expired");
        }

        const data =
            await response.json();

        currentUser =
            data.user;

        showChatApplication();

    } catch (error) {

        localStorage.removeItem(
            "chatToken"
        );

        token = null;
    }
}


/* =========================
   START
========================= */

checkExistingLogin();