import React from 'react';
import Avatar from 'react-avatar';

const Client = ({ userName, isAdmin, canWrite, isMe, iAmAdmin, onTogglePermission, onRequestAccess }) => {
    return (
       <div className="client">
        <div style={{ position: 'relative' }}>
          <Avatar name={userName} size={40} round='40px'/>
          {isAdmin && (
            <span style={{
              position: 'absolute', top: -5, right: -5, fontSize: '16px', background: '#fff', borderRadius: '50%', padding: '2px', lineHeight: '16px'
            }} title="Admin">👑</span>
          )}
          {!canWrite && !isAdmin && (
            <span style={{
              position: 'absolute', bottom: -5, right: -5, fontSize: '12px', background: '#ff5555', color: '#fff', borderRadius: '4px', padding: '2px 4px'
            }} title="Read Only">🚫</span>
          )}
        </div>
        <span className="userName">
            {userName} {isMe ? '(You)' : ''}
        </span>
        {iAmAdmin && !isAdmin && (
            <button 
                onClick={onTogglePermission}
                style={{
                    marginTop: '5px',
                    fontSize: '10px',
                    padding: '2px 6px',
                    background: canWrite ? '#ff5555' : '#50fa7b',
                    color: canWrite ? '#fff' : '#000',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                }}
            >
                {canWrite ? 'Revoke Write' : 'Allow Write'}
            </button>
        )}
        {isMe && !canWrite && !isAdmin && (
            <button 
                onClick={onRequestAccess}
                style={{
                    marginTop: '5px',
                    fontSize: '10px',
                    padding: '2px 6px',
                    background: '#8be9fd',
                    color: '#000',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                }}
            >
                Request Access
            </button>
        )}
       </div>
    );
};

export default Client;