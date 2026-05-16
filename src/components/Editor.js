import React, { useEffect, useRef, useState } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/eclipse.css';

// Languages
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/htmlmixed/htmlmixed';
import 'codemirror/mode/css/css';
import 'codemirror/mode/python/python';
import 'codemirror/mode/markdown/markdown';
import 'codemirror/mode/xml/xml';
import 'codemirror/mode/shell/shell';
import 'codemirror/mode/sql/sql';
import 'codemirror/mode/php/php';
import 'codemirror/mode/clike/clike'; // C, C++, Java, C#

// Addons
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/matchbrackets';
import 'codemirror/addon/selection/active-line';
import 'codemirror/addon/comment/comment';
import 'codemirror/addon/fold/foldcode';
import 'codemirror/addon/fold/foldgutter';
import 'codemirror/addon/fold/foldgutter.css';
import 'codemirror/addon/fold/brace-fold';
import 'codemirror/addon/fold/indent-fold';

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { CodemirrorBinding } from 'y-codemirror';

// Map file extension → CodeMirror mode
function getModeFromFilename(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  const modeMap = {
    js:   { name: 'javascript', json: false },
    jsx:  { name: 'javascript', json: false },
    ts:   { name: 'javascript', json: false },
    tsx:  { name: 'javascript', json: false },
    json: { name: 'javascript', json: true },
    html: 'htmlmixed',
    htm:  'htmlmixed',
    css:  'css',
    scss: 'css',
    py:   'python',
    md:   'markdown',
    markdown: 'markdown',
    xml:  'xml',
    svg:  'xml',
    sh:   'shell',
    bash: 'shell',
    sql:  'sql',
    php:  'php',
    c:    'text/x-csrc',
    cpp:  'text/x-c++src',
    java: 'text/x-java',
    cs:   'text/x-csharp',
  };
  return modeMap[ext] || 'text/plain';
}

const cursorColors = ['#ffb86c', '#ff79c6', '#8be9fd', '#50fa7b', '#bd93f9', '#ff5555', '#f1fa8c'];
function getColor(clientId) {
  return cursorColors[Math.abs(clientId) % cursorColors.length];
}

