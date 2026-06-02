import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    FolderOpen,
    Users,
    Upload,
    FolderUp,
    KeyRound,
    Save,
    Sun,
    Moon,
    LogOut,
    Monitor,
    ChevronRight,
    MessageSquare,
    Terminal,
    UserPlus,
    Activity,
} from 'lucide-react';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import FileExplorer from '../components/FileExplorer';
import FileTabs from '../components/FileTabs';
import InviteModal from '../components/InviteModal';
import ConfirmModal from '../components/ConfirmModal';
import LeaveRoomModal from '../components/LeaveRoomModal';
import RequestAccessModal from '../components/RequestAccessModal';
import ChatPanel from '../components/ChatPanel';
import ActivityPanel from '../components/ActivityPanel';
import { initSocket } from '../socket';
import { downloadProject } from '../utils/downloadProject';
import { v4 as uuid } from 'uuid';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';
import VirtualConsole from '../components/VirtualConsole';
import { useCodeRunner } from '../hooks/useCodeRunner';

import { isBinary, isImage, getModeFromFilename } from '../utils/fileUtils';

const EditorPage = () => {
    const MOBILE_BREAKPOINT = 768;
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [showInvite, setShowInvite] = useState(false);
    const [showConfirmDownload, setShowConfirmDownload] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
    const [activePanel, setActivePanel] = useState('explorer'); // 'explorer' | 'users' | 'chat' | 'upload' | 'share' | etc.
    const [lastPersistentPanel, setLastPersistentPanel] = useState('explorer');
    const [consoleOpen, setConsoleOpen] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [activities, setActivities] = useState([]);
    const [unreadActivityCount, setUnreadActivityCount] = useState(0);
    const activePanelRef = useRef(activePanel);

    useEffect(() => {
        activePanelRef.current = activePanel;
        if (activePanel === 'chat') setUnreadChatCount(0);
        if (activePanel === 'activity') setUnreadActivityCount(0);
    }, [activePanel]);
    const [sideWidth, setSideWidth] = useState(() => {
        const saved = localStorage.getItem('sideWidth');
        return saved ? Number(saved) : 260;
    });
    const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT);
    const resizingRef = useRef(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(260);
    const MIN_SIDE_WIDTH = 180;
    const MAX_SIDE_WIDTH = 520;

    const { run, isRunning, consoleLogs, clearLogs } = useCodeRunner();

    useEffect(() => {
        if (theme === 'light') {
            document.body.setAttribute('data-theme', 'light');
        } else {
            document.body.removeAttribute('data-theme');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('sideWidth', sideWidth);
    }, [sideWidth]);

    useEffect(() => {
        const handleResize = () => setIsMobileViewport(window.innerWidth <= MOBILE_BREAKPOINT);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const updateSideWidth = useCallback((clientX) => {
        const delta = clientX - startXRef.current;
        const maxWidth = Math.min(MAX_SIDE_WIDTH, window.innerWidth - 320);
        const nextWidth = startWidthRef.current + delta;
        setSideWidth(Math.max(MIN_SIDE_WIDTH, Math.min(maxWidth, nextWidth)));
    }, []);

    const handleMouseMove = useCallback((event) => {
        if (!resizingRef.current) return;
        event.preventDefault();
        updateSideWidth(event.clientX);
    }, [updateSideWidth]);

    const stopResizing = useCallback(() => {
        if (!resizingRef.current) return;
        resizingRef.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', stopResizing);
    }, [handleMouseMove]);

    const startResizing = (event) => {
        event.preventDefault();
        resizingRef.current = true;
        startXRef.current = event.clientX;
        startWidthRef.current = sideWidth;
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopResizing);
    };

    useEffect(() => {
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [handleMouseMove, stopResizing]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const socketRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();

    // Resolve userName: prefer location.state (fresh navigation), fall back to
    // sessionStorage (page reload).  Persist so reloads always have a userName.
    const userName = React.useMemo(() => {
        const fromState = location.state?.userName;
        const storageKey = `collabce_user_${roomId}`;
        if (fromState) {
            try { sessionStorage.setItem(storageKey, fromState); } catch (_) { /* quota */ }
            return fromState;
        }
        try { return sessionStorage.getItem(storageKey) || ''; } catch (_) { return ''; }
    }, [location.state, roomId]);

    const [clients, setClients] = useState([]);
    const [socketReady, setSocketReady] = useState(false);
    const [canWrite, setCanWrite] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // File system state
    const [fileSystem, setFileSystem] = useState({});
    const [openFiles, setOpenFiles] = useState([]);
    const [activeFileId, setActiveFileId] = useState(null);

    // Track file contents for download
    const fileContentsRef = useRef({});
    const [fileContentsSnapshot, setFileContentsSnapshot] = useState({});
    const editorsRef = useRef({});
    const initialContentsRef = useRef({}); // fileId → string (for uploads)
    const uploadFileInputRef = useRef(null);
    const uploadFolderInputRef = useRef(null);

    // Secure admin ownership token — received from the server, never derived from user input.
    // Persisted in sessionStorage so it survives page reloads within the same browser session.
    const adminTokenRef = useRef(() => {
        try { return sessionStorage.getItem(`collabce_adminToken_${roomId}`) || null; } catch (_) { return null; }
    });

    useEffect(() => {
        // Resolve admin token from sessionStorage on mount (survives page reloads)
        try {
            adminTokenRef.current = sessionStorage.getItem(`collabce_adminToken_${roomId}`) || null;
        } catch (_) { adminTokenRef.current = null; }

        const init = () => {
            socketRef.current = initSocket();
            socketRef.current.on('connect_error', handleErrors);
            socketRef.current.on('connect_failed', handleErrors);

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socketRef.current.on('connect', () => {
                setSocketReady(true);
                socketRef.current.emit(ACTIONS.JOIN, {
                    roomId,
                    userName,
                    adminToken: adminTokenRef.current,
                });
            });

            // Listen for the server-issued admin ownership token.
            // This fires only for the admin — on room creation, reconnect, or admin transfer.
            socketRef.current.on(ACTIONS.ADMIN_TOKEN, ({ adminToken }) => {
                adminTokenRef.current = adminToken;
                try { sessionStorage.setItem(`collabce_adminToken_${roomId}`, adminToken); } catch (_) { /* quota */ }
            });

            const updateLocalPermissions = (updatedClients) => {
                const me = updatedClients.find(c => c.socketId === socketRef.current.id);
                if (me) { setCanWrite(me.canWrite); setIsAdmin(me.isAdmin); }
            };

            socketRef.current.on(ACTIONS.JOINED, ({ clients, userName: joinedUserName, socketId }) => {
                if (joinedUserName !== userName && socketId !== socketRef.current.id) {
                    toast.success(`${joinedUserName} joined the room.`);
                    setChatMessages(prev => [...prev, { id: uuid(), message: `${joinedUserName} joined the room`, isSystem: true, timestamp: new Date().toISOString() }]);
                }
                setClients(clients);
                updateLocalPermissions(clients);
            });

            socketRef.current.on(ACTIONS.PERMISSION_CHANGED, ({ clients }) => {
                setClients(clients);
                updateLocalPermissions(clients);
            });

            socketRef.current.on(ACTIONS.WRITE_ACCESS_REQUESTED, ({ requesterSocketId, userName, message }) => {
                toast((t) => (
                    <div>
                        <b>{userName}</b> requests write access.<br />
                        <i style={{ color: '#555' }}>"{message}"</i><br /><br />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => {
                                socketRef.current.emit(ACTIONS.APPROVE_CODE_EDIT, { roomId, requesterSocketId });
                                toast.dismiss(t.id);
                            }} style={{ background: '#50fa7b', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                                Approve
                            </button>
                            <button onClick={() => {
                                socketRef.current.emit(ACTIONS.DENY_CODE_EDIT, { roomId, requesterSocketId });
                                toast.dismiss(t.id);
                            }}
                                style={{ background: '#ff5555', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                                Deny
                            </button>
                        </div>
                    </div>
                ), { duration: 10000, position: 'top-center' });
            });

            socketRef.current.on(ACTIONS.APPROVE_CODE_EDIT, ({ canWrite }) => {
                if (canWrite !== undefined) setCanWrite(canWrite);
                toast.success('Your edit request was approved.');
            });

            socketRef.current.on(ACTIONS.DENY_CODE_EDIT, () => {
                toast.error('Your edit request was denied.');
            });

            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, userName }) => {
                toast.success(`${userName} left the room.`);
                setClients(prev => prev.filter(client => client.socketId !== socketId));
                setChatMessages(prev => [...prev, { id: uuid(), message: `${userName} left the room`, isSystem: true, timestamp: new Date().toISOString() }]);
            });

            // Show a toast when the server rejects an action due to insufficient permissions.
            // Uses a dedicated PERMISSION_DENIED event to avoid clashing with Socket.IO's
            // reserved 'error' event which may fire with different payload shapes.
            socketRef.current.on(ACTIONS.PERMISSION_DENIED, (payload) => {
                const message =
                    typeof payload === 'string'
                        ? payload
                        : payload && typeof payload === 'object' && 'message' in payload
                            ? payload.message
                            : 'Permission denied.';
                toast.error(message);
            });

            socketRef.current.on(ACTIONS.CHAT_RECEIVE, (payload) => {
                if (Array.isArray(payload)) {
                    setChatMessages(payload);
                } else {
                    setChatMessages(prev => {
                        if (prev.find(m => m.id === payload.id)) return prev;
                        return [...prev, payload];
                    });
                    if (activePanelRef.current !== 'chat') {
                        setUnreadChatCount(prev => prev + 1);
                    }
                }
            });

            socketRef.current.on(ACTIONS.ACTIVITY_RECEIVE, (payload) => {
                if (Array.isArray(payload)) {
                    setActivities(payload);
                } else {
                    setActivities(prev => {
                        if (prev.find(a => a.id === payload.id)) return prev;
                        return [...prev, payload];
                    });
                    if (activePanelRef.current !== 'activity') {
                        setUnreadActivityCount(prev => prev + 1);
                    }
                }
            });

            // File system sync
            socketRef.current.on(ACTIONS.FS_SYNC, ({ fileSystem: fs, fileContents }) => {
                if (fileContents && typeof fileContents === 'object') {
                    Object.entries(fileContents).forEach(([k, v]) => {
                        if (!(k in initialContentsRef.current)) {
                            initialContentsRef.current[k] = v;
                        }
                    });
                    Object.entries(fileContents).forEach(([k, v]) => {
                        fileContentsRef.current[k] = v;
                    });
                    setFileContentsSnapshot(prev => ({ ...prev, ...fileContents }));
                }
                setFileSystem(fs);

                // Compute next open files and active file outside of updaters
                // to avoid nesting setState calls inside functional updaters
                // (React Strict Mode double-invokes updaters to detect impurities).
                setOpenFiles(prev => {
                    const next = prev.filter(id => fs[id]);
                    if (next.length === 0) {
                        const root = fs['root'];
                        if (root && root.children && root.children.length > 0) {
                            const firstFileId = root.children.find(id => fs[id]?.type === 'file');
                            if (firstFileId) return [firstFileId];
                        }
                    }
                    return next;
                });

                // Update activeFileId separately — not nested inside setOpenFiles
                setActiveFileId(cur => {
                    if (cur && !fs[cur]) {
                        // Active file was deleted — pick the first surviving open file
                        // (openFiles state may not be updated yet, so scan fs directly)
                        const root = fs['root'];
                        if (root && root.children) {
                            const firstFile = root.children.find(id => fs[id]?.type === 'file');
                            if (firstFile) return firstFile;
                        }
                        return null;
                    }
                    // Auto-select first file if nothing is active
                    if (!cur) {
                        const root = fs['root'];
                        if (root && root.children) {
                            const firstFile = root.children.find(id => fs[id]?.type === 'file');
                            if (firstFile) return firstFile;
                        }
                    }
                    return cur;
                });
            });
        };
        init();
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off('connect');
                socketRef.current.off('connect_error');
                socketRef.current.off('connect_failed');
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.PERMISSION_CHANGED);
                socketRef.current.off(ACTIONS.WRITE_ACCESS_REQUESTED);
                socketRef.current.off(ACTIONS.APPROVE_CODE_EDIT);
                socketRef.current.off(ACTIONS.DENY_CODE_EDIT);
                socketRef.current.off(ACTIONS.FS_SYNC);
                socketRef.current.off(ACTIONS.PERMISSION_DENIED);
                socketRef.current.off(ACTIONS.ADMIN_TOKEN);
                socketRef.current.off(ACTIONS.CHAT_RECEIVE);
                socketRef.current.off(ACTIONS.ACTIVITY_RECEIVE);
            }
        };
    }, []);

    // ---- File system event handlers ----
    // Each handler checks canWrite before emitting to avoid sending events
    // that the server will reject, preventing false success states.
    const handleCreateNode = useCallback((node) => {
        if (!canWrite) { toast.error('You do not have write permission.'); return; }
        socketRef.current?.emit(ACTIONS.FS_CREATE_NODE, { roomId, node });
    }, [roomId, canWrite]);

    const handleChatSend = useCallback((message) => {
        if (!socketRef.current) return;
        socketRef.current.emit(ACTIONS.CHAT_SEND, { roomId, message });
    }, [roomId]);

    const handleDeleteNode = useCallback((nodeId) => {
        if (!canWrite) { toast.error('You do not have write permission.'); return; }
        // Do NOT optimistically close the tab — wait for the FS_SYNC broadcast
        // to confirm the deletion, preventing stale UI if the server rejects.
        socketRef.current?.emit(ACTIONS.FS_DELETE_NODE, { roomId, nodeId });
    }, [roomId, canWrite]);

    const handleRenameNode = useCallback((nodeId, newName) => {
        if (!canWrite) { toast.error('You do not have write permission.'); return; }
        socketRef.current?.emit(ACTIONS.FS_RENAME_NODE, { roomId, nodeId, newName });
    }, [roomId, canWrite]);

    const handleFileClick = useCallback((fileId) => {
        setActiveFileId(fileId);
        setOpenFiles(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
        if (window.innerWidth <= MOBILE_BREAKPOINT) {
            setActivePanel('none');
        }
    }, []);

    const handleTabClose = useCallback((fileId) => {
        setOpenFiles(prev => {
            const next = prev.filter(id => id !== fileId);
            setActiveFileId(cur => {
                if (cur !== fileId) return cur;
                if (next.length === 0) return null;
                const idx = prev.indexOf(fileId);
                return next[Math.max(0, idx - 1)];
            });
            return next;
        });
    }, []);

    const handleCodeChange = useCallback((fileId, value) => {
        fileContentsRef.current[fileId] = value;
        setFileContentsSnapshot(prev => ({ ...prev, [fileId]: value }));
    }, []);

    const handleEditorReady = useCallback((fileId, editorInstance) => {
        editorsRef.current[fileId] = editorInstance;
    }, []);

    const handleRun = useCallback(() => {
        if (!activeFileId) return;
        const activeFile = fileSystem[activeFileId];
        if (!activeFile) return;
        
        if (isImage(activeFile.name)) {
            toast.error('Image files cannot be executed');
            return;
        }

        const editor = editorsRef.current[activeFileId];
        const code = editor?.getValue?.() ?? fileContentsRef.current[activeFileId] ?? "";
        setConsoleOpen(true);
        run(code, getModeFromFilename(activeFile.name), activeFile.name);
    }, [activeFileId, fileSystem, run]);

    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!isRunning && activeFileId) handleRun();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleRun, isRunning, activeFileId]);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied!');
        } catch (err) {
            toast.error('Could not copy Room ID');
        } finally {
            // Revert active icon after a short delay
            setTimeout(() => {
                setActivePanel(lastPersistentPanel);
            }, 1000);
        }
    }

    function leaveRoom() { setShowLeaveModal(true); }

    function handleLeaveAnyway() {
        setShowLeaveModal(false);
        reactNavigator('/');
    }

    async function handleSaveLeave() {
        // Download first, then navigate away
        const contents = { ...fileContentsRef.current };
        for (const [fileId, editor] of Object.entries(editorsRef.current)) {
            if (editor && editor.getValue) contents[fileId] = editor.getValue();
        }
        try {
            await downloadProject(fileSystem, contents);
            toast.success('Project downloaded!');
        } catch (err) {
            console.error('Download failed:', err);
            toast.error('Download failed.');
        }
        setShowLeaveModal(false);
        reactNavigator('/');
    }

    function togglePermission(targetSocketId, currentCanWrite) {
        if (!isAdmin) return;
        socketRef.current.emit(ACTIONS.TOGGLE_PERMISSION, { roomId, targetSocketId, canWrite: !currentCanWrite });
    }

    function requestWriteAccess() {
        setShowRequestAccessModal(true);
    }

    function handleSendWriteAccessRequest(message) {
        if (message) {
            socketRef.current.emit(ACTIONS.REQUEST_WRITE_ACCESS, { roomId, message, userName });
            toast.success('Request sent to admin!');
            setShowRequestAccessModal(false);
        }
    }

    async function handleDownload() {
        setShowConfirmDownload(false);
        const contents = { ...fileContentsRef.current };
        for (const [fileId, editor] of Object.entries(editorsRef.current)) {
            if (editor && editor.getValue) contents[fileId] = editor.getValue();
        }
        if (!fileSystem || !fileSystem['root']) {
            toast.error('File system not ready. Please try again.');
            // Revert active icon
            setTimeout(() => {
                setActivePanel(lastPersistentPanel);
            }, 1000);
            return;
        }

        try {
            await downloadProject(fileSystem, contents);
            toast.success('Project downloaded!');
        } catch (err) {
            console.error('Download failed:', err);
            toast.error('Download failed. Please try again.');
        } finally {
            // Revert active icon
            setTimeout(() => {
                setActivePanel(lastPersistentPanel);
            }, 1000);
        }
    }

    // ---- Upload handler ----

    async function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                if (e.target.result) {
                    resolve(e.target.result);
                } else {
                    reject(new Error('File reader returned empty result'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file as data URL'));
            reader.readAsDataURL(file);
        });
    }

    async function readFileAsText(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = () => resolve('');
            reader.readAsText(file);
        });
    }

    async function handleUploadFiles(e) {
        const files = Array.from(e.target.files || []);
        if (!files.length) {
            setActivePanel(lastPersistentPanel);
            return;
        }
        e.target.value = '';

        // Defensive client-side guard — server also enforces this
        if (!canWrite) {
            toast.error('You do not have permission to upload files.');
            setActivePanel(lastPersistentPanel);
            return;
        }

        const isFolder = files[0].webkitRelativePath && files[0].webkitRelativePath.includes('/');

        // Build a path→nodeId map to avoid duplicate folder creation
        const pathToId = {};
        const nodesToCreate = [];

        const ensureFolder = (pathParts, parentId) => {
            let currentParentId = parentId;
            let builtPath = '';
            for (const part of pathParts) {
                builtPath = builtPath ? `${builtPath}/${part}` : part;
                if (!pathToId[builtPath]) {
                    const folderId = uuid();
                    pathToId[builtPath] = folderId;
                    nodesToCreate.push({ id: folderId, name: part, type: 'folder', parentId: currentParentId, children: [] });
                }
                currentParentId = pathToId[builtPath];
            }
            return currentParentId;
        };

        const fileReadPromises = files.map(async (file) => {
            let parentId = 'root';
            if (isFolder && file.webkitRelativePath) {
                const parts = file.webkitRelativePath.split('/');
                // parts[0] is the root folder name, skip it — everything goes under 'root'
                const folderParts = parts.slice(1, -1); // intermediate folders
                if (folderParts.length > 0) {
                    parentId = ensureFolder(folderParts, 'root');
                }
            }

            // Read content first so we can check its byte length against the server-side limit.
            // Checking content.length (text/base64 string) aligns with the server's Buffer.byteLength
            // validation, avoiding the ~33% mismatch that would occur when comparing file.size
            // against the base64-encoded data URL size for images.
            let content;
            if (isImage(file.name)) {
                try {
                    content = await readFileAsDataURL(file);
                } catch (err) {
                    console.error("Failed to read image data URL for", file.name, err);
                    content = '';
                }
            } else if (isBinary(file.name)) {
                // Non-image binary files: add node to tree without content
                const fileId = uuid();
                nodesToCreate.push({ id: fileId, name: file.name, type: 'file', parentId });
                return null;
            } else {
                content = await readFileAsText(file);
            }

            // Align with server-side validation: check the byte length of the transmitted content
            if (content && content.length > 1 * 1024 * 1024) {
                toast.error(`${file.name} exceeds the 1MB size limit.`);
                return null;
            }

            const fileId = uuid();
            nodesToCreate.push({ id: fileId, name: file.name, type: 'file', parentId });

            return { fileId, content: content || '' };
        });

        const results = (await Promise.all(fileReadPromises)).filter(Boolean);

        // Build fileContents map: { fileId -> textContent }
        const fileContents = {};
        for (const { fileId, content } of results) {
            fileContents[fileId] = content;
            initialContentsRef.current[fileId] = content;
        }

        // Count all file nodes (including binary files that were skipped for content reading).
        const fileCount = nodesToCreate.filter(n => n.type === 'file').length;
        const folderNodes = nodesToCreate.filter(n => n.type === 'folder').length;
        socketRef.current?.emit(ACTIONS.FS_UPLOAD_BATCH, { roomId, nodes: nodesToCreate, fileContents }, ({ success, message }) => {
            if (success) {
                toast.success(`Uploaded ${fileCount} file${fileCount !== 1 ? 's' : ''}${folderNodes ? ` in ${folderNodes} folder${folderNodes !== 1 ? 's' : ''}` : ''}`);
            } else {
                toast.error(message || 'Upload failed.');
                results.forEach(({ fileId }) => { delete initialContentsRef.current[fileId]; });
            }
        });
        setActivePanel(lastPersistentPanel);
    }

    if (!userName) return <Navigate to="/" />;

    const activeFile = activeFileId ? fileSystem[activeFileId] : null;

    return (
        <div className="app-container">
            {/* ── Top Navbar (Reverted to Edge-to-Edge Layout) ── */}
            <div className="top-navbar">
                <div className="top-navbar-left">
                    <Monitor size={16} className="navbar-room-icon" />
                    <span className="navbar-room-name" title={roomId}>Room: {roomId}</span>
                    {activeFile && (
                        <>
                            <ChevronRight size={14} className="navbar-separator" />
                            <span className="navbar-file-name" title={activeFile.name}>{activeFile.name}</span>
                        </>
                    )}
                </div>
                <div className="top-navbar-right">
                    <button className="navbar-icon-btn" onClick={toggleTheme} title="Toggle Theme">
                        {theme === 'light' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                    {/* Run button */}
                    {activeFileId && (
                        <button
                            className={`navbar-run-btn${isRunning ? ' running' : ''}`}
                            onClick={handleRun}
                            disabled={isRunning || isImage(activeFile?.name)}
                            title={isImage(activeFile?.name) ? 'Image files cannot be executed' : isRunning ? 'Running…' : 'Run code (Ctrl+Enter)'}
                        >
                            {isRunning ? (
                                <><span className="run-btn-spinner" /><span>Running…</span></>
                            ) : (
                                <><svg className="run-btn-play" viewBox="0 0 16 16" fill="currentColor" width="12" height="12"><path d="M3.5 2.5a.5.5 0 0 1 .757-.429l9 5.5a.5.5 0 0 1 0 .858l-9 5.5A.5.5 0 0 1 3.5 13.5v-11z" /></svg><span>Run</span></>
                            )}
                        </button>
                    )}
                    {/* Console toggle */}
                    <button
                        className={`navbar-icon-btn${consoleOpen ? ' navbar-icon-btn--active' : ''}`}
                        onClick={() => setConsoleOpen(prev => !prev)}
                        title={consoleOpen ? 'Hide Console' : 'Show Console'}
                    >
                        <Terminal size={15} />
                    </button>
                    <button className="navbar-leave-btn" onClick={leaveRoom}>
                        <LogOut size={14} strokeWidth={2.5} />
                        <span className="navbar-leave-label">Leave Room</span>
                    </button>
                </div>
            </div>

            <div className="mainWrap">
                {/* ── Activity Bar (icon strip) ── */}
                <div className="activity-bar">
                    <div className="activity-bar-top">
                        <div className="activity-logo">
                            <span className="logo-collab">C</span><span className="logo-ce">E</span>
                        </div>
                        <button
                            className={`activity-btn ${activePanel === 'explorer' ? 'activity-btn--active' : ''}`}
                            onClick={() => {
                                const next = activePanel === 'explorer' ? 'none' : 'explorer';
                                setActivePanel(next);
                                if (next !== 'none') setLastPersistentPanel(next);
                            }}
                            title="Explorer"
                        >
                            <FolderOpen size={22} strokeWidth={1.5} />
                        </button>
                        <button
                            className={`activity-btn ${activePanel === 'users' ? 'activity-btn--active' : ''}`}
                            onClick={() => {
                                const next = activePanel === 'users' ? 'none' : 'users';
                                setActivePanel(next);
                                if (next !== 'none') setLastPersistentPanel(next);
                            }}
                            title={`Connected Users (${clients.length})`}
                        >
                            <Users size={22} strokeWidth={1.5} />
                            {clients.length > 0 && <span className="activity-badge">{clients.length}</span>}
                        </button>
                        <button
                            className={`activity-btn ${activePanel === 'chat' ? 'activity-btn--active' : ''}`}
                            onClick={() => {
                                const next = activePanel === 'chat' ? 'none' : 'chat';
                                setActivePanel(next);
                                if (next !== 'none') setLastPersistentPanel(next);
                            }}
                            title="Group Chat"
                        >
                            <MessageSquare size={22} strokeWidth={1.5} />
                            {unreadChatCount > 0 && activePanel !== 'chat' && (
                                <span className="activity-badge chat-unread-badge">{unreadChatCount}</span>
                            )}
                        </button>
                        <button
                            className={`activity-btn ${activePanel === 'activity' ? 'activity-btn--active' : ''}`}
                            onClick={() => {
                                const next = activePanel === 'activity' ? 'none' : 'activity';
                                setActivePanel(next);
                                if (next !== 'none') setLastPersistentPanel(next);
                            }}
                            title="Activity Feed"
                        >
                            <Activity size={22} strokeWidth={1.5} />
                            {unreadActivityCount > 0 && activePanel !== 'activity' && (
                                <span className="activity-badge chat-unread-badge activity-unread-badge">{unreadActivityCount}</span>
                            )}
                        </button>
                    </div>

                    <div className="activity-bar-bottom">
                        {canWrite && (
                            <>
                                <button 
                                    className={`activity-btn ${activePanel === 'upload' ? 'activity-btn--active' : ''}`} 
                                    onClick={() => {
                                        setActivePanel('upload');
                                        uploadFileInputRef.current?.click();
                                        // Reset after a delay or on focus (if picker cancelled)
                                        const reset = () => {
                                            setTimeout(() => setActivePanel(lastPersistentPanel), 1000);
                                            window.removeEventListener('focus', reset);
                                        };
                                        window.addEventListener('focus', reset);
                                    }} 
                                    title="Upload File(s)"
                                >
                                    <Upload size={22} strokeWidth={1.5} />
                                </button>
                                <button 
                                    className={`activity-btn ${activePanel === 'files' ? 'activity-btn--active' : ''}`} 
                                    onClick={() => {
                                        setActivePanel('files');
                                        uploadFolderInputRef.current?.click();
                                        const reset = () => {
                                            setTimeout(() => setActivePanel(lastPersistentPanel), 1000);
                                            window.removeEventListener('focus', reset);
                                        };
                                        window.addEventListener('focus', reset);
                                    }} 
                                    title="Upload Folder"
                                >
                                    <FolderUp size={22} strokeWidth={1.5} />
                                </button>
                            </>
                        )}
                        <button 
                            className={`activity-btn ${activePanel === 'share' ? 'activity-btn--active' : ''}`} 
                            onClick={() => {
                                setActivePanel('share');
                                setShowInvite(true);
                            }} 
                            title="Invite Friends"
                        >
                            <UserPlus size={22} strokeWidth={1.5} />
                        </button>
                        <button 
                            className={`activity-btn ${activePanel === 'secrets' ? 'activity-btn--active' : ''}`} 
                            onClick={() => {
                                setActivePanel('secrets');
                                copyRoomId();
                            }} 
                            title="Copy Room ID"
                        >
                            <KeyRound size={22} strokeWidth={1.5} />
                        </button>
                        <button 
                            className={`activity-btn ${activePanel === 'save' ? 'activity-btn--active' : ''}`} 
                            onClick={() => {
                                setActivePanel('save');
                                setShowConfirmDownload(true);
                            }} 
                            title="Save Project"
                        >
                            <Save size={22} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* ── Side Panel ── */}
                {['explorer', 'users', 'chat', 'activity'].includes(activePanel) && (
                    <>
                        {isMobileViewport && (
                            <button
                                type="button"
                                className="mobile-side-overlay"
                                onClick={() => setActivePanel('none')}
                                aria-label="Close sidebar"
                            />
                        )}
                        <div
                            className={`side-panel${isMobileViewport ? ' side-panel--mobile' : ''}`}
                            style={isMobileViewport ? undefined : { width: `${sideWidth}px`, minWidth: `${sideWidth}px` }}
                        >
                            {activePanel === 'explorer' && (
                                <>
                                <div className="panel-header">
                                    <span className="panel-title">
                                        <FolderOpen size={13} className="panel-title-icon" />
                                        EXPLORER
                                    </span>
                                    {canWrite && (
                                        <div className="panel-header-actions">
                                            <button className="panel-header-btn" onClick={() => uploadFileInputRef.current?.click()} title="Upload file(s)">
                                                <Upload size={11} /> File
                                            </button>
                                            <button className="panel-header-btn" onClick={() => uploadFolderInputRef.current?.click()} title="Upload folder">
                                                <FolderUp size={11} /> Folder
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="panel-body">
                                    <FileExplorer
                                        fileSystem={fileSystem}
                                        activeFileId={activeFileId}
                                        onFileClick={handleFileClick}
                                        onCreateNode={handleCreateNode}
                                        onDeleteNode={handleDeleteNode}
                                        onRenameNode={handleRenameNode}
                                        canWrite={canWrite}
                                        hideTitle
                                    />
                                </div>
                            </>
                        )}
                        {activePanel === 'users' && (
                            <>
                                <div className="panel-header">
                                    <span className="panel-title">
                                        <Users size={13} className="panel-title-icon" />
                                        CONNECTED {isAdmin ? <span className="panel-admin-tag">Admin</span> : ''}
                                    </span>
                                </div>
                                <div className="panel-body">
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
                            </>
                        )}
                        {activePanel === 'chat' && (
                            <ChatPanel
                                socketRef={socketRef}
                                roomId={roomId}
                                userName={userName}
                                messages={chatMessages}
                                onSendMessage={handleChatSend}
                            />
                        )}
                        {activePanel === 'activity' && (
                            <ActivityPanel activities={activities} />
                        )}
                    </div>
                    {!isMobileViewport && <div className="resizer" onMouseDown={startResizing} />}
                </>
                )}

                {/* ── Main Editor Area ── */}
                <div className="editorWrap">

                    {/* File tabs */}
                    <FileTabs
                        openFiles={openFiles}
                        fileSystem={fileSystem}
                        activeFileId={activeFileId}
                        onTabClick={handleFileClick}
                        onTabClose={handleTabClose}
                    />

                    {/* Editor — flex:1 fills space above console */}
                    <div className="editor-stage">
                        {socketReady && activeFileId && activeFile ? (
                            <Editor
                                key={activeFileId}
                                socketRef={socketRef}
                                roomId={roomId}
                                fileId={activeFileId}
                                fileName={activeFile.name}
                                onCodeChange={handleCodeChange}
                                onEditorReady={handleEditorReady}
                                userName={userName}
                                canWrite={canWrite}
                                editorTheme={theme === 'light' ? 'eclipse' : 'dracula'}
                                initialContent={initialContentsRef.current[activeFileId] || ''}
                                fileContentsSnapshot={fileContentsSnapshot}
                            />
                        ) : (
                            <div className="editor-empty">
                                <div className="editor-empty-inner">
                                    <div className="editor-empty-logo">
                                        <span className="logo-collab">Collab</span><span className="logo-ce">CE</span>
                                    </div>
                                    <p>Select a file from the explorer to start editing</p>
                                    {canWrite && <p className="editor-empty-hint">Use + buttons in the explorer to create files &amp; folders</p>}
                                </div>
                            </div>
                        )}

                        {!canWrite && activeFileId && (
                            <div className="readonly-badge">Read-Only Mode</div>
                        )}
                    </div>

                    {/* VirtualConsole — controlled entirely by consoleOpen state */}
                    <VirtualConsole
                        logs={consoleLogs}
                        isRunning={isRunning}
                        onClear={clearLogs}
                        open={consoleOpen}
                        setOpen={setConsoleOpen}
                    />
                </div>
            </div>

            {showInvite && (
                <InviteModal 
                    roomId={roomId} 
                    onClose={() => {
                        setShowInvite(false);
                        setActivePanel(lastPersistentPanel);
                    }} 
                />
            )}

            <LeaveRoomModal
                isOpen={showLeaveModal}
                onClose={() => setShowLeaveModal(false)}
                onLeaveAnyway={handleLeaveAnyway}
                onSaveLeave={handleSaveLeave}
            />

            {showConfirmDownload && (
                <ConfirmModal
                    isOpen={showConfirmDownload}
                    title="Confirm Download"
                    message="Do you want to download this project?"
                    onConfirm={handleDownload}
                    onClose={() => {
                        setShowConfirmDownload(false);
                        setActivePanel(lastPersistentPanel);
                    }}
                />
            )}

            <RequestAccessModal
                isOpen={showRequestAccessModal}
                onClose={() => setShowRequestAccessModal(false)}
                onSubmit={handleSendWriteAccessRequest}
            />

            {/* Hidden file inputs for upload */}
            <input
                ref={uploadFileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleUploadFiles}
            />
            <input
                ref={uploadFolderInputRef}
                type="file"
                multiple
                webkitdirectory=""
                directory=""
                style={{ display: 'none' }}
                onChange={handleUploadFiles}
            />
        </div>
    );
};

export default EditorPage;
