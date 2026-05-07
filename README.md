# CollabCE — Collaborative Code Editor

> A real-time collaborative IDE in your browser. Create, edit, and share full projects with your team — just like VS Code, but multiplayer.

---

## ✨ Features

### 🖊️ Real-Time Collaboration
- **Yjs CRDT sync** — conflict-free real-time editing across all connected users
- **Live cursors** — see exactly where teammates are typing, with colored labels
- **Per-file collaboration** — multiple users can edit different files simultaneously

### 📁 Full Project Explorer
- VS Code-style **file & folder tree** in a collapsible side panel
- **Create, rename, delete** files and folders inline
- File system changes sync instantly to all connected users

### 📂 Multi-File Editing
- **File tabs** — open multiple files, switch between them easily
- **Auto language detection** — syntax highlighting based on file extension

### 🌐 Multi-Language Syntax Highlighting
| Language | Extensions |
|---|---|
| JavaScript / JSX / TS | `.js` `.jsx` `.ts` `.tsx` |
| HTML | `.html` `.htm` |
| CSS / SCSS | `.css` `.scss` |
| Python | `.py` |
| JSON | `.json` |
| Markdown | `.md` |
| Shell | `.sh` `.bash` |
| SQL | `.sql` |
| PHP | `.php` |
| C / C++ / Java / C# | `.c` `.cpp` `.java` `.cs` |

### 👥 Access Control
- **Admin / Editor / Viewer** role badges for every user
- Admin can **grant or revoke** write access per user
- Viewers can **request write access** from the admin
- All permission changes reflect in real-time

### 📤 Upload Projects
- Upload **individual files** or an **entire folder** with its structure intact
- Uploaded content is injected into the collaborative Yjs document automatically

### 📥 Download Project
- Download the full project as a **ZIP file** with the correct folder structure using `jszip`

### 🔗 Invite Friends
- Share a link via **WhatsApp, Telegram, Twitter, LinkedIn, Facebook, or Email**
- Invite links pre-fill the Room ID on the join page

### 🎨 Light / Dark Theme
- Toggle between light and dark mode from anywhere in the editor
- Theme persists across sessions via `localStorage`

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, React Router, CodeMirror 5 |
| **Collaboration** | Yjs (CRDT), y-websocket, y-codemirror |
| **Backend** | Node.js, Express, Socket.IO |
| **Styling** | Vanilla CSS with CSS variables (dark/light theme) |
| **Download** | jszip |

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start both frontend and backend concurrently
npm run dev
```

- Frontend → `http://localhost:3000`
- Backend (Socket.IO + Yjs WebSocket) → `http://localhost:3001`

---

## ☁️ Deployment (Render / Railway)

Since Socket.IO and the Yjs y-websocket server share a **single port (3001)**, deployment is straightforward.

**Build command:**
```bash
npm install && npm run build
```

**Start command:**
```bash
node server.js
```

**Environment variables:**
| Variable | Example Value |
|---|---|
| `PORT` | `3001` |
| `CLIENT_ORIGIN` | `https://your-app.onrender.com` |

> The app serves the React build statically from `server.js` and handles all WebSocket upgrades (Socket.IO + Yjs) on the same port.

---

## 📸 Layout Overview

```
┌──────┬───────────────────────────────────────────────────┐
│ Act. │  Side Panel     │  File Tabs                      │
│ Bar  │  (Explorer /    │  index.js × App.js ×            │
│      │   Users)        ├─────────────────────────────────┤
│  📁  │                 │                                 │
│  👥  │  File Tree /    │        CodeMirror Editor        │
│      │  User Cards     │        (Yjs-powered)            │
│  ⬆️  │                 │                                 │
│  🗂️  │                 │                                 │
│  📨  │                 │                                 │
│  🔑  │                 │                                 │
│  💾  │                 │                                 │
└──────┴─────────────────┴─────────────────────────────────┘
                          [ ☀️ Light ]  [ 🚪 Leave ]  ← top right
```

---

## 📄 License

MIT
