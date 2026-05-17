import { useEffect, useRef } from "react";
import "./DeleteConfirmModal.css";

export default function DeleteConfirmModal({ target, onCancel, onConfirm }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const handler = (e) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, onConfirm]);

  const isFolder = target?.type === "folder";

  return (
    <div className="dcm-backdrop" onClick={onCancel}>
      <div className="dcm-box" onClick={(e) => e.stopPropagation()}>
        <h2 className="dcm-title">Delete {isFolder ? "folder" : "file"}?</h2>
        <p className="dcm-body">
          <strong>{target?.name}</strong> will be permanently deleted
          {isFolder && target.childCount > 0
            ? ` along with all ${target.childCount} files inside`
            : ""}.
          <br />
          <span className="dcm-note">⚠️ This affects everyone in the room.</span>
        </p>
        <div className="dcm-actions">
          <button className="dcm-cancel" onClick={onCancel}>Cancel</button>
          <button className="dcm-confirm" onClick={onConfirm} ref={confirmRef}>Delete</button>
        </div>
      </div>
    </div>
  );
}