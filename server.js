const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const ACTIONS = require('./src/Actions');
const WebSocket = require('ws');
const setupWSConnection = require('y-websocket/bin/utils').setupWSConnection;

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
const roomState = {}; // { roomId: { admin: socketId, permissions: { socketId: boolean } } }

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
  // No sensitive logs in production
  socket.on(ACTIONS.JOIN, ({ roomId, userName }) => {
    socketRoomMap[socket.id] = roomId;
    userSocketMap[socket.id] = userName;
    socket.join(roomId);

    // Initialize room state if it doesn't exist
    if (!roomState[roomId]) {
      roomState[roomId] = {
        admin: socket.id,
        permissions: {}
      };
    }

    // Default permission
    if (roomState[roomId].admin === socket.id) {
      roomState[roomId].permissions[socket.id] = true;
    } else if (roomState[roomId].permissions[socket.id] === undefined) {
      roomState[roomId].permissions[socket.id] = false; // Read-only by default
    }

    let clients = getAllConnectedClients(roomId);
    clients = Array.from(new Map(clients.map(client => [client.userName, client])).values());
    io.to(roomId).emit(ACTIONS.JOINED, { clients, userName, socketId: socket.id });
  });

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

  socket.on(ACTIONS.CODE_CHANGE,({roomId, code})=>{
    socket.to(roomId).emit(ACTIONS.CODE_CHANGE,{code});
  });

  socket.on(ACTIONS.SYNC_CODE, ({ code, socketId }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      // Re-assign admin if needed
      if (roomState[roomId] && roomState[roomId].admin === socket.id) {
        const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []).filter(id => id !== socket.id);
        if (clientsInRoom.length > 0) {
          roomState[roomId].admin = clientsInRoom[0];
          roomState[roomId].permissions[clientsInRoom[0]] = true; // Auto-grant write to new admin
        } else {
          delete roomState[roomId];
        }
      }

      socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        userName: userSocketMap[socket.id],
      });

      // Broadcast permission change to sync potential new admin
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
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
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
