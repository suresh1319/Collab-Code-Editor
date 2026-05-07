import React, { useState } from 'react';
import toast from 'react-hot-toast';

const shareOptions = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
    getUrl: (link, msg) =>
      `https://wa.me/?text=${encodeURIComponent(msg + '\n' + link)}`,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: '✈️',
    color: '#229ED9',
    getUrl: (link, msg) =>
      `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(msg)}`,
  },
  {
    id: 'twitter',
    label: 'X / Twitter',
    icon: '🐦',
    color: '#1DA1F2',
    getUrl: (link, msg) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(link)}`,
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    getUrl: (link, msg) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    getUrl: (link) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`,
  },
  {
    id: 'email',
    label: 'Email',
    icon: '📧',
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
          <h3 className="modal-title">🔗 Invite Friends</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <p className="modal-desc">
          Share this link to invite others to your room. They'll land with the Room ID already filled in.
        </p>

        {/* Invite Link copy bar */}
        <div className="invite-link-bar">
          <span className="invite-link-text">{inviteLink}</span>
          <button className="invite-copy-btn" onClick={handleCopy}>
            {copied ? '✅ Copied' : '📋 Copy'}
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
              <span className="share-icon">{opt.icon}</span>
              <span className="share-label">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
