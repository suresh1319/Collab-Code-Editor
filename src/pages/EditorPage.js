import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import FileExplorer from '../components/FileExplorer';
import FileTabs from '../components/FileTabs';
import InviteModal from '../components/InviteModal';
import { initSocket } from '../socket';
import { downloadProject } from '../utils/downloadProject';
import { v4 as uuid } from 'uuid';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [showInvite, setShowInvite] = useState(false);
    const [activePanel, setActivePanel] = useState('explorer'); // 'explorer' | 'users' | null

    useEffect(() => {
        if (theme === 'light') {
            document.body.setAttribute('data-theme', 'light');
        } else {
            document.body.removeAttribute('data-theme');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    const socketRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();

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
    const editorsRef = useRef({});
    const initialContentsRef = useRef({}); // fileId → string (for uploads)
    const uploadFileInputRef = useRef(null);
    const uploadFolderInputRef = useRef(null);

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
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
                    userName: location.state?.userName,
                });
            });

            const updateLocalPermissions = (updatedClients) => {
                const me = updatedClients.find(c => c.socketId === socketRef.current.id);
                if (me) { setCanWrite(me.canWrite); setIsAdmin(me.isAdmin); }
            };

            socketRef.current.on(ACTIONS.JOINED, ({ clients, userName, socketId }) => {
                if (userName !== location.state?.userName && socketId !== socketRef.current.id) {
                    toast.success(`${userName} joined the room.`);
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
                                socketRef.current.emit(ACTIONS.TOGGLE_PERMISSION, { roomId, targetSocketId: requesterSocketId, canWrite: true });
                                toast.dismiss(t.id);
                            }} style={{ background: '#50fa7b', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                                Approve
                            </button>
                            <button onClick={() => toast.dismiss(t.id)}
                                style={{ background: '#ff5555', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                                Deny
                            </button>
                        </div>
                    </div>
                ), { duration: 10000, position: 'top-center' });
            });

            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, userName }) => {
                toast.success(`${userName} left the room.`);
                setClients(prev => prev.filter(client => client.socketId !== socketId));
            });

            // File system sync
            socketRef.current.on(ACTIONS.FS_SYNC, ({ fileSystem: fs }) => {
                setFileSystem(fs);
                // Auto-open the first file if none open
                setOpenFiles(prev => {
                    if (prev.length === 0) {
                        const root = fs['root'];
                        if (root && root.children && root.children.length > 0) {
                            const firstFileId = root.children.find(id => fs[id]?.type === 'file');
                            if (firstFileId) {
                                setActiveFileId(firstFileId);
                                return [firstFileId];
                            }
                        }
                    }
                    return prev;
                });
            });
        };
        init();
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.PERMISSION_CHANGED);
                socketRef.current.off(ACTIONS.WRITE_ACCESS_REQUESTED);
                socketRef.current.off(ACTIONS.FS_SYNC);
            }
        };
    }, []);

    // ---- File system event handlers ----
    const handleCreateNode = useCallback((node) => {
        socketRef.current?.emit(ACTIONS.FS_CREATE_NODE, { roomId, node });
    }, [roomId]);

    const handleDeleteNode = useCallback((nodeId) => {
        // Close tab if open
        setOpenFiles(prev => prev.filter(id => id !== nodeId));
        setActiveFileId(prev => prev === nodeId ? null : prev);
        socketRef.current?.emit(ACTIONS.FS_DELETE_NODE, { roomId, nodeId });
    }, [roomId]);

    const handleRenameNode = useCallback((nodeId, newName) => {
        socketRef.current?.emit(ACTIONS.FS_RENAME_NODE, { roomId, nodeId, newName });
    }, [roomId]);

    const handleFileClick = useCallback((fileId) => {
        setActiveFileId(fileId);
        setOpenFiles(prev => prev.includes(fileId) ? prev : [...prev, fileId]);
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
    }, []);

    const handleEditorReady = useCallback((fileId, editorInstance) => {
        editorsRef.current[fileId] = editorInstance;
    }, []);

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID copied!');
        } catch (err) {
            toast.error('Could not copy Room ID');
        }
    }

    function leaveRoom() { reactNavigator('/'); }

    function togglePermission(targetSocketId, currentCanWrite) {
        if (!isAdmin) return;
        socketRef.current.emit(ACTIONS.TOGGLE_PERMISSION, { roomId, targetSocketId, canWrite: !currentCanWrite });
    }

    function requestWriteAccess() {
        const message = prompt('Enter a message for the admin:');
        if (message) {
            socketRef.current.emit(ACTIONS.REQUEST_WRITE_ACCESS, { roomId, message, userName: location.state?.userName });
            toast.success('Request sent to admin!');
        }
    }

    async function handleDownload() {
        const contents = { ...fileContentsRef.current };
        for (const [fileId, editor] of Object.entries(editorsRef.current)) {
            if (editor && editor.getValue) contents[fileId] = editor.getValue();
        }
        await downloadProject(fileSystem, contents);
        toast.success('Project downloaded!');
    }

    // ---- Upload handler ----
    const BINARY_EXTS = new Set(['png','jpg','jpeg','gif','svg','ico','webp','mp4','mp3','woff','woff2','ttf','eot','pdf','zip']);
    function isBinary(name) {
        const ext = name.split('.').pop().toLowerCase();
        return BINARY_EXTS.has(ext);
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
        if (!files.length) return;
        e.target.value = '';

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
            if (isBinary(file.name)) return null;
            const content = await readFileAsText(file);

            let parentId = 'root';
            if (isFolder && file.webkitRelativePath) {
                const parts = file.webkitRelativePath.split('/');
                // parts[0] is the root folder name, skip it — everything goes under 'root'
                const folderParts = parts.slice(1, -1); // intermediate folders
                if (folderParts.length > 0) {
                    parentId = ensureFolder(folderParts, 'root');
                }
            }

            const fileId = uuid();
            nodesToCreate.push({ id: fileId, name: file.name, type: 'file', parentId });
            return { fileId, content };
        });

        const results = (await Promise.all(fileReadPromises)).filter(Boolean);

        // Emit all creates in dependency order (folders first)
        for (const node of nodesToCreate) {
            socketRef.current?.emit(ACTIONS.FS_CREATE_NODE, { roomId, node });
        }

        // Store initial contents for injection when editor opens
        for (const { fileId, content } of results) {
            initialContentsRef.current[fileId] = content;
        }

        const fileCount = results.length;
        const folderNodes = nodesToCreate.filter(n => n.type === 'folder').length;
        toast.success(`Uploaded ${fileCount} file${fileCount !== 1 ? 's' : ''}${folderNodes ? ` in ${folderNodes} folder${folderNodes !== 1 ? 's' : ''}` : ''}`);
    }

    if (!location.state) return <Navigate to="/" />;

    const activeFile = activeFileId ? fileSystem[activeFileId] : null;

    return (
        <>
            <div className="mainWrap">
                {/* ── Activity Bar (icon strip) ── */}
                <div className="activity-bar">
                    <div className="activity-bar-top">
                        <div className="activity-logo">
                            <span className="logo-collab">C</span><span className="logo-ce">E</span>
                        </div>
                        <button
                            className={`activity-btn ${activePanel === 'explorer' ? 'activity-btn--active' : ''}`}
                            onClick={() => setActivePanel(p => p === 'explorer' ? null : 'explorer')}
                            title="Explorer"
                        >
                            📁
                        </button>
                        <button
                            className={`activity-btn ${activePanel === 'users' ? 'activity-btn--active' : ''}`}
                            onClick={() => setActivePanel(p => p === 'users' ? null : 'users')}
                            title={`Connected Users (${clients.length})`}
                        >
                            <span className="activity-btn-icon">👥</span>
                            {clients.length > 0 && <span className="activity-badge">{clients.length}</span>}
                        </button>
                    </div>
                    <div className="activity-bar-bottom">
                        <button className="activity-btn" onClick={() => uploadFileInputRef.current?.click()} title="Upload File(s)">
                            ⬆️
                        </button>
                        <button className="activity-btn" onClick={() => uploadFolderInputRef.current?.click()} title="Upload Folder">
                            🗂️
                        </button>
                        <button className="activity-btn" onClick={() => setShowInvite(true)} title="Invite Friends">
                            📨
                        </button>
                        <button className="activity-btn" onClick={copyRoomId} title="Copy Room ID">
                            🔑
                        </button>
                        <button className="activity-btn" onClick={handleDownload} title="Download Project">
                            💾
                        </button>
                    </div>
                </div>

                {/* ── Side Panel ── */}
                {activePanel && (
                    <div className="side-panel">
                        {activePanel === 'explorer' && (
                            <>
                                <div className="panel-header">
                                    <span className="panel-title">📁 EXPLORER</span>
                                    {canWrite && (
                                        <div className="panel-header-actions">
                                            <button className="panel-header-btn" onClick={() => uploadFileInputRef.current?.click()} title="Upload file(s)">📤 File</button>
                                            <button className="panel-header-btn" onClick={() => uploadFolderInputRef.current?.click()} title="Upload folder">📂 Folder</button>
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
                                    <span className="panel-title">👥 CONNECTED {isAdmin ? <span className="panel-admin-tag">Admin</span> : ''}</span>
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
                    </div>
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

                    {/* Editor */}
                    {socketReady && activeFileId && activeFile ? (
                        <Editor
                            key={activeFileId}
                            socketRef={socketRef}
                            roomId={roomId}
                            fileId={activeFileId}
                            fileName={activeFile.name}
                            onCodeChange={handleCodeChange}
                            onEditorReady={handleEditorReady}
                            userName={location.state?.userName}
                            canWrite={canWrite}
                            editorTheme={theme === 'light' ? 'eclipse' : 'dracula'}
                            initialContent={initialContentsRef.current[activeFileId] || ''}
                        />
                    ) : (
                        <div className="editor-empty">
                            <div className="editor-empty-inner">
                                <div className="editor-empty-logo">
                                    <span className="logo-collab">Collab</span><span className="logo-ce">CE</span>
                                </div>
                                <p>Select a file from the explorer to start editing</p>
                                {canWrite && <p className="editor-empty-hint">Use + buttons in the explorer to create files & folders</p>}
                            </div>
                        </div>
                    )}

                    {!canWrite && activeFileId && (
                        <div className="readonly-badge">Read-Only Mode</div>
                    )}
                </div>
            </div>

            {showInvite && <InviteModal roomId={roomId} onClose={() => setShowInvite(false)} />}

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

            <div className="top-right-bar">
                <button className="theme-toggle-fixed" onClick={toggleTheme} title="Toggle Theme">
                    <span className="toggle-track"><span className="toggle-thumb"></span></span>
                    <span className="toggle-label">{theme === 'light' ? '☀️ Light' : '🌙 Dark'}</span>
                </button>
                <button className="btn leaveBtn leave-fixed" onClick={leaveRoom}>🚪 Leave</button>
            </div>
        </>
    );
};

export default EditorPage;
