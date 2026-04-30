import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef('');
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    const [clients, setClients] = useState([]);
    const [socketReady, setSocketReady] = useState(false);
    const [canWrite, setCanWrite] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            // Wait for socket to be fully connected before proceeding
            socketRef.current.on('connect', () => {
                setSocketReady(true);
                socketRef.current.emit(ACTIONS.JOIN, {
                    roomId,
                    userName: location.state?.userName,
                });
            });

            const updateLocalPermissions = (updatedClients) => {
                const me = updatedClients.find(c => c.socketId === socketRef.current.id);
                if (me) {
                    setCanWrite(me.canWrite);
                    setIsAdmin(me.isAdmin);
                }
            };

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, userName, socketId }) => {
                    if (
                        userName !== location.state?.userName &&
                        socketId !== socketRef.current.id
                    ) {
                        toast.success(`${userName} joined the room.`);
                    }
                    setClients(clients);
                    updateLocalPermissions(clients);

                    // If I am the new user (my socketId === socketRef.current.id),
                    // ask the first other client for the code
                    if (socketId === socketRef.current.id) {
                        const host = clients.find(
                            (c) => c.socketId !== socketRef.current.id
                        );
                        if (host) {
                            socketRef.current.emit(ACTIONS.SYNC_CODE, {
                                code: codeRef.current,
                                socketId: socketRef.current.id,
                                to: host.socketId,
                            });
                        }
                    }
                }
            );

            // Listening for permission changes
            socketRef.current.on(ACTIONS.PERMISSION_CHANGED, ({ clients }) => {
                setClients(clients);
                updateLocalPermissions(clients);
            });

            // Listening for write access requests (Admin only)
            socketRef.current.on(ACTIONS.WRITE_ACCESS_REQUESTED, ({ requesterSocketId, userName, message }) => {
                toast((t) => (
                    <div>
                        <b>{userName}</b> requests write access.<br/>
                        <i style={{ color: '#555' }}>"{message}"</i><br/><br/>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button 
                                onClick={() => {
                                    socketRef.current.emit(ACTIONS.TOGGLE_PERMISSION, { roomId, targetSocketId: requesterSocketId, canWrite: true });
                                    toast.dismiss(t.id);
                                }}
                                style={{ background: '#50fa7b', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Approve
                            </button>
                            <button 
                                onClick={() => toast.dismiss(t.id)}
                                style={{ background: '#ff5555', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Deny
                            </button>
                        </div>
                    </div>
                ), { duration: 10000, position: 'top-center' });
            });

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, userName }) => {
                    toast.success(`${userName} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );
        };
        init();
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.PERMISSION_CHANGED);
                socketRef.current.off(ACTIONS.WRITE_ACCESS_REQUESTED);
            }
        };
    }, []);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    function togglePermission(targetSocketId, currentCanWrite) {
        if (!isAdmin) return;
        socketRef.current.emit(ACTIONS.TOGGLE_PERMISSION, {
            roomId,
            targetSocketId,
            canWrite: !currentCanWrite
        });
    }

    function requestWriteAccess() {
        const message = prompt('Enter a message for the admin to request write access:');
        if (message) {
            socketRef.current.emit(ACTIONS.REQUEST_WRITE_ACCESS, {
                roomId,
                message,
                userName: location.state?.userName
            });
            toast.success('Request sent to admin!');
        }
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div className="mainWrap">
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <img
                            className="logoImage"
                            src="/logo1.jpg" 
                            width="250px"
                            alt="logo"
                            height="140px"
                        />
                    </div>
                    <h3>Connected {isAdmin ? '(Admin)' : ''}</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                userName={client.userName}
                                isAdmin={client.isAdmin}
                                canWrite={client.canWrite}
                                isMe={client.socketId === socketRef.current?.id}
                                iAmAdmin={isAdmin}
                                onTogglePermission={() => togglePermission(client.socketId, client.canWrite)}
                                onRequestAccess={requestWriteAccess}
                            />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                {socketReady && (
                    <Editor
                        socketRef={socketRef}
                        roomId={roomId}
                        onCodeChange={(code) => {
                            codeRef.current = code;
                        }}
                        userName={location.state?.userName}
                        canWrite={canWrite}
                    />
                )}
                {!canWrite && (
                    <div className="readonly-badge">
                        Read-Only Mode
                    </div>
                )}
            </div>
        </div>
    );
};

export default EditorPage;