const Editor = ({ socketRef, roomId, fileId, fileName, onCodeChange, userName, canWrite, editorTheme, onEditorReady, initialContent }) => {
  const editorRef = useRef(null);
  const textareaRef = useRef(null);
  const providerRef = useRef(null);
  const bindingRef = useRef(null);
  const bookmarksRef = useRef(new Map());
  const timeoutsRef = useRef(new Map());
  const [peers, setPeers] = useState([]);

  // Enforce readOnly dynamically
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setOption('readOnly', !canWrite);
    }
  }, [canWrite]);

  // Switch theme dynamically
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setOption('theme', editorTheme || 'dracula');
    }
  }, [editorTheme]);

  // Switch language mode when file changes
  useEffect(() => {
    if (editorRef.current && fileName) {
      editorRef.current.setOption('mode', getModeFromFilename(fileName));
    }
  }, [fileName]);

  // Initialize CodeMirror + Yjs (per fileId)
  useEffect(() => {
    if (!textareaRef.current) return;

    // Destroy old instances
    if (bindingRef.current) { bindingRef.current.destroy(); bindingRef.current = null; }
    if (providerRef.current) { providerRef.current.destroy(); providerRef.current = null; }
    if (editorRef.current) { editorRef.current.toTextArea(); editorRef.current = null; }
    bookmarksRef.current.forEach(b => b.clear());
    bookmarksRef.current.clear();
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current.clear();

    const editor = Codemirror.fromTextArea(textareaRef.current, {
      mode: getModeFromFilename(fileName),
      theme: editorTheme || 'dracula',
      autoCloseTags: false,
      autoCloseBrackets: true,
      matchBrackets: true,
      lineNumbers: true,
      styleActiveLine: true,
      foldGutter: true,
      gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
      readOnly: !canWrite,
      lineWrapping: false,
      tabSize: 2,
      indentWithTabs: false,
      extraKeys: {
        'Ctrl-/': 'toggleComment',
        'Cmd-/': 'toggleComment',
      },
    });
    editorRef.current = editor;

    editor.on('change', (instance) => {
      if (onCodeChange) onCodeChange(fileId, instance.getValue());
    });

    if (onEditorReady) onEditorReady(fileId, editor);

    // Yjs setup — each file gets its own Yjs document keyed by roomId:fileId
    const ydoc = new Y.Doc();
    const baseOrigin = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001');
    const wsUrl = baseOrigin.replace(/^http/, 'ws') + '/yjs';

    const provider = new WebsocketProvider(wsUrl, `${roomId}:${fileId}`, ydoc);
    providerRef.current = provider;

    const ytext = ydoc.getText('codemirror');
    const binding = new CodemirrorBinding(ytext, editor);
    bindingRef.current = binding;

    // Inject initialContent once provider syncs, but only if the doc is still empty
    const handleSync = (isSynced) => {
      if (isSynced && initialContent && ytext.length === 0) {
        ydoc.transact(() => {
          ytext.insert(0, initialContent);
        });
      }
    };
    provider.on('sync', handleSync);

    // Cursor awareness
    const awareness = provider.awareness;
    const myColor = getColor(awareness.clientID);
    awareness.setLocalStateField('user', { name: userName || 'Anonymous', color: myColor });

    awareness.on('change', () => {
      const states = awareness.getStates();
      const activeClients = new Set();
      const currentPeers = [];

      states.forEach((state, clientId) => {
        const user = state.user;
        if (user) currentPeers.push({ clientId, ...user });
        if (clientId === awareness.clientID) return;
        activeClients.add(clientId);

        const cursor = state.customCursor;
        if (bookmarksRef.current.has(clientId)) {
          bookmarksRef.current.get(clientId).clear();
          bookmarksRef.current.delete(clientId);
        }
        if (cursor && cursor.anchor && typeof cursor.anchor.line === 'number' && user) {
          const cursorEl = document.createElement('span');
          cursorEl.className = 'yjs-cursor';
          cursorEl.style.backgroundColor = user.color;
          const labelEl = document.createElement('span');
          labelEl.className = 'yjs-cursor-label';
          labelEl.style.backgroundColor = user.color;
          labelEl.innerText = user.name;
          cursorEl.appendChild(labelEl);
          const bookmark = editor.setBookmark(cursor.anchor, { widget: cursorEl, insertLeft: true });
          bookmarksRef.current.set(clientId, bookmark);
          if (timeoutsRef.current.has(clientId)) clearTimeout(timeoutsRef.current.get(clientId));
          labelEl.style.opacity = '1';
          const timeout = setTimeout(() => { if (labelEl) labelEl.style.opacity = '0'; }, 2500);
          timeoutsRef.current.set(clientId, timeout);
        }
      });

      setPeers(currentPeers);
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

    editor.on('cursorActivity', () => {
      const anchor = editor.getCursor('anchor');
      const head = editor.getCursor('head');
      awareness.setLocalStateField('customCursor', { anchor, head });
    });

    return () => {
      if (bindingRef.current) { bindingRef.current.destroy(); bindingRef.current = null; }
      if (providerRef.current) { providerRef.current.destroy(); providerRef.current = null; }
      if (editorRef.current) { editorRef.current.toTextArea(); editorRef.current = null; }
      bookmarksRef.current.forEach(b => b.clear());
      bookmarksRef.current.clear();
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current.clear();
    };
  }, [roomId, fileId]); // re-init only when file or room changes

  if (!socketRef.current) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="presence-bar">
        {peers.map((peer) => (
          <div key={peer.clientId} className="presence-indicator" style={{ backgroundColor: peer.color }} title={peer.name}>
            {peer.name[0]?.toUpperCase()}
          </div>
        ))}
        <span className="presence-filename">{fileName}</span>
        <span className="presence-lang">{(getModeFromFilename(fileName)?.name || getModeFromFilename(fileName) || 'text').toString().toUpperCase()}</span>
      </div>
      <textarea ref={textareaRef} id="realtimeEditor"></textarea>
    </div>
  );
};

export default Editor;
