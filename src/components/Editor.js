import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';

const Editor = ({ socketRef, roomId, onCodeChange }) => {
  const editorRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    editorRef.current = Codemirror.fromTextArea(
      textareaRef.current,
      {
        mode: { name: 'javascript', json: true },
        theme: 'dracula',
        autoCloseTags: true,
        autoCloseBrackets: true,
        lineNumbers: true,
      }
    );

    editorRef.current.on('change', (instance, changes) => {
      const { origin } = changes;
      const code = instance.getValue();
      if (onCodeChange) onCodeChange(code);
      if (origin !== 'setValue' && socketRef.current) {
        socketRef.current.emit(ACTIONS.CODE_CHANGE, {
          roomId,
          code,
        });
      }
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.toTextArea();
      }
    };
  }, [socketRef, roomId, onCodeChange]);

  // Attach socket event handler when socketRef.current is set
  useEffect(() => {
    if (!socketRef.current) return;
    const onCodeChangeSocket = ({ code }) => {

      if (code !== null && editorRef.current) {
        if (editorRef.current.getValue() !== code) {
          editorRef.current.setValue(code);
        }
      }
    };
    socketRef.current.on(ACTIONS.CODE_CHANGE, onCodeChangeSocket);
    return () => {
      if (socketRef.current) {
        socketRef.current.off(ACTIONS.CODE_CHANGE, onCodeChangeSocket);
      }
    };
  }, [socketRef]);

  // Only render the editor if the socket is ready
  if (!socketRef.current) return null;

  return <textarea ref={textareaRef} id="realtimeEditor"></textarea>;
};

export default Editor;
