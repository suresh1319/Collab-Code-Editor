import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: 'Infinity',
        timeout: 10000,
        transports:['websocket'],
    };
    // Use current origin in production to avoid localhost hardcoding from .env
    const backendUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001');

    return io(backendUrl, options);
};