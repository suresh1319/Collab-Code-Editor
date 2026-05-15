import React from 'react';

function getFileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  const icons = {
    js: '🟨', jsx: '🟨', ts: '🔷', tsx: '🔷',
    html: '🟧', css: '🔵', scss: '🔵',
    json: '🟩', md: '📝', py: '🐍',
    txt: '📄', svg: '🖼️',
  };
  return icons[ext] || '📄';
}

const FileTabs = ({ openFiles, fileSystem, activeFileId, onTabClick, onTabClose }) => {
  if (openFiles.length === 0) return null;

  return (
    <div className="file-tabs-bar">
      {openFiles.map(fileId => {
        const node = fileSystem[fileId];
        if (!node) return null;
        const isActive = fileId === activeFileId;
        return (
          <div
            key={fileId}
            className={`file-tab ${isActive ? 'file-tab--active' : ''}`}
            onClick={() => onTabClick(fileId)}
          >
            <span className="file-tab-icon">{getFileIcon(node.name)}</span>
            <span className="file-tab-name">{node.name}</span>
            <button
              className="file-tab-close"
              onClick={e => { e.stopPropagation(); onTabClose(fileId); }}
              title="Close"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default FileTabs;
