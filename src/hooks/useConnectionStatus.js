import { useEffect, useState } from 'react';

const useConnectionStatus = (socketRef) => {
  const [status, setStatus] = useState('Connecting');

  useEffect(() => {
    if (!socketRef?.current) return;

    const socket = socketRef.current;

    const onConnect = () => setStatus('Connected');
    const onDisconnect = () => setStatus('Offline');
    const onReconnectAttempt = () => setStatus('Reconnecting');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Safe check
    if (socket.io) {
      socket.io.on('reconnect_attempt', onReconnectAttempt);
    }

    if (socket.connected) {
      setStatus('Connected');
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);

      if (socket.io) {
        socket.io.off('reconnect_attempt', onReconnectAttempt);
      }
    };
  }, [socketRef]);

  return status;
};

export default useConnectionStatus;