import React from 'react';
import { Download, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <Download size={18} className="modal-title-icon" style={{ color: '#4aed88' }} />
                        {title || 'Confirm Download'}
                    </h3>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </div>

                <p className="modal-desc" style={{ marginBottom: '24px', fontSize: '0.9rem' }}>
                    {message || 'Do you want to download this project?'}
                </p>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button 
                        className="btn" 
                        style={{ 
                            background: 'rgba(255, 255, 255, 0.05)', 
                            color: 'var(--text-color)', 
                            border: '1px solid var(--border-color)',
                            padding: '9px 16px',
                            fontSize: '14px'
                        }} 
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button 
                        className="btn joinbtn" 
                        style={{ 
                            margin: 0, 
                            width: 'auto', 
                            minWidth: '100px',
                            padding: '9px 16px',
                            fontSize: '14px'
                        }}
                        onClick={onConfirm}
                    >
                        Download
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
