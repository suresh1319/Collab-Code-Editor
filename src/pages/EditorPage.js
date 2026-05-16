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
} from 'lucide-react';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import FileExplorer from '../components/FileExplorer';
import FileTabs from '../components/FileTabs';
import InviteModal from '../components/InviteModal';
import ConfirmModal from '../components/ConfirmModal';
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
    const [showConfirmDownload, setShowConfirmDownload] = useState(false);
    const [activePanel, setActivePanel] = useState('explorer'); // 'explorer' | 'users' | 'upload' | 'share' | etc.
    const [lastPersistentPanel, setLastPersistentPanel] = useState('explorer');

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

            // File system sync
            socketRef.current.on(ACTIONS.FS_SYNC, ({ fileSystem: fs, fileContents }) => {
                if (fileContents && typeof fileContents === 'object') {
                    Object.entries(fileContents).forEach(([k, v]) => {
                        if (!(k in initialContentsRef.current)) {
                            initialContentsRef.current[k] = v;
                        }
                    });
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
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.PERMISSION_CHANGED);
                socketRef.current.off(ACTIONS.WRITE_ACCESS_REQUESTED);
                socketRef.current.off(ACTIONS.FS_SYNC);
                socketRef.current.off(ACTIONS.PERMISSION_DENIED);
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
        } finally {
            // Revert active icon after a short delay
            setTimeout(() => {
                setActivePanel(lastPersistentPanel);
            }, 1000);
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
        setShowConfirmDownload(false);
        const contents = { ...fileContentsRef.current };
        for (const [fileId, editor] of Object.entries(editorsRef.current)) {
            if (editor && editor.getValue) contents[fileId] = editor.getValue();
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
        if (!files.length) {
            setActivePanel(lastPersistentPanel);
            return;
        }
        e.target.value = '';

        // Client-side permission guard — prevents emitting FS_CREATE_NODE unconditionally
        // and showing a false success toast when the server would reject the operation.
        if (!canWrite) {
            toast.error('You do not have write permission in this room.');
        // Defensive client-side guard — server also enforces this
        if (!canWrite) {
            toast.error('You do not have permission to upload files.');
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

            const fileId = uuid();
            // Always add the node so binary files appear in the file tree
            nodesToCreate.push({ id: fileId, name: file.name, type: 'file', parentId });

            // Skip content reading for binary files — their node is still created
            if (isBinary(file.name)) return null;
            const content = await readFileAsText(file);
            return { fileId, content };
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

    if (!location.state) return <Navigate to="/" />;

    const activeFile = activeFileId ? fileSystem[activeFileId] : null;

    return (
        <div className="app-container">
            {/* ── Top Navbar ── */}
            <div className="top-navbar">
                <div className="top-navbar-left">
                    <Monitor size={16} className="navbar-room-icon" />
                    <span className="navbar-room-name">Room: {roomId}</span>
                    {activeFile && (
                        <>
                            <ChevronRight size={14} className="navbar-separator" />
                            <span className="navbar-file-name">{activeFile.name}</span>
                        </>
                    )}
                </div>
                <div className="top-navbar-right">
                    <button className="navbar-icon-btn" onClick={toggleTheme} title="Toggle Theme">
                        {theme === 'light' ? <Sun size={15} /> : <Moon size={15} />}
                    </button>
                    <button className="navbar-leave-btn" onClick={leaveRoom}>
                        <LogOut size={14} strokeWidth={2.5} />
                        <span>Leave Room</span>
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
                                setActivePanel('explorer');
                                setLastPersistentPanel('explorer');
                            }}
                            title="Explorer"
                        >
                            <FolderOpen size={22} strokeWidth={1.5} />
                        </button>
                        <button
                            className={`activity-btn ${activePanel === 'users' ? 'activity-btn--active' : ''}`}
                            onClick={() => {
                                setActivePanel('users');
                                setLastPersistentPanel('users');
                            }}
                            title={`Connected Users (${clients.length})`}
                        >
                            <Users size={22} strokeWidth={1.5} />
                            {clients.length > 0 && <span className="activity-badge">{clients.length}</span>}
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
                            <MessageSquare size={22} strokeWidth={1.5} />
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
                {['explorer', 'users'].includes(activePanel) && (
                    <div className="side-panel">
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
                                {canWrite && <p className="editor-empty-hint">Use + buttons in the explorer to create files &amp; folders</p>}
                            </div>
                        </div>
                    )}

                    {!canWrite && activeFileId && (
                        <div className="readonly-badge">Read-Only Mode</div>
                    )}
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
