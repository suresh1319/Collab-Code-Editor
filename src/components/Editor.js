import React, { useEffect, useRef, useState } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { CodemirrorBinding } from 'y-codemirror';

// Helper to assign colors to clients
const cursorColors = ['#ffb86c', '#ff79c6', '#8be9fd', '#50fa7b', '#bd93f9', '#ff5555', '#f1fa8c'];
function getColor(clientId) {
  return cursorColors[Math.abs(clientId) % cursorColors.length];
}

const Editor = ({ socketRef, roomId, onCodeChange, userName }) => {
  const editorRef = useRef(null);
  const textareaRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const bookmarksRef = useRef(new Map());
  const timeoutsRef = useRef(new Map());
  
  const [peers, setPeers] = useState([]);

  useEffect(() => {
    if (!textareaRef.current) return;
    
    // Initialize CodeMirror
    const editor = Codemirror.fromTextArea(
      textareaRef.current,
      {
        mode: { name: 'javascript', json: true },
        theme: 'dracula',
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
      }
    );
    editorRef.current = editor;

    editor.on('change', (instance) => {
      if (onCodeChange) onCodeChange(instance.getValue());
    });

    // Initialize Yjs
    const ydoc = new Y.Doc();
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
    // Replace http:// or https:// with ws:// or wss:// and append /yjs
    const wsUrl = backendUrl.replace(/^http/, 'ws') + '/yjs';
    
    const provider = new WebsocketProvider(
      wsUrl,
      roomId,
      ydoc
    );
    providerRef.current = provider;

    const ytext = ydoc.getText('codemirror');
    const binding = new CodemirrorBinding(ytext, editor);
    bindingRef.current = binding;

    // --- Cursor Awareness Setup ---
    const awareness = provider.awareness;
    
    // Set my own initial awareness state
    const myColor = getColor(awareness.clientID);
    awareness.setLocalStateField('user', {
      name: userName || 'Anonymous',
      color: myColor
    });

    // Handle remote cursors and presence
    awareness.on('change', () => {
      const states = awareness.getStates();
      
      const activeClients = new Set();
      const currentPeers = [];
      
      states.forEach((state, clientId) => {
        const user = state.user;
        if (user) {
          currentPeers.push({ clientId, ...user });
        }

        if (clientId === awareness.clientID) return; // Skip our own cursor rendering
        activeClients.add(clientId);

        const cursor = state.customCursor;
        
        // Remove old bookmark if it exists
        if (bookmarksRef.current.has(clientId)) {
          bookmarksRef.current.get(clientId).clear();
          bookmarksRef.current.delete(clientId);
        }

        if (cursor && cursor.anchor && typeof cursor.anchor.line === 'number' && user) {
          // Create cursor widget
          const cursorEl = document.createElement('span');
          cursorEl.className = 'yjs-cursor';
          cursorEl.style.backgroundColor = user.color;
          
          const labelEl = document.createElement('span');
          labelEl.className = 'yjs-cursor-label';
          labelEl.style.backgroundColor = user.color;
          labelEl.innerText = user.name;
          cursorEl.appendChild(labelEl);

          // Place bookmark
          const bookmark = editor.setBookmark(cursor.anchor, {
            widget: cursorEl,
            insertLeft: true
          });
          bookmarksRef.current.set(clientId, bookmark);

          // Handle label fadeout
          if (timeoutsRef.current.has(clientId)) {
            clearTimeout(timeoutsRef.current.get(clientId));
          }
          
          labelEl.style.opacity = '1';
          const timeout = setTimeout(() => {
            if (labelEl) labelEl.style.opacity = '0';
          }, 2500);
          timeoutsRef.current.set(clientId, timeout);
        }
      });
      
      setPeers(currentPeers);

      // Cleanup disconnected clients
      for (const [clientId, bookmark] of bookmarksRef.current.entries()) {
        if (!activeClients.has(clientId)) {
          bookmark.clear();
          bookmarksRef.current.delete(clientId);
          if (timeoutsRef.current.has(clientId)) {
             clearTimeout(timeoutsRef.current.get(clientId));
             timeoutsRef.current.delete(clientId);
          }
        }
      }
    });

    // Update awareness on my cursor activity
    editor.on('cursorActivity', () => {
      const anchor = editor.getCursor('anchor');
      const head = editor.getCursor('head');
      awareness.setLocalStateField('customCursor', { anchor, head });
    });

    return () => {
      if (bindingRef.current) bindingRef.current.destroy();
      if (providerRef.current) providerRef.current.destroy();
      if (editorRef.current) editorRef.current.toTextArea();
      
      // Clear timers
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current.clear();
    };
  }, [roomId, onCodeChange, userName]);

  // Only render the editor if the socket is ready
  if (!socketRef.current) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="presence-bar">
        {peers.map((peer) => (
          <div key={peer.clientId} className="presence-indicator" style={{ backgroundColor: peer.color }} title={peer.name}>
            {peer.name[0]?.toUpperCase()}
          </div>
        ))}
      </div>
      <textarea ref={textareaRef} id="realtimeEditor"></textarea>
    </div>
  );
};

export default Editor;
