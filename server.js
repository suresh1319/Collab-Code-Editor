const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const ACTIONS = require('./src/Actions');
const WebSocket = require('ws');
const setupWSConnection = require('y-websocket/bin/utils').setupWSConnection;
const { v4: uuid } = require('uuid');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "ws://localhost:3001",
          "http://localhost:3001",
          "ws://localhost:3000",
          "http://localhost:3000",
          "wss://your-backend.railway.app",
          "https://your-backend.railway.app"
        ],
      },
    },
  })
);
app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const userSocketMap = {};
const socketRoomMap = {};
// roomState: { admin, permissions, fileSystem }
const roomState = {};

// ---- File System Helpers ----
function createDefaultFileSystem() {
  const rootId = 'root';
  const fileId = uuid();
  return {
    [rootId]: { id: rootId, name: 'Project', type: 'folder', children: [fileId], parentId: null },
    [fileId]: { id: fileId, name: 'index.js', type: 'file', parentId: rootId },
  };
}

function getAllConnectedClients(roomId) {
  const state = roomState[roomId];
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
    return {
      socketId,
      userName: userSocketMap[socketId],
      isAdmin: state ? state.admin === socketId : false,
      canWrite: state ? !!state.permissions[socketId] : false
    };
  });
}

io.on('connection', (socket) => {
  socket.on(ACTIONS.JOIN, ({ roomId, userName }) => {
    socketRoomMap[socket.id] = roomId;
    userSocketMap[socket.id] = userName;
    socket.join(roomId);

    // Initialize room state if it doesn't exist
    if (!roomState[roomId]) {
      roomState[roomId] = {
        admin: socket.id,
        permissions: {},
        fileSystem: createDefaultFileSystem(),
        fileContents: {},
      };
    }

    // Default permission
    if (roomState[roomId].admin === socket.id) {
      roomState[roomId].permissions[socket.id] = true;
    } else if (roomState[roomId].permissions[socket.id] === undefined) {
      roomState[roomId].permissions[socket.id] = false;
    }

    let clients = getAllConnectedClients(roomId);
    clients = Array.from(new Map(clients.map(client => [client.userName, client])).values());
    io.to(roomId).emit(ACTIONS.JOINED, { clients, userName, socketId: socket.id });

    // Send current file system AND any stored file contents in one atomic emit.
    socket.emit(ACTIONS.FS_SYNC, {
      fileSystem: roomState[roomId].fileSystem,
      fileContents: roomState[roomId].fileContents,
    });
  });

  // ---- File System Events ----
  socket.on(ACTIONS.FS_UPLOAD_BATCH, ({ roomId, nodes, fileContents }, ack) => {
    const reply = (success, message) => { if (typeof ack === 'function') ack({ success, message }); };

    if (!roomState[roomId]) { reply(false, 'Room not found.'); return; }

    const fs = roomState[roomId].fileSystem;

    // Merge nodes into file system in the order provided (folders before files)
    if (!Array.isArray(nodes)) {
      reply(false, 'Invalid upload payload: nodes must be an array.');
      return;
    }
    for (const node of nodes) {
      fs[node.id] = node;
      if (fs[node.parentId]) {
        if (!fs[node.parentId].children) fs[node.parentId].children = [];
        // Avoid adding duplicate child references
        if (!fs[node.parentId].children.includes(node.id)) {
          fs[node.parentId].children.push(node.id);
        }
      }
    }

    // Store uploaded file contents server-side for late joiners
    if (fileContents && typeof fileContents === 'object') {
      Object.assign(roomState[roomId].fileContents, fileContents);
    }

    // Broadcast updated file tree AND contents atomically in one frame.
    io.to(roomId).emit(ACTIONS.FS_SYNC, {
      fileSystem: { ...fs },
      fileContents: fileContents && Object.keys(fileContents).length > 0 ? fileContents : undefined,
    });

    // Acknowledge success to the uploader so the client can show the toast
    reply(true, '');
  });

  socket.on(ACTIONS.FS_SAVE, ({ roomId, fileContents }, ack) => {
    const reply = (success, message) => { if (typeof ack === 'function') ack({ success, message }); };

    if (!roomState[roomId]) { reply(false, 'Room not found.'); return; }

    if (!fileContents || typeof fileContents !== 'object') {
      reply(false, 'Invalid save payload: fileContents must be an object.');
      return;
    }

    roomState[roomId].fileContents = {
      ...roomState[roomId].fileContents,
      ...fileContents,
    };

    reply(true, '');
  });

  socket.on(ACTIONS.FS_CREATE_NODE, ({ roomId, node }) => {
    if (!roomState[roomId]) return;
    const fs = roomState[roomId].fileSystem;
    // node: { id, name, type, parentId }
    fs[node.id] = node;
    if (fs[node.parentId]) {
      if (!fs[node.parentId].children) fs[node.parentId].children = [];
      fs[node.parentId].children.push(node.id);
    }
    io.to(roomId).emit(ACTIONS.FS_SYNC, { fileSystem: { ...fs } });
  });

  socket.on(ACTIONS.FS_DELETE_NODE, ({ roomId, nodeId }) => {
    if (!roomState[roomId]) return;
    const fs = roomState[roomId].fileSystem;
    // Recursively collect all node ids to delete
    const toDelete = [];
    const collect = (id) => {
      const node = fs[id];
      if (!node) return;
      toDelete.push(id);
      if (node.children) node.children.forEach(collect);
    };
    collect(nodeId);
    // Remove from parent
    const node = fs[nodeId];
    if (node && node.parentId && fs[node.parentId]) {
      fs[node.parentId].children = (fs[node.parentId].children || []).filter(c => c !== nodeId);
    }
    // Remove from fileSystem and evict any stored contents for deleted nodes.
    // Without this, late joiners would receive content for files that no longer exist.
    toDelete.forEach(id => { delete fs[id]; delete roomState[roomId].fileContents[id]; });
    io.to(roomId).emit(ACTIONS.FS_SYNC, { fileSystem: { ...fs } });
  });

  socket.on(ACTIONS.FS_RENAME_NODE, ({ roomId, nodeId, newName }) => {
    if (!roomState[roomId]) return;
    const fs = roomState[roomId].fileSystem;
    if (fs[nodeId]) {
      fs[nodeId].name = newName;
      io.to(roomId).emit(ACTIONS.FS_SYNC, { fileSystem: { ...fs } });
    }
  });

  // ---- Access Control ----
  socket.on(ACTIONS.TOGGLE_PERMISSION, ({ roomId, targetSocketId, canWrite }) => {
    if (roomState[roomId] && roomState[roomId].admin === socket.id) {
      roomState[roomId].permissions[targetSocketId] = canWrite;
      let clients = getAllConnectedClients(roomId);
      clients = Array.from(new Map(clients.map(client => [client.userName, client])).values());
      io.to(roomId).emit(ACTIONS.PERMISSION_CHANGED, { clients });
    }
  });

  socket.on(ACTIONS.REQUEST_WRITE_ACCESS, ({ roomId, message, userName }) => {
    if (roomState[roomId] && roomState[roomId].admin) {
      const adminSocketId = roomState[roomId].admin;
      io.to(adminSocketId).emit(ACTIONS.WRITE_ACCESS_REQUESTED, {
        requesterSocketId: socket.id,
        userName,
        message
      });
    }
  });

  socket.on(ACTIONS.APPROVE_CODE_EDIT, ({ roomId, requesterSocketId }) => {
    if (!roomState[roomId] || roomState[roomId].admin !== socket.id) return;

    roomState[roomId].permissions[requesterSocketId] = true;

    let clients = getAllConnectedClients(roomId);
    clients = Array.from(new Map(clients.map(client => [client.userName, client])).values());
    io.to(roomId).emit(ACTIONS.PERMISSION_CHANGED, { clients });

    io.to(requesterSocketId).emit(ACTIONS.APPROVE_CODE_EDIT, {
      roomId,
      canWrite: true,
    });
  });

  socket.on(ACTIONS.DENY_CODE_EDIT, ({ roomId, requesterSocketId }) => {
    if (!roomState[roomId] || roomState[roomId].admin !== socket.id) return;

    io.to(requesterSocketId).emit(ACTIONS.DENY_CODE_EDIT, {
      roomId,
      canWrite: false,
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    socket.to(roomId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ code, socketId }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      if (roomState[roomId] && roomState[roomId].admin === socket.id) {
        const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []).filter(id => id !== socket.id);
        if (clientsInRoom.length > 0) {
          roomState[roomId].admin = clientsInRoom[0];
          roomState[roomId].permissions[clientsInRoom[0]] = true;
        } else {
          delete roomState[roomId];
        }
      }

      socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        userName: userSocketMap[socket.id],
      });

      if (roomState[roomId]) {
        let clients = getAllConnectedClients(roomId).filter(c => c.socketId !== socket.id);
        clients = Array.from(new Map(clients.map(client => [client.userName, client])).values());
        socket.to(roomId).emit(ACTIONS.PERMISSION_CHANGED, { clients });
      }
    });
    delete userSocketMap[socket.id];
    delete socketRoomMap[socket.id];
  });
});

// Serve React app for all unknown routes (fallback)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: 'error', message: 'Something went wrong!' });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Yjs WebSocket server (Attached to the same HTTP server)
const wss = new WebSocket.Server({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  if (request.url.startsWith('/yjs')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
});

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});
console.log('Yjs WebSocket server is attached to the HTTP server');
