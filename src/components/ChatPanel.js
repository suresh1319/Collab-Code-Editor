import React, { useState, useRef, useEffect } from 'react';
import Avatar from 'react-avatar';
import { Send, MessageSquare } from 'lucide-react';

const ChatPanel = ({ socketRef, roomId, userName, messages, onSendMessage }) => {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (trimmed) {
            onSendMessage(trimmed);
            setInputValue('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend(e);
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="chat-panel">
            <div className="panel-header">
                <span className="panel-title">
                    <MessageSquare size={13} className="panel-title-icon" />
                    ROOM CHAT
                </span>
                <div className="panel-header-actions">
                    <span className="panel-admin-tag chat-count-tag">
                        {messages.length} msg{messages.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            <div className="chat-messages panel-body">
                {messages.length === 0 ? (
                    <div className="chat-empty">
                        <MessageSquare size={32} className="chat-empty-icon" />
                        <p>No messages yet.</p>
                        <p className="chat-empty-hint">Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isSystem = msg.isSystem;
                        const isMe = msg.userName === userName && msg.socketId === socketRef.current?.id;

                        if (isSystem) {
                            return (
                                <div key={msg.id || Math.random()} className="chat-message chat-message--system">
                                    {msg.message}
                                </div>
                            );
                        }

                        return (
                            <div key={msg.id} className={`chat-message ${isMe ? 'chat-message--own' : ''}`}>
                                <div className="chat-avatar">
                                    <Avatar name={msg.userName} size={24} round="4px" />
                                </div>
                                <div className="chat-bubble-wrapper">
                                    <div className="chat-meta">
                                        <span className="chat-sender">
                                            {isMe ? 'You' : msg.userName}
                                        </span>
                                        <span className="chat-timestamp">
                                            {formatTime(msg.timestamp)}
                                        </span>
                                    </div>
                                    <div className="chat-bubble">
                                        {msg.message}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-bar">
                <form onSubmit={handleSend} className="chat-input-form">
                    <textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="chat-input"
                        rows={1}
                    />
                    <button
                        type="submit"
                        disabled={!inputValue.trim()}
                        className="chat-send-btn"
                        title="Send (Enter)"
                    >
                        <Send size={15} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPanel;
