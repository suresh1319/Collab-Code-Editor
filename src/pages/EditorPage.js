import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
    FolderOpen,
    Users,
    Upload,
    FolderUp,
    Download,
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
import { downloadProject } from '../utils/downloadProject';
import { initSocket } from '../socket';
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
    const [sideWidth, setSideWidth] = useState(() => {
        const saved = localStorage.getItem('sideWidth');
        return saved ? Number(saved) : 260;
    });
    const resizingRef = useRef(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef(260);
    const MIN_SIDE_WIDTH = 180;
    const MAX_SIDE_WIDTH = 520;

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

    const [clients, setClients] = useState([]);
    const [socketReady, setSocketReady] = useState(false);
    const [canWrite, setCanWrite] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // File system state
    const [fileSystem, setFileSystem] = useState({});
    const [openFiles, setOpenFiles] = useState([]);
    const [activeFileId, setActiveFileId] = useState(null);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showConfirmDownload, setShowConfirmDownload] = useState(false);

    // Track file contents for download
    const fileContentsRef = useRef({});
    const [fileContentsSnapshot, setFileContentsSnapshot] = useState({});
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

            socketRef.current.on(ACTIONS.APPROVE_CODE_EDIT, () => {
                toast.success('Your edit request was approved.');
            });

            socketRef.current.on(ACTIONS.DENY_CODE_EDIT, () => {
                toast.error('Your edit request was denied.');
            });

            socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, userName }) => {
                toast.success(`${userName} left the room.`);
                setClients(prev => prev.filter(client => client.socketId !== socketId));
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
                socketRef.current.off(ACTIONS.APPROVE_CODE_EDIT);
                socketRef.current.off(ACTIONS.DENY_CODE_EDIT);
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
        setFileContentsSnapshot(prev => ({ ...prev, [fileId]: value }));
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

    function leaveRoom() {
        // Determine if there are unsaved changes by comparing current contents to initial contents
        const hasUnsaved = Object.keys(fileContentsRef.current || {}).some(id => (fileContentsRef.current[id] || '') !== (initialContentsRef.current[id] || ''));
        if (hasUnsaved) {
            setShowLeaveConfirm(true);
        } else {
            reactNavigator('/');
        }
    }

    function collectCurrentContents() {
        const contents = { ...fileContentsRef.current };
        for (const [fileId, editor] of Object.entries(editorsRef.current)) {
            if (editor && editor.getValue) contents[fileId] = editor.getValue();
        }
        return contents;
    }

    async function saveContentsToServer() {
        const contents = collectCurrentContents();

        return new Promise((resolve) => {
            if (!socketRef.current) {
                toast.error('Socket is not connected.');
                resolve(false);
                return;
            }

            socketRef.current.emit(ACTIONS.FS_SAVE, { roomId, fileContents: contents }, ({ success, message }) => {
                if (success) {
                    Object.entries(contents).forEach(([k, v]) => {
                        initialContentsRef.current[k] = v;
                        fileContentsRef.current[k] = v;
                    });
                    toast.success('Project saved on server!');
                } else {
                    toast.error(message || 'Save failed.');
                }
                resolve(success);
            });
        });
    }

    async function handleSaveAndStay() {
        const saved = await saveContentsToServer();
        if (saved) setShowLeaveConfirm(false);
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
            setTimeout(() => {
                setActivePanel(lastPersistentPanel);
            }, 1000);
        }
    }

    function confirmExit() {
        try { socketRef.current?.disconnect(); } catch (e) { }
        reactNavigator('/');
    }

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
                                saveContentsToServer();
                                setTimeout(() => {
                                    setActivePanel(lastPersistentPanel);
                                }, 1000);
                            }} 
                            title="Save Project"
                        >
                            <Save size={22} strokeWidth={1.5} />
                        </button>
                        <button 
                            className={`activity-btn ${activePanel === 'download' ? 'activity-btn--active' : ''}`} 
                            onClick={() => {
                                setActivePanel('download');
                                setShowConfirmDownload(true);
                            }} 
                            title="Download Project"
                        >
                            <Download size={22} strokeWidth={1.5} />
                        </button>
                    </div>
                </div>

                {/* ── Side Panel ── */}
                {['explorer', 'users'].includes(activePanel) && (
                    <>
                        <div className="side-panel" style={{ width: `${sideWidth}px`, minWidth: `${sideWidth}px` }}>
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
                    <div className="resizer" onMouseDown={startResizing} />
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

            {/* Confirm Download Modal */}
            {showConfirmDownload && (
                <div className="modal-overlay">
                    <div className="unsaved-modal">
                        <div className="unsaved-icon" aria-hidden="true">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffb347" strokeWidth="1.6" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 3v10" />
                                <path d="M8 9l4 4 4-4" />
                                <path d="M4 17.5A2.5 2.5 0 0 1 6.5 15h11A2.5 2.5 0 0 1 20 17.5V19H4v-1.5z" />
                            </svg>
                        </div>
                        <h2>Confirm Download?</h2>
                        <p>Do you want to download this project as a ZIP file?</p>
                        <div className="unsaved-actions">
                            <button className="unsaved-btn save" onClick={handleDownload}>Download</button>
                            <button className="unsaved-btn cancel" onClick={() => {
                                setShowConfirmDownload(false);
                                setTimeout(() => {
                                    setActivePanel(lastPersistentPanel);
                                }, 1000);
                            }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Leave Modal */}
            {showLeaveConfirm && (
                <div className="modal-overlay">
                    <div className="unsaved-modal">
                        <div className="unsaved-icon" aria-hidden="true">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffb347" strokeWidth="1.6" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <circle cx="12" cy="17" r="0.5" fill="#ffb347" />
                            </svg>
                        </div>
                        <h2>Unsaved Changes?</h2>
                        <p>You have unsaved changes. Leaving now may lose local edits. What would you like to do?</p>
                        <div className="unsaved-actions">
                            <button className="unsaved-btn save" onClick={handleSaveAndStay}>Save &amp; Stay</button>
                            <button className="unsaved-btn leave" onClick={confirmExit}>Leave Anyway</button>
                            <button className="unsaved-btn cancel" onClick={() => setShowLeaveConfirm(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
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
