const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const ACTIONS = require('./src/Actions');
const WebSocket = require('ws');
const setupWSConnection = require('y-websocket/bin/utils').setupWSConnection;
const { randomUUID: uuid } = require('crypto');

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
          "https://your-backend.railway.app",
          "https://ce.judge0.com"
        ],
        frameSrc: ["'self'", "blob:"],
        childSrc: ["'self'", "blob:"],
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
// roomState: { admin, permissions, fileSystem, fileContents }
const roomState = {};

// Delayed cleanup to prevent data loss on page refresh
// When a user refreshes, their socket disconnects before the new one connects.
// A grace period ensures the room state is preserved during this transition.
const roomCleanupTimers = {};
const ROOM_CLEANUP_DELAY_MS = 60000;

// Delayed admin transfer to prevent privilege loss on page refresh.
// When the admin refreshes, their socket disconnects before the new one connects.
// A grace period allows them to rejoin and reclaim admin before transfer occurs.
const adminTransferTimers = {};
const ADMIN_TRANSFER_DELAY_MS = 10000;

// ---- Permission helper ----
// Returns true if socket is the room admin OR has been granted write access.
function canWriteToRoom(socket, roomId) {
  const room = roomState[roomId];
  if (!room) return false;
  if (room.admin === socket.id) return true;
  return room.permissions?.[socket.id] === true;
}

