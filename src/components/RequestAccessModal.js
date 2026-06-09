import React, { useEffect, useState } from 'react';
import { Send, X } from 'lucide-react';

const RequestAccessModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    title = "Request Write Access", 
    description = "Send a message to the admin requesting edit permissions.", 
    placeholder = "Why do you need write access?" 
}) => {
    const [message, setMessage] = useState('');
    const maxLength = 200;
    
    // Reset submission state whenever modal is reopened
    useEffect(() => {
        if (isOpen) {
            setMessage('');
        }
    }, [isOpen]);

    // Handle accessibility: close on Escape key and lock background scrolling
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        const originalOverflow = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!message.trim()) return;
        onSubmit(message.trim());
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <Send size={18} className="modal-title-icon" style={{ color: 'var(--btn-bg)' }} />
                        {title}
                    </h3>
                    <button 
                        className="modal-close" 
                        onClick={onClose} 
                        aria-label="Close"
                    >
                        <X size={16} />
                    </button>
                </div>

                <p className="modal-desc" style={{ marginBottom: '16px', fontSize: '0.9rem' }}>
                    {description}
                </p>

                <div style={{ marginBottom: '20px' }}>
                    <textarea
                        className="inputBox"
                        placeholder={placeholder}
                        value={message}
                        onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
                        style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '10px',
                            resize: 'none',
                            marginBottom: '4px'
                        }}
                    />
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        fontSize: '0.8rem', 
                        color: message.length >= maxLength ? 'var(--error-color, #ff5555)' : 'var(--text-color)',
                        opacity: 0.7
                    }}>
                        {message.length}/{maxLength}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button 
                        className="btn" 
                        style={{ 
                            background: 'rgba(255, 255, 255, 0.05)', 
                            color: 'var(--text-color)', 
                            border: '1px solid var(--border-color)',
                            padding: '9px 16px',
                            fontSize: '14px',
                            cursor: 'pointer'
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
                            fontSize: '14px',
                            opacity: !message.trim() ? 0.5 : 1,
                            cursor: !message.trim() ? 'not-allowed' : 'pointer'
                        }}
                        onClick={handleSubmit}
                        disabled={!message.trim()}
                    >
                        Send Request
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RequestAccessModal;
