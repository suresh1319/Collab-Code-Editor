import React, { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Download, Trash2, X } from 'lucide-react';

const MODAL_ICONS = {
    delete: Trash2,
    warning: AlertTriangle,
    download: Download,
};

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    submittingText = 'Processing...',
    variant = 'download',
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = useRef(isSubmitting);
    const TitleIcon = MODAL_ICONS[variant] || Download;
    const iconColor = variant === 'delete' ? '#ff6b6b' : variant === 'warning' ? '#f59e0b' : '#4aed88';

    // Sync the isSubmitting state to a ref to prevent stale closures in the keydown handler
    useEffect(() => {
        isSubmittingRef.current = isSubmitting;
    }, [isSubmitting]);

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
            if (e.key === 'Escape' && !isSubmittingRef.current) {
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
                        <TitleIcon size={18} className="modal-title-icon" style={{ color: iconColor }} />
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
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            background: variant === 'delete' ? '#ff5555' : undefined,
                        }}
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? submittingText : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