// ---- Activity Feed Helper ----
function logAndBroadcastActivity(roomId, socket, type, message, meta = {}) {
  const room = roomState[roomId];
  if (!room) return;

  const activity = {
    id: uuid(),
    userId: socket.id,
    userName: userSocketMap[socket.id] || 'Unknown',
    type,
    message,
    timestamp: new Date().toISOString(),
    meta
  };

  if (!room.activities) room.activities = [];
  room.activities.push(activity);
  if (room.activities.length > 50) {
    room.activities.shift(); // Keep most recent 50 events
  }
  io.to(roomId).emit(ACTIONS.ACTIVITY_RECEIVE, activity);
}

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
  socket.on(ACTIONS.JOIN, ({ roomId, userName, adminToken }) => {
    // ── Input validation ──────────────────────────────────────────
    if (!roomId || typeof roomId !== 'string') {
      return socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'Invalid room ID' });
    }
    roomId = roomId.trim();
    if (roomId.length === 0 || roomId.length > 50) {
      return socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'Invalid room ID' });
    }
    if (!userName || typeof userName !== 'string') {
      return socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'Invalid username' });
    }
    userName = userName.trim();
    if (userName.length === 0 || userName.length > 30) {
      return socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'Username must be between 1 and 30 characters' });
    }
    // If there was a pending cleanup for this room (e.g. after a refresh), cancel it.
    if (roomCleanupTimers[roomId]) {
      clearTimeout(roomCleanupTimers[roomId]);
      delete roomCleanupTimers[roomId];
    }

    socketRoomMap[socket.id] = roomId;
    userSocketMap[socket.id] = userName;
    socket.join(roomId);

    // Initialize room state if it doesn't exist (first user = room creator = admin)
    if (!roomState[roomId]) {
      const token = uuid(); // crypto.randomUUID() — secure, unguessable
      roomState[roomId] = {
        admin: socket.id,
        adminToken: token,
        permissions: {},
        fileSystem: createDefaultFileSystem(),
        fileContents: {}, // stores uploaded file contents keyed by fileId
        chatMessages: [], // stores group chat messages
        fileLocks: {}, // Key: fileId, Value: { socketId, userName, allowedUsers }
        activeEditors: {}, // Key: fileId, Value: { socketId, userName }
        activities: [],   // stores collaborative activity events
      };
      // Send the ownership token ONLY to the admin socket.
      // No other client ever receives this value.
      socket.emit(ACTIONS.ADMIN_TOKEN, { adminToken: token });
    } else if (adminToken && adminToken === roomState[roomId].adminToken) {
      // The legitimate admin is reconnecting (e.g. after a page refresh).
      // The client-provided token matches the server-stored token — reclaim admin.
      roomState[roomId].admin = socket.id;
      roomState[roomId].permissions[socket.id] = true;
      // Cancel the pending admin transfer — verified owner is back.
      if (adminTransferTimers[roomId]) {
        clearTimeout(adminTransferTimers[roomId]);
        delete adminTransferTimers[roomId];
      }
      // Re-send the token so the client can re-persist it if needed.
      socket.emit(ACTIONS.ADMIN_TOKEN, { adminToken: roomState[roomId].adminToken });
    }
    // NOTE: If adminToken is absent or invalid, the transfer timer is NOT cancelled.
    // This prevents non-admin joins from interfering with pending admin reclaim.

    // Default permission
    if (roomState[roomId].admin === socket.id) {
      roomState[roomId].permissions[socket.id] = true;
    } else if (roomState[roomId].permissions[socket.id] === undefined) {
      roomState[roomId].permissions[socket.id] = false;
    }

    const clients = getAllConnectedClients(roomId);
    io.to(roomId).emit(ACTIONS.JOINED, { clients, userName, socketId: socket.id });

    // Combine and send current file system and stored file contents.
    socket.emit(ACTIONS.FS_SYNC, {
      fileSystem: roomState[roomId].fileSystem,
      fileContents: roomState[roomId].fileContents,
    });

    // Sync file locks and active editors
    socket.emit(ACTIONS.LOCK_STATUS_UPDATE, {
      fileLocks: roomState[roomId].fileLocks || {},
      activeEditors: roomState[roomId].activeEditors || {}
    });

    // Sync chat history to newly joined client
    if (roomState[roomId].chatMessages.length > 0) {
      socket.emit(ACTIONS.CHAT_RECEIVE, roomState[roomId].chatMessages);
    }

    // Sync activity history to newly joined client
    if (roomState[roomId].activities && roomState[roomId].activities.length > 0) {
      socket.emit(ACTIONS.ACTIVITY_RECEIVE, roomState[roomId].activities);
    }

    // Log the join activity (Fired after history sync so joiner receives history array first)
    logAndBroadcastActivity(roomId, socket, 'join', `${userName} joined the room.`);
  });

  socket.on(ACTIONS.FS_CREATE_NODE, ({ roomId, node }) => {
    if (!roomState[roomId]) return;
    // Server-side permission check — reject read-only users
    if (!canWriteToRoom(socket, roomId)) {
      socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'You do not have permission to modify files in this room.' });
      return;
    }
    const fs = roomState[roomId].fileSystem;
    // node: { id, name, type, parentId }
    fs[node.id] = node;
    if (fs[node.parentId]) {
      if (!fs[node.parentId].children) fs[node.parentId].children = [];
      fs[node.parentId].children.push(node.id);
    }
    io.to(roomId).emit(ACTIONS.FS_SYNC, { fileSystem: { ...fs } });

    // Log the creation activity
    const creatorName = userSocketMap[socket.id] || 'Unknown';
    logAndBroadcastActivity(roomId, socket, 'create', `${creatorName} created ${node.type} "${node.name}"`, { node });
  });

  socket.on(ACTIONS.FS_DELETE_NODE, ({ roomId, nodeId }) => {
    if (!roomState[roomId]) return;
    // Server-side permission check — reject read-only users
    if (!canWriteToRoom(socket, roomId)) {
      socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'You do not have permission to modify files in this room.' });
      return;
    }
    const fs = roomState[roomId].fileSystem;
    const node = fs[nodeId];
    if (!node) return;
    const nodeName = node.name;
    const nodeType = node.type;

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
    if (node.parentId && fs[node.parentId]) {
      fs[node.parentId].children = (fs[node.parentId].children || []).filter(c => c !== nodeId);
    }
    // Remove from fileSystem and evict any stored contents, locks, and active editors for deleted nodes.
    // Without this, late joiners would receive content or lock states for files that no longer exist.
    let locksChanged = false;
    toDelete.forEach(id => {
      delete fs[id];
      delete roomState[roomId].fileContents[id];
      if (roomState[roomId].fileLocks && roomState[roomId].fileLocks[id]) {
        delete roomState[roomId].fileLocks[id];
        locksChanged = true;
      }
      if (roomState[roomId].activeEditors && roomState[roomId].activeEditors[id]) {
        delete roomState[roomId].activeEditors[id];
        locksChanged = true;
      }
    });
    io.to(roomId).emit(ACTIONS.FS_SYNC, { fileSystem: { ...fs } });
    if (locksChanged) {
      io.to(roomId).emit(ACTIONS.LOCK_STATUS_UPDATE, {
        fileLocks: roomState[roomId].fileLocks,
        activeEditors: roomState[roomId].activeEditors
      });
    }

    // Log the deletion activity
    const deleterName = userSocketMap[socket.id] || 'Unknown';
    logAndBroadcastActivity(roomId, socket, 'delete', `${deleterName} deleted ${nodeType} "${nodeName}"`);
  });

  socket.on(ACTIONS.FS_RENAME_NODE, ({ roomId, nodeId, newName }) => {
    if (!roomState[roomId]) return;
    // Server-side permission check — reject read-only users
    if (!canWriteToRoom(socket, roomId)) {
      socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'You do not have permission to modify files in this room.' });
      return;
    }
    const fs = roomState[roomId].fileSystem;
    const node = fs[nodeId];
    if (node) {
      const oldName = node.name;
      const nodeType = node.type || 'file';
      node.name = newName;
      io.to(roomId).emit(ACTIONS.FS_SYNC, { fileSystem: { ...fs } });

      // Log the rename activity
      const renamerName = userSocketMap[socket.id] || 'Unknown';
      logAndBroadcastActivity(roomId, socket, 'rename', `${renamerName} renamed ${nodeType} "${oldName}" to "${newName}"`);
    }
  });

  // ---- Upload Batch Event ----
  // Receives nodes (folders + files) and their text contents in one shot.
  // This ensures all collaborators (including late joiners) get both the file
  // tree structure AND the actual file content — fixing the content-not-syncing bug.
  socket.on(ACTIONS.FS_UPLOAD_BATCH, ({ roomId, nodes, fileContents }, ack) => {
    const reply = (success, message) => { if (typeof ack === 'function') ack({ success, message }); };

    if (!roomState[roomId]) { reply(false, 'Room not found.'); return; }
    // Server-side permission check — reject read-only users
    if (!canWriteToRoom(socket, roomId)) {
      socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'You do not have permission to upload files in this room.' });
      reply(false, 'You do not have permission to upload files in this room.');
      return;
    }

    const fs = roomState[roomId].fileSystem;

    // Merge nodes into file system in the order provided (folders before files)
    if (!Array.isArray(nodes)) {
      socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'Invalid upload payload: nodes must be an array.' });
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
    // Mirrors the JOIN-path fix: bundling both into FS_SYNC ensures the client's
    // FS_SYNC handler seeds initialContentsRef before setFileSystem triggers a render,
    // eliminating the race for all users already in the room when a file is uploaded.
    io.to(roomId).emit(ACTIONS.FS_SYNC, {
      fileSystem: { ...fs },
      fileContents: fileContents && Object.keys(fileContents).length > 0 ? fileContents : undefined,
    });

    // Log the upload activity
    const fileCount = nodes.filter(n => n.type === 'file').length;
    const folderCount = nodes.filter(n => n.type === 'folder').length;
    const uploaderName = userSocketMap[socket.id] || 'Unknown';
    let msg = `${uploaderName} uploaded `;
    if (fileCount > 0 && folderCount > 0) {
      msg += `${fileCount} file${fileCount !== 1 ? 's' : ''} in ${folderCount} folder${folderCount !== 1 ? 's' : ''}`;
    } else if (fileCount > 0) {
      msg += `${fileCount} file${fileCount !== 1 ? 's' : ''}`;
    } else if (folderCount > 0) {
      msg += `${folderCount} folder${folderCount !== 1 ? 's' : ''}`;
    } else {
      msg += `workspace items`;
    }
    logAndBroadcastActivity(roomId, socket, 'upload', msg);

    // Acknowledge success to the uploader so the client can show the toast
    reply(true, '');
  });

  // ---- Access Control ----
  socket.on(ACTIONS.TOGGLE_PERMISSION, ({ roomId, targetSocketId, canWrite }) => {
    if (roomState[roomId] && roomState[roomId].admin === socket.id) {
      roomState[roomId].permissions[targetSocketId] = canWrite;
      const clients = getAllConnectedClients(roomId);
      io.to(roomId).emit(ACTIONS.PERMISSION_CHANGED, { clients });

      // Log the permission change activity
      const targetName = userSocketMap[targetSocketId] || 'Unknown';
      const role = canWrite ? 'Editor' : 'Viewer';
      logAndBroadcastActivity(roomId, socket, 'permission', `Admin changed permissions for ${targetName} to ${role}.`);
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

    const clients = getAllConnectedClients(roomId);
    io.to(roomId).emit(ACTIONS.PERMISSION_CHANGED, { clients });

    io.to(requesterSocketId).emit(ACTIONS.APPROVE_CODE_EDIT, {
      roomId,
      canWrite: true,
    });

    // Log the approve access activity
    const requesterName = userSocketMap[requesterSocketId] || 'Unknown';
    logAndBroadcastActivity(roomId, socket, 'permission', `Admin approved Editor access for ${requesterName}.`);
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

  // ---- Group Chat ----
  socket.on(ACTIONS.CHAT_SEND, ({ roomId, message }) => {
    if (!roomState[roomId]) return;
    
    // Validate message
    if (!message || typeof message !== 'string') return;
    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) return;
    const finalMessage = trimmedMessage.slice(0, 1000); // Max 1000 chars
    
    const chatMsg = {
      id: uuid(),
      userName: userSocketMap[socket.id] || 'Unknown',
      message: finalMessage,
      timestamp: new Date().toISOString(),
      socketId: socket.id
    };
    
    // Store message server-side (cap at 200 messages)
    roomState[roomId].chatMessages.push(chatMsg);
    if (roomState[roomId].chatMessages.length > 200) {
      roomState[roomId].chatMessages.shift(); // Remove oldest
    }
    
    // Broadcast to entire room (including sender)
    io.to(roomId).emit(ACTIONS.CHAT_RECEIVE, chatMsg);
  });

  // ---- File Lock & Edit Access Request System ----
  socket.on(ACTIONS.FILE_LOCKED, ({ roomId, fileId }) => {
    if (!roomState[roomId]) return;
    const room = roomState[roomId];
    const isRoomAdmin = room.admin === socket.id;
    const hasWritePermission = room.permissions[socket.id] === true;

    if (!hasWritePermission && !isRoomAdmin) {
      socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'You do not have permission to lock files in this room.' });
      return;
    }

    // Check if already locked by someone else (only admin can override)
    const existingLock = room.fileLocks?.[fileId];
    if (existingLock && existingLock.socketId !== socket.id && !isRoomAdmin) {
      socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'This file is already locked by someone else.' });
      return;
    }

    const userName = userSocketMap[socket.id] || 'Unknown';
    if (!room.fileLocks) room.fileLocks = {};
    room.fileLocks[fileId] = {
      socketId: socket.id,
      userName: userName,
      allowedUsers: {}
    };

    io.to(roomId).emit(ACTIONS.FILE_LOCKED, { fileId, socketId: socket.id, userName });
    io.to(roomId).emit(ACTIONS.LOCK_STATUS_UPDATE, {
      fileLocks: room.fileLocks,
      activeEditors: room.activeEditors || {}
    });
  });

  socket.on(ACTIONS.FILE_UNLOCKED, ({ roomId, fileId }) => {
    if (!roomState[roomId]) return;
    const room = roomState[roomId];
    const lock = room.fileLocks?.[fileId];
    if (!lock) return;

    const isRoomAdmin = room.admin === socket.id;
    if (lock.socketId !== socket.id && !isRoomAdmin) {
      socket.emit(ACTIONS.PERMISSION_DENIED, { message: 'You cannot unlock a file locked by someone else.' });
      return;
    }

    delete room.fileLocks[fileId];
    io.to(roomId).emit(ACTIONS.FILE_UNLOCKED, { fileId });
    io.to(roomId).emit(ACTIONS.LOCK_STATUS_UPDATE, {
      fileLocks: room.fileLocks,
      activeEditors: room.activeEditors || {}
    });
  });

  socket.on(ACTIONS.REQUEST_EDIT_ACCESS, ({ roomId, fileId }) => {
    if (!roomState[roomId]) return;
    const room = roomState[roomId];
    const lock = room.fileLocks?.[fileId];
    if (!lock) return;

    const userName = userSocketMap[socket.id] || 'Unknown';
    const fileName = room.fileSystem[fileId]?.name || 'file';

    // Route request to current lock owner
    io.to(lock.socketId).emit(ACTIONS.REQUEST_EDIT_ACCESS, {
      requesterSocketId: socket.id,
      requesterName: userName,
      fileId,
      fileName
    });
  });

  socket.on(ACTIONS.APPROVE_EDIT_ACCESS, ({ roomId, fileId, requesterSocketId }) => {
    if (!roomState[roomId]) return;
    const room = roomState[roomId];
    const lock = room.fileLocks?.[fileId];
    if (!lock) return;

    const isRoomAdmin = room.admin === socket.id;
    if (lock.socketId !== socket.id && !isRoomAdmin) return;

    if (!lock.allowedUsers) lock.allowedUsers = {};
    lock.allowedUsers[requesterSocketId] = true;

    // Notify requester
    io.to(requesterSocketId).emit(ACTIONS.APPROVE_EDIT_ACCESS, { fileId });
    
    // Broadcast lock status update to sync all clients
    io.to(roomId).emit(ACTIONS.LOCK_STATUS_UPDATE, {
      fileLocks: room.fileLocks,
      activeEditors: room.activeEditors || {}
    });
  });

  socket.on(ACTIONS.REJECT_EDIT_ACCESS, ({ roomId, fileId, requesterSocketId }) => {
    if (!roomState[roomId]) return;
    const room = roomState[roomId];
    const lock = room.fileLocks?.[fileId];
    if (!lock) return;

    const isRoomAdmin = room.admin === socket.id;
    if (lock.socketId !== socket.id && !isRoomAdmin) return;

    const fileName = room.fileSystem[fileId]?.name || 'file';

    // Notify requester
    io.to(requesterSocketId).emit(ACTIONS.REJECT_EDIT_ACCESS, { fileId, fileName });
  });

  socket.on(ACTIONS.ACTIVE_EDITOR_CHANGED, ({ roomId, fileId }) => {
    if (!roomState[roomId]) return;
    const room = roomState[roomId];
    if (!room.activeEditors) room.activeEditors = {};

    const userName = userSocketMap[socket.id] || 'Unknown';

    if (fileId) {
      room.activeEditors[fileId] = { socketId: socket.id, userName };
    } else {
      // If fileId is null, user closed all files, so remove them from any file they were editing
      for (const [fId, editor] of Object.entries(room.activeEditors)) {
        if (editor.socketId === socket.id) {
          delete room.activeEditors[fId];
        }
      }
    }

    io.to(roomId).emit(ACTIONS.LOCK_STATUS_UPDATE, {
      fileLocks: room.fileLocks || {},
      activeEditors: room.activeEditors
    });
  });


  socket.on('disconnecting', () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      if (roomState[roomId] && roomState[roomId].admin === socket.id) {
        const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []).filter(id => id !== socket.id);
        if (clientsInRoom.length > 0) {
          // Don't transfer admin immediately — the admin may be refreshing.
          // Use a grace period so they can rejoin and reclaim ownership.
          if (!adminTransferTimers[roomId]) {
            adminTransferTimers[roomId] = setTimeout(() => {
              delete adminTransferTimers[roomId];
              if (!roomState[roomId]) return;
              // Only transfer if admin socket is still disconnected
              const currentRoom = io.sockets.adapter.rooms.get(roomId);
              if (currentRoom && currentRoom.has(roomState[roomId].admin)) return;
              // Transfer admin to the first remaining connected client
              const remaining = Array.from(currentRoom || []);
              if (remaining.length > 0) {
                roomState[roomId].admin = remaining[0];
                roomState[roomId].permissions[remaining[0]] = true;
                // Rotate the admin token so the previous admin can never reclaim.
                roomState[roomId].adminToken = uuid();
                // Deliver the new token to the new admin only.
                io.to(remaining[0]).emit(ACTIONS.ADMIN_TOKEN, { adminToken: roomState[roomId].adminToken });
                const clients = getAllConnectedClients(roomId);
                io.to(roomId).emit(ACTIONS.PERMISSION_CHANGED, { clients });
              }
            }, ADMIN_TRANSFER_DELAY_MS);
          }
        } else {
          roomCleanupTimers[roomId] = setTimeout(() => {
            delete roomState[roomId];
            delete roomCleanupTimers[roomId];
            if (adminTransferTimers[roomId]) {
              clearTimeout(adminTransferTimers[roomId]);
              delete adminTransferTimers[roomId];
            }
          }, ROOM_CLEANUP_DELAY_MS);
        }
      }

      socket.to(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        userName: userSocketMap[socket.id],
      });

      // Log the leave activity
      const userName = userSocketMap[socket.id];
      if (userName && roomState[roomId]) {
        socket.to(roomId).emit(ACTIONS.ACTIVITY_RECEIVE, (() => {
          const room = roomState[roomId];
          const activity = {
            id: uuid(),
            userId: socket.id,
            userName,
            type: 'leave',
            message: `${userName} left the room.`,
            timestamp: new Date().toISOString(),
            meta: {}
          };
          if (!room.activities) room.activities = [];
          room.activities.push(activity);
          if (room.activities.length > 50) room.activities.shift();
          return activity;
        })());
      }

      if (roomState[roomId]) {
        const clients = getAllConnectedClients(roomId).filter(c => c.socketId !== socket.id);
        socket.to(roomId).emit(ACTIONS.PERMISSION_CHANGED, { clients });
      }

      // Clean up file locks owned by the disconnecting client
      if (roomState[roomId] && roomState[roomId].fileLocks) {
        let lockChanged = false;
        for (const [fId, lock] of Object.entries(roomState[roomId].fileLocks)) {
          if (lock.socketId === socket.id) {
            delete roomState[roomId].fileLocks[fId];
            lockChanged = true;
            io.to(roomId).emit(ACTIONS.FILE_UNLOCKED, { fileId: fId });
          } else if (lock.allowedUsers && lock.allowedUsers[socket.id]) {
            // Remove user from allowed list
            delete lock.allowedUsers[socket.id];
            lockChanged = true;
          }
        }
        if (lockChanged) {
          io.to(roomId).emit(ACTIONS.LOCK_STATUS_UPDATE, {
            fileLocks: roomState[roomId].fileLocks,
            activeEditors: roomState[roomId].activeEditors || {}
          });
        }
      }

      // Clean up active editors
      if (roomState[roomId] && roomState[roomId].activeEditors) {
        let editorChanged = false;
        for (const [fId, editor] of Object.entries(roomState[roomId].activeEditors)) {
          if (editor.socketId === socket.id) {
            delete roomState[roomId].activeEditors[fId];
            editorChanged = true;
          }
        }
        if (editorChanged) {
          io.to(roomId).emit(ACTIONS.LOCK_STATUS_UPDATE, {
            fileLocks: roomState[roomId].fileLocks || {},
            activeEditors: roomState[roomId].activeEditors
          });
        }
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
