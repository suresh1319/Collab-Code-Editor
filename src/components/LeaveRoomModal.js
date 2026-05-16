import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Download, X } from 'lucide-react';

/**
 * LeaveRoomModal
 * Props:
 *  isOpen        – boolean
 *  onClose       – () => void   (Cancel)
 *  onSaveLeave   – () => void   (Download project then navigate away)
 *  onLeaveAnyway – () => void   (Navigate away immediately)
 */
const LeaveRoomModal = ({ isOpen, onClose, onSaveLeave, onLeaveAnyway }) => {
    const [saving, setSaving] = useState(false);

    // Reset state each time the modal opens
    useEffect(() => {
        if (isOpen) setSaving(false);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Lock background scroll
    useEffect(() => {
        if (!isOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSaveLeave = async () => {
        if (saving) return;
        setSaving(true);
        await onSaveLeave();
    };

    return (
        <div
            className="modal-overlay"
            onClick={saving ? undefined : onClose}
            style={{ zIndex: 9999 }}
        >
            <div
                className="modal-box"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '420px', padding: '28px' }}
            >
                {/* Header */}
                <div className="modal-header" style={{ marginBottom: '10px' }}>
                    <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LogOut size={18} style={{ color: '#ff6b6b' }} />
                        Leave Room
                    </h3>
                    <button
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Close"
                        disabled={saving}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <p className="modal-desc" style={{ marginBottom: '24px', fontSize: '0.9rem', lineHeight: '1.55' }}>
                    You're about to leave the room. Would you like to{' '}
                    <strong>download the project</strong> before leaving, or leave without saving?
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    {/* Cancel */}
                    <button
                        className="btn"
                        style={{
                            background: 'rgba(255,255,255,0.05)',
                            color: 'var(--text-color)',
                            border: '1px solid var(--border-color)',
                            padding: '9px 16px',
                            fontSize: '14px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.5 : 1,
                        }}
                        onClick={onClose}
                        disabled={saving}
                    >
                        Cancel
                    </button>

                    {/* Leave Anyway */}
                    <button
                        className="btn"
                        style={{
                            background: 'rgba(255, 107, 107, 0.15)',
                            color: '#ff6b6b',
                            border: '1px solid rgba(255, 107, 107, 0.4)',
                            padding: '9px 16px',
                            fontSize: '14px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.5 : 1,
                            borderRadius: '8px',
                            fontWeight: 500,
                        }}
                        onClick={onLeaveAnyway}
                        disabled={saving}
                    >
                        <LogOut size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                        Leave Anyway
                    </button>

                    {/* Save & Leave */}
                    <button
                        className="btn joinbtn"
                        style={{
                            margin: 0,
                            width: 'auto',
                            padding: '9px 16px',
                            fontSize: '14px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.75 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                        onClick={handleSaveLeave}
                        disabled={saving}
                    >
                        <Download size={14} />
                        {saving ? 'Saving...' : 'Save & Leave'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LeaveRoomModal;
