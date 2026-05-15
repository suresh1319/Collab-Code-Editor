import React, { useState, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import {
    File,
    FileCode2,
    Folder,
    FolderOpen,
    FilePlus,
    FolderPlus,
    Pencil,
    Trash2,
    ChevronRight,
    ChevronDown,
} from 'lucide-react';

// File icon by extension — returns a Lucide component
function FileIcon({ name }) {
    const ext = name.split('.').pop().toLowerCase();
    // All extensions use FileCode2 for a clean, consistent look
    const codeExts = new Set(['js','jsx','ts','tsx','html','css','scss','json','py','sh','yml','yaml','env','md','svg','txt','png','jpg','jpeg']);
    if (codeExts.has(ext)) return <FileCode2 size={14} />;
    return <File size={14} />;
}

// Single tree node
function FileNode({ node, fileSystem, depth, activeFileId, onFileClick, onCreateNode, onDeleteNode, onRenameNode, canWrite }) {
    const [expanded, setExpanded] = useState(true);
    const [renaming, setRenaming] = useState(false);
    const [renameVal, setRenameVal] = useState(node.name);
    const [showCreate, setShowCreate] = useState(null); // 'file' | 'folder'
    const [createName, setCreateName] = useState('');
    const renameRef = useRef(null);
    const createRef = useRef(null);

    const isFolder = node.type === 'folder';
    const isRoot = node.id === 'root';
    const isActive = activeFileId === node.id;

    const handleRenameSubmit = () => {
        const trimmed = renameVal.trim();
        if (trimmed && trimmed !== node.name) {
            onRenameNode(node.id, trimmed);
        }
        setRenaming(false);
    };

    const handleCreateSubmit = (type) => {
        const trimmed = createName.trim();
        if (!trimmed) { setShowCreate(null); return; }
        const newNode = {
            id: uuid(),
            name: trimmed,
            type,
            parentId: node.id,
            ...(type === 'folder' ? { children: [] } : {}),
        };
        onCreateNode(newNode);
        setCreateName('');
        setShowCreate(null);
        setExpanded(true);
    };

    const children = (node.children || []).map(id => fileSystem[id]).filter(Boolean);

    return (
        <div className="fs-node">
            <div
                className={`fs-node-row ${isActive ? 'fs-node-active' : ''}`}
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
                onClick={() => {
                    if (isFolder) setExpanded(e => !e);
                    else onFileClick(node.id);
                }}
            >
                <span className="fs-node-arrow">
                    {isFolder
                        ? (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
                        : <span style={{ display: 'inline-block', width: 12 }} />
                    }
                </span>
                <span className="fs-node-icon">
                    {isFolder
                        ? (expanded ? <FolderOpen size={14} /> : <Folder size={14} />)
                        : <FileIcon name={node.name} />
                    }
                </span>
                {renaming ? (
                    <input
                        ref={renameRef}
                        className="fs-inline-input"
                        value={renameVal}
                        autoFocus
                        onChange={e => setRenameVal(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setRenaming(false); }}
                        onClick={e => e.stopPropagation()}
                    />
                ) : (
                    <span className="fs-node-name">{node.name}</span>
                )}
                {canWrite && (
                    <span className="fs-node-actions" onClick={e => e.stopPropagation()}>
                        {isFolder && (
                            <>
                                <button title="New File" onClick={() => { setShowCreate('file'); setExpanded(true); }}>
                                    <FilePlus size={13} />
                                </button>
                                <button title="New Folder" onClick={() => { setShowCreate('folder'); setExpanded(true); }}>
                                    <FolderPlus size={13} />
                                </button>
                            </>
                        )}
                        {!isRoot && (
                            <>
                                <button title="Rename" onClick={() => { setRenaming(true); setRenameVal(node.name); }}>
                                    <Pencil size={13} />
                                </button>
                                <button title="Delete" onClick={() => onDeleteNode(node.id)}>
                                    <Trash2 size={13} />
                                </button>
                            </>
                        )}
                    </span>
                )}
            </div>

            {/* Inline create input */}
            {showCreate && (
                <div className="fs-create-row" style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}>
                    <span className="fs-create-icon">
                        {showCreate === 'file' ? <File size={13} /> : <Folder size={13} />}
                    </span>
                    <input
                        ref={createRef}
                        className="fs-inline-input"
                        autoFocus
                        placeholder={showCreate === 'file' ? 'filename.js' : 'folder-name'}
                        value={createName}
                        onChange={e => setCreateName(e.target.value)}
                        onBlur={() => handleCreateSubmit(showCreate)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleCreateSubmit(showCreate);
                            if (e.key === 'Escape') { setShowCreate(null); setCreateName(''); }
                        }}
                    />
                </div>
            )}

            {/* Children */}
            {isFolder && expanded && children.map(child => (
                <FileNode
                    key={child.id}
                    node={child}
                    fileSystem={fileSystem}
                    depth={depth + 1}
                    activeFileId={activeFileId}
                    onFileClick={onFileClick}
                    onCreateNode={onCreateNode}
                    onDeleteNode={onDeleteNode}
                    onRenameNode={onRenameNode}
                    canWrite={canWrite}
                />
            ))}
        </div>
    );
}

// Main FileExplorer
const FileExplorer = ({ fileSystem, activeFileId, onFileClick, onCreateNode, onDeleteNode, onRenameNode, canWrite }) => {
    const root = fileSystem['root'];
    if (!root) return null;

    return (
        <div className="file-explorer">
            <div className="explorer-header">
                <span className="explorer-title">EXPLORER</span>
            </div>
            <div className="explorer-tree">
                <FileNode
                    node={root}
                    fileSystem={fileSystem}
                    depth={0}
                    activeFileId={activeFileId}
                    onFileClick={onFileClick}
                    onCreateNode={onCreateNode}
                    onDeleteNode={onDeleteNode}
                    onRenameNode={onRenameNode}
                    canWrite={canWrite}
                />
            </div>
        </div>
    );
};

export default FileExplorer;
