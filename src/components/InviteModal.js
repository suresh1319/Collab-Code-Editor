import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { Copy, Check, Link2, X } from 'lucide-react';
import { 
    FaWhatsapp, 
    FaTelegram, 
    FaXTwitter, 
    FaLinkedinIn, 
    FaFacebookF 
} from 'react-icons/fa6';
import { FiMail } from 'react-icons/fi';

const shareOptions = [
    {
        id: 'whatsapp',
        label: 'WhatsApp',
        Icon: FaWhatsapp,
        color: '#25D366',
        getUrl: (link, msg) =>
            `https://wa.me/?text=${encodeURIComponent(msg + '\n' + link)}`,
    },
    {
        id: 'telegram',
        label: 'Telegram',
        Icon: FaTelegram,
        color: '#229ED9',
        getUrl: (link, msg) =>
            `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`,
    },
    {
        id: 'twitter',
        label: 'Twitter',
        Icon: FaXTwitter,
        color: 'var(--text-color)', // X logo typically matches text color
        getUrl: (link, msg) =>
            `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(link)}`,
    },
    {
        id: 'linkedin',
        label: 'LinkedIn',
        Icon: FaLinkedinIn,
        color: '#0A66C2',
        getUrl: (link, msg) =>
            `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
    },
    {
        id: 'facebook',
        label: 'Facebook',
        Icon: FaFacebookF,
        color: '#1877F2',
        getUrl: (link) =>
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
    },
    {
        id: 'email',
        label: 'Email',
        Icon: FiMail,
        color: '#EA4335',
        getUrl: (link, msg) =>
            `mailto:?subject=${encodeURIComponent('Join my CollabCE session')}&body=${encodeURIComponent(msg + '\n\n' + link)}`,
    },
];

const InviteModal = ({ roomId, onClose }) => {
    const [copied, setCopied] = useState(false);

    const inviteLink = `${window.location.origin}/?roomId=${roomId}`;
    const inviteMsg = `Join my collaborative coding session on CollabCE! Room ID: ${roomId}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            toast.success('Invite link copied!');
            setTimeout(() => setCopied(false), 2500);
        } catch {
            toast.error('Could not copy link');
        }
    };

    const handleShare = (option) => {
        const url = option.getUrl(inviteLink, inviteMsg);
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">
                        <Link2 size={16} className="modal-title-icon" />
                        Invite Friends
                    </h3>
                    <button className="modal-close" onClick={onClose} aria-label="Close">
                        <X size={16} />
                    </button>
                </div>

                <p className="modal-desc">
                    Share this link to invite others to your room. They'll land with the Room ID already filled in.
                </p>

                {/* Invite Link copy bar */}
                <div className="invite-link-bar">
                    <span className="invite-link-text">{inviteLink}</span>
                    <button className="invite-copy-btn" onClick={handleCopy}>
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>

                <p className="modal-share-label">Share via</p>

                {/* Platform buttons */}
                <div className="share-grid">
                    {shareOptions.map((opt) => (
                        <button
                            key={opt.id}
                            className="share-platform-btn"
                            style={{ '--platform-color': opt.color }}
                            onClick={() => handleShare(opt)}
                        >
                            <opt.Icon size={20} className="share-icon-svg" style={{ color: opt.color }} />
                            <span className="share-label">{opt.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InviteModal;
