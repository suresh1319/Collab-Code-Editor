import React, { useState, useRef } from 'react';
import { v4 as uuid } from 'uuid';

// File icon by extension
function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const icons = {
    js: '🟨', jsx: '🟨', ts: '🔷', tsx: '🔷',
    html: '🟧', css: '🔵', scss: '🔵',
    json: '🟩', md: '📝', py: '🐍',
    txt: '📄', svg: '🖼️', png: '🖼️', jpg: '🖼️',
    sh: '⚙️', yml: '⚙️', yaml: '⚙️', env: '🔒',
  };
  return icons[ext] || '📄';
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
        <span className="fs-node-arrow">{isFolder ? (expanded ? '▾' : '▸') : ''}</span>
        <span className="fs-node-icon">{isFolder ? (expanded ? '📂' : '📁') : getFileIcon(node.name)}</span>
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
                <button title="New File" onClick={() => { setShowCreate('file'); setExpanded(true); }}>+📄</button>
                <button title="New Folder" onClick={() => { setShowCreate('folder'); setExpanded(true); }}>+📁</button>
              </>
            )}
            {!isRoot && (
              <>
                <button title="Rename" onClick={() => { setRenaming(true); setRenameVal(node.name); }}>✏️</button>
                <button title="Delete" onClick={() => onDeleteNode(node.id)}>🗑️</button>
              </>
            )}
          </span>
        )}
      </div>

      {/* Inline create input */}
      {showCreate && (
        <div className="fs-create-row" style={{ paddingLeft: `${(depth + 1) * 14 + 8}px` }}>
          <span>{showCreate === 'file' ? '📄' : '📁'}</span>
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
