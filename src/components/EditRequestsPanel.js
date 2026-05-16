import React, { useState } from 'react';
import { MessageSquare, Check, X, Send } from 'lucide-react';
import toast from 'react-hot-toast';

// A mock component to demonstrate Edit Requests.
// In a real implementation, 'requests' would come from props/state mapped to socket events.
const EditRequestsPanel = ({ requests = [], onApprove, onDeny, onSendRequest, canWrite, fileSystem, activeFileId }) => {
    const [requestMsg, setRequestMsg] = useState('');

    const handleSend = () => {
        if (!requestMsg.trim()) return;
        const activeFile = activeFileId ? fileSystem[activeFileId] : null;
        onSendRequest({
            fileId: activeFileId,
            fileName: activeFile ? activeFile.name : 'Unknown',
            message: requestMsg
        });
        setRequestMsg('');
        toast.success("Edit request sent!");
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: '#f8f8f2' }}>
            <div className="panel-header" style={{ padding: '10px 15px', borderBottom: '1px solid #44475a' }}>
                <span className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 'bold' }}>
                    <MessageSquare size={14} className="panel-title-icon" />
                    EDIT REQUESTS
                </span>
            </div>

            <div className="panel-body" style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {requests.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#6272a4', marginTop: '20px', fontSize: '13px' }}>
                        No pending edit requests.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {requests.map((req, idx) => (
                            <div key={idx} style={{ padding: '10px', backgroundColor: '#282a36', borderRadius: '6px', border: '1px solid #44475a' }}>
                                <div style={{ fontSize: '12px', color: '#8be9fd', marginBottom: '5px', fontWeight: 'bold' }}>
                                    {req.userName} requested on {req.fileName}:
                                </div>
                                <div style={{ fontSize: '13px', marginBottom: '10px', wordBreak: 'break-word' }}>
                                    "{req.message}"
                                </div>
                                {canWrite && (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            onClick={() => onApprove(req.id)}
                                            style={{ flex: 1, padding: '5px', background: '#50fa7b', color: '#282a36', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 'bold' }}
                                        >
                                            <Check size={14} /> Approve
                                        </button>
                                        <button 
                                            onClick={() => onDeny(req.id)}
                                            style={{ flex: 1, padding: '5px', background: '#ff5555', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 'bold' }}
                                        >
                                            <X size={14} /> Deny
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Input area for read-only users to send requests */}
            {!canWrite && (
                <div style={{ padding: '15px', borderTop: '1px solid #44475a', backgroundColor: '#282a36' }}>
                    <div style={{ fontSize: '12px', marginBottom: '8px', color: '#8be9fd' }}>Request a change on active file:</div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="text" 
                            placeholder="Type your suggestion..." 
                            value={requestMsg}
                            onChange={(e) => setRequestMsg(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #44475a', background: '#44475a', color: '#f8f8f2', fontSize: '13px', outline: 'none' }}
                        />
                        <button 
                            onClick={handleSend}
                            style={{ padding: '8px', background: '#bd93f9', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditRequestsPanel;
