import React from 'react';
import Avatar from 'react-avatar';
import { Crown } from 'lucide-react';

const Client = ({ userName, isAdmin, canWrite, isMe, iAmAdmin, onTogglePermission, onRequestAccess }) => {
    const role = isAdmin ? 'Admin' : canWrite ? 'Editor' : 'Viewer';
    const roleClass = isAdmin ? 'role-badge admin' : canWrite ? 'role-badge editor' : 'role-badge viewer';

    return (
        <div className={`client-card ${isMe ? 'client-card--me' : ''}`}>
            {/* Left: Avatar */}
            <div className="client-avatar">
                <Avatar name={userName} size={34} round="6px" />
            </div>

            {/* Middle: Name + Role */}
            <div className="client-info">
                <span className="client-name">
                    {userName} {isMe ? <span className="you-tag">You</span> : ''}
                </span>
                <span className={roleClass}>{role}</span>
            </div>

            {/* Right: Actions */}
            <div className="client-actions">
                {/* Admin controls for other users */}
                {iAmAdmin && !isMe && (
                    <button
                        className={`action-btn ${canWrite ? 'action-btn--revoke' : 'action-btn--allow'}`}
                        onClick={onTogglePermission}
                    >
                        {canWrite ? 'Revoke Access' : 'Grant Access'}
                    </button>
                )}
                {/* Request access (for non-admin viewers who are "me") */}
                {isMe && !canWrite && !isAdmin && (
                    <button
                        className="action-btn action-btn--request"
                        onClick={onRequestAccess}
                    >
                        Request Access
                    </button>
                )}
                {/* Admin badge */}
                {isAdmin && (
                    <span className="action-btn action-btn--admin">
                        <Crown size={12} /> Admin
                    </span>
                )}
            </div>
        </div>
    );
};

export default Client;