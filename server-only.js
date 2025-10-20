const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const ACTIONS = require('./src/Actions');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'https://your-app.vercel.app';

app.use(helmet());
app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json());

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

function getAllConnectedClients(roomId) {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
    return {
      socketId,
      userName: userSocketMap[socketId],
    };
  });
}

io.on('connection', (socket) => {
  socket.on(ACTIONS.JOIN, ({ roomId, userName }) => {
    socketRoomMap[socket.id] = roomId;
    userSocketMap[socket.id] = userName;
    socket.join(roomId);
    let clients = getAllConnectedClients(roomId);
    clients = Array.from(new Map(clients.map(client => [client.userName, client])).values());
    io.to(roomId).emit(ACTIONS.JOINED, { clients, userName, socketId: socket.id });
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
      socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        userName: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    delete socketRoomMap[socket.id];
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});