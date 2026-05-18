const ROOM_CLEANUP_GRACE_MS = 15000;

function createRoomState(adminSocketId, fileSystemFactory) {
  return {
    admin: adminSocketId,
    permissions: {},
    fileSystem: fileSystemFactory(),
    fileContents: {},
    cleanupTimer: null,
  };
}

function cancelPendingRoomCleanup(room) {
  if (!room || !room.cleanupTimer) return;
  clearTimeout(room.cleanupTimer);
  room.cleanupTimer = null;
}

function scheduleRoomCleanup(roomState, roomId, delayMs = ROOM_CLEANUP_GRACE_MS) {
  const room = roomState[roomId];
  if (!room) return null;

  cancelPendingRoomCleanup(room);
  room.cleanupTimer = setTimeout(() => {
    delete roomState[roomId];
  }, delayMs);

  return room.cleanupTimer;
}

module.exports = {
  ROOM_CLEANUP_GRACE_MS,
  createRoomState,
  cancelPendingRoomCleanup,
  scheduleRoomCleanup,
};
