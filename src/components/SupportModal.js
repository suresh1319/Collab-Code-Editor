import React from 'react';
import { X, ExternalLink, HelpCircle, BookOpen, MessageCircle } from 'lucide-react';

const SupportModal = ({ onClose }) => {
    return (
        <div className="modal-overlay">
            <div className="modal-content support-modal" style={{ maxWidth: '500px' }}>
                <button className="modal-close" onClick={onClose}>
                    <X size={20} />
                </button>
                <h2><HelpCircle size={24} style={{ marginRight: '10px', verticalAlign: 'middle' }} /> Support & Help</h2>
                <p>Need help navigating the editor or collaborating with others? Check out our resources below.</p>
                
                <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ padding: '15px', backgroundColor: '#282a36', borderRadius: '8px', border: '1px solid #44475a' }}>
                        <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BookOpen size={18} /> Documentation
                        </h4>
                        <p style={{ fontSize: '14px', margin: '0 0 10px 0', color: '#b9b9b9' }}>
                            Learn how to use real-time collaboration, the file explorer, and manage permissions.
                        </p>
                        <a href="#" style={{ color: '#8be9fd', textDecoration: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            Read the Docs <ExternalLink size={14} />
                        </a>
                    </div>

                    <div style={{ padding: '15px', backgroundColor: '#282a36', borderRadius: '8px', border: '1px solid #44475a' }}>
                        <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MessageCircle size={18} /> Request Code Edits
                        </h4>
                        <p style={{ fontSize: '14px', margin: '0 0 10px 0', color: '#b9b9b9' }}>
                            If you are in read-only mode, you can use the "Request Edit" feature to suggest code changes to the room admin.
                        </p>
                    </div>

                    <div style={{ padding: '15px', backgroundColor: '#282a36', borderRadius: '8px', border: '1px solid #44475a' }}>
                        <h4 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HelpCircle size={18} /> FAQs
                        </h4>
                        <ul style={{ fontSize: '14px', margin: 0, paddingLeft: '20px', color: '#b9b9b9' }}>
                            <li style={{ marginBottom: '5px' }}><strong>How do I run code?</strong> Use the Live Preview tab for web projects.</li>
                            <li style={{ marginBottom: '5px' }}><strong>How do I invite others?</strong> Click the Share icon in the activity bar.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupportModal;
