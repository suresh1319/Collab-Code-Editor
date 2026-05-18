const {
  ROOM_CLEANUP_GRACE_MS,
  createRoomState,
  cancelPendingRoomCleanup,
  scheduleRoomCleanup,
} = require('./roomStateLifecycle');

describe('roomStateLifecycle', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('createRoomState seeds file system and cleanup metadata', () => {
    const room = createRoomState('socket-1', () => ({ root: { id: 'root' } }));

    expect(room.admin).toBe('socket-1');
    expect(room.fileSystem).toEqual({ root: { id: 'root' } });
    expect(room.fileContents).toEqual({});
    expect(room.cleanupTimer).toBeNull();
  });

  test('scheduleRoomCleanup deletes room after grace window', () => {
    jest.useFakeTimers();
    const roomState = {
      abc: createRoomState('socket-1', () => ({})),
    };

    scheduleRoomCleanup(roomState, 'abc', 25);
    expect(roomState.abc).toBeDefined();

    jest.advanceTimersByTime(25);
    expect(roomState.abc).toBeUndefined();
  });

  test('cancelPendingRoomCleanup preserves room during reconnect window', () => {
    jest.useFakeTimers();
    const roomState = {
      abc: createRoomState('socket-1', () => ({})),
    };

    scheduleRoomCleanup(roomState, 'abc', ROOM_CLEANUP_GRACE_MS);
    cancelPendingRoomCleanup(roomState.abc);

    jest.advanceTimersByTime(ROOM_CLEANUP_GRACE_MS);
    expect(roomState.abc).toBeDefined();
    expect(roomState.abc.cleanupTimer).toBeNull();
  });

  test('scheduleRoomCleanup replaces any older cleanup timer', () => {
    jest.useFakeTimers();
    const roomState = {
      abc: createRoomState('socket-1', () => ({})),
    };

    scheduleRoomCleanup(roomState, 'abc', 50);
    scheduleRoomCleanup(roomState, 'abc', 100);

    jest.advanceTimersByTime(75);
    expect(roomState.abc).toBeDefined();

    jest.advanceTimersByTime(25);
    expect(roomState.abc).toBeUndefined();
  });
});
