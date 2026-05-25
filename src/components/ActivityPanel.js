import React, { useRef, useEffect } from 'react';
import { 
    Activity, 
    PlusCircle, 
    Trash2, 
    Pencil, 
    Upload, 
    UserCheck, 
    LogIn, 
    LogOut 
} from 'lucide-react';

const ActivityPanel = ({ activities = [] }) => {
    const feedEndRef = useRef(null);

    // Auto-scroll to bottom on new activity
    useEffect(() => {
        feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [activities]);

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'join':
                return <LogIn size={13} className="activity-icon activity-icon--join" />;
            case 'leave':
                return <LogOut size={13} className="activity-icon activity-icon--leave" />;
            case 'create':
                return <PlusCircle size={13} className="activity-icon activity-icon--create" />;
            case 'delete':
                return <Trash2 size={13} className="activity-icon activity-icon--delete" />;
            case 'rename':
                return <Pencil size={13} className="activity-icon activity-icon--rename" />;
            case 'upload':
                return <Upload size={13} className="activity-icon activity-icon--upload" />;
            case 'permission':
                return <UserCheck size={13} className="activity-icon activity-icon--permission" />;
            default:
                return <Activity size={13} className="activity-icon" />;
        }
    };

    return (
        <div className="chat-panel activity-feed-panel">
            <div className="panel-header">
                <span className="panel-title">
                    <Activity size={13} className="panel-title-icon" />
                    ACTIVITY FEED
                </span>
                <div className="panel-header-actions">
                    <span className="panel-admin-tag chat-count-tag">
                        {activities.length} event{activities.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <div className="chat-messages panel-body activity-logs">
                {activities.length === 0 ? (
                    <div className="chat-empty">
                        <Activity size={32} className="chat-empty-icon" />
                        <p>No activity yet.</p>
                        <p className="chat-empty-hint">Workspace edits will appear here in real time!</p>
                    </div>
                ) : (
                    activities.map((activity) => (
                        <div key={activity.id} className={`activity-log-item activity-log-item--${activity.type}`}>
                            <div className="activity-icon-container">
                                {getActivityIcon(activity.type)}
                            </div>
                            <div className="activity-details">
                                <p className="activity-message">{activity.message}</p>
                                <span className="activity-time">{formatTime(activity.timestamp)}</span>
                            </div>
                        </div>
                    ))
                )}
                <div ref={feedEndRef} />
            </div>
        </div>
    );
};

export default ActivityPanel;
