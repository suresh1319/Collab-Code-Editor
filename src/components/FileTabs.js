import React from 'react';
import { FileCode2, File } from 'lucide-react';

function FileIcon({ name = '' }) {
    const ext = name.split('.').pop().toLowerCase();
    const codeExts = new Set(['js','jsx','ts','tsx','html','css','scss','json','py','sh','yml','yaml','env','md','svg']);
    if (codeExts.has(ext)) return <FileCode2 size={13} />;
    return <File size={13} />;
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
                        <span className="file-tab-icon"><FileIcon name={node.name} /></span>
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
