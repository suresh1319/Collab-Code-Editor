import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Reset submission state whenever modal is reopened
    useEffect(() => {
        if (isOpen) {
            setIsSubmitting(false);
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

        // Store the current style so we can restore it accurately
        const originalOverflow = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';
        
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        onConfirm();
    };

    return (
        <div className="modal-overlay" onClick={isSubmitting ? undefined : onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '380px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <Download size={18} className="modal-title-icon" style={{ color: '#4aed88' }} />
                        {title || 'Confirm Download'}
                    </h3>
                    <button 
                        className="modal-close" 
                        onClick={onClose} 
                        aria-label="Close"
                        disabled={isSubmitting}
                    >
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
                            fontSize: '14px',
                            opacity: isSubmitting ? 0.5 : 1,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                        }} 
                        onClick={onClose}
                        disabled={isSubmitting}
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
                            opacity: isSubmitting ? 0.7 : 1,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer'
                        }}
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Processing...' : 'Download'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
