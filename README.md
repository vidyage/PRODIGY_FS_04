# 💬 Real-Time Chat Application

## 📌 Task

**Task 04 - Real-Time Chat Application**

Develop a real-time chat application that allows users to communicate instantly through chat rooms and private conversations using WebSocket-based communication.

---

## 📖 Project Description

This project implements a **Real-Time Chat Application** using **Node.js, Express.js, Socket.IO, HTML, CSS, and JavaScript**.

The application allows users to create accounts, securely log in, join chat rooms, send real-time messages, communicate privately with other users, and view online/offline user status. Chat messages are stored to provide chat history.

---

## ✨ Features

* ✅ User Registration
* ✅ Secure User Login
* ✅ Password Hashing using bcryptjs
* ✅ JWT-Based Authentication
* ✅ Real-Time Messaging using Socket.IO
* ✅ Chat Rooms
* ✅ Create New Chat Rooms
* ✅ Private Messaging
* ✅ Online/Offline User Status
* ✅ Chat History
* ✅ Secure Logout
* ✅ Responsive User Interface

---

## 🛠️ Technologies Used

* Node.js
* Express.js
* Socket.IO
* HTML5
* CSS3
* JavaScript
* bcryptjs
* JSON Web Token (JWT)
* dotenv
* File-Based JSON Storage

---

## ▶️ How to Run

### Navigate to the Project Folder

```bash
cd realtime-chat-app
```

### Install Dependencies

```bash
npm install
```

### Create a `.env` File

```env
PORT=5000
JWT_SECRET=secret_key
```

### Run the Application

```bash
npm start
```

or

```bash
node server.js
```

### Open in Browser

```text
http://localhost:5000
```

---

## 📷 Sample Workflow

### 🏠 Login / Registration

```text
------------------------------
       Real-Time Chat

        [ Login ]

   Don't have an account?

        [ Register ]
------------------------------
```

### 👤 Register

```text
Username : __________

Email    : __________

Password : __________

[ Create Account ]
```

### 🔑 Login

```text
Email    : __________

Password : __________

[ Login ]
```

### 💬 Chat Dashboard

```text
-----------------------------------------
 ChatApp

 Chat Rooms
 # General
 # Technology
 # Project Discussion

 Private Chats
 User

-----------------------------------------

        # General

 Hello! This is a real-time message.

 Type your message...       [ Send ]
-----------------------------------------
```

### 👥 Private Chat

```text
-----------------------------------------
 Private Chat

 @ User
 Online

 Hello! This is a private message.

 Type your message...       [ Send ]
-----------------------------------------
```

---

## 📂 Project Structure

```text
realtime-chat-app/
│
├── data/
│   ├── messages.json
│   ├── rooms.json
│   └── users.json
│
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
└── README.md
```

---

## 🎯 Learning Outcomes

Through this project, I learned:

* Building Real-Time Applications using Socket.IO
* Implementing User Authentication using Node.js
* Password Hashing with bcryptjs
* JWT-Based Authentication
* Creating Chat Rooms and Private Conversations
* Implementing Online/Offline User Presence
* Managing and Storing Chat History
* Building Responsive Web Applications
* Developing Client-Server Communication

---

## 👨‍💻 Author

**Vidya G E**

