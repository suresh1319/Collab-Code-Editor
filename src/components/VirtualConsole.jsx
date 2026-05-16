import React, { useRef, useEffect, useState } from "react";

const LOG_COLORS = {
  log: "var(--console-log, #e2e8f0)",
  info: "var(--console-info, #93c5fd)",
  warn: "var(--console-warn, #fbbf24)",
  error: "var(--console-error, #f87171)",
  separator: "#4a4a7a",
};

const LOG_PREFIX = {
  log: ">",
  info: "ℹ",
  warn: "⚠",
  error: "✖",
  separator: "",
};

const VirtualConsole = ({
  logs = [],
  isRunning = false,
  onClear,
  open,
  setOpen,
}) => {
  const [height, setHeight] = useState(220);
  const bottomRef = useRef(null);
  const prevLengthRef = useRef(logs.length);

  useEffect(() => {
    prevLengthRef.current = logs.length;
  }, [logs.length]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, open]);

  // Drag-to-resize
  const startDrag = (e) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;

    const onMove = (moveEvent) => {
      const delta = startY - moveEvent.clientY;
      // ✅ min is 60px so user can shrink it small
      setHeight(Math.max(60, Math.min(600, startHeight + delta)));
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const errorCount = logs.filter((l) => l.type === "error").length;
  const warnCount = logs.filter((l) => l.type === "warn").length;
  const logCount = logs.filter((l) => l.type !== "separator").length;

  if (!open) return null;

  return (
    // ✅ FIXED: removed minHeight from inline style — was preventing shrinking
    <div
      className="virtual-console open"
      style={{ height: `${height}px` }}
    >
      {/* Drag handle */}
      <div
        className="console-drag-handle"
        onMouseDown={startDrag}
        title="Drag to resize"
      />

      {/* HEADER */}
      <div className="console-header">
        <div className="console-header-left" style={{ flex: 1 }}>
          {isRunning && <span className="console-running-dot" />}
          <span className="console-title">CONSOLE</span>
          {logCount > 0 && (
            <span className="console-log-count">{logCount}</span>
          )}
          {errorCount > 0 && (
            <span className="console-badge console-badge--error">
              {errorCount} error{errorCount > 1 ? "s" : ""}
            </span>
          )}
          {warnCount > 0 && (
            <span className="console-badge console-badge--warn">
              {warnCount} warn{warnCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="console-header-right">
          <button
            className="console-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClear?.();
            }}
            title="Clear Console"
          >
            ✕ Clear
          </button>
        </div>
      </div>

      {/* BODY */}
      <div className="console-body">
        {logs.length === 0 ? (
          <div className="console-empty">
            Ready. Click Run or press Ctrl + Enter.
          </div>
        ) : (
          logs.map((log, index) => {
            if (log.type === "separator") {
              return (
                <div key={index} className="console-separator">
                  <span style={{ textTransform: "none" }}>{log.text}</span>
                </div>
              );
            }
            return (
              <div
                key={index}
                className={`console-row console-row--${log.type}`}
                style={{ color: LOG_COLORS[log.type] || LOG_COLORS.log }}
              >
                <span className="console-row-prefix">
                  {LOG_PREFIX[log.type] ?? ">"}
                </span>
                {/* ✅ FIXED: pre tag naturally enables horizontal scroll */}
                <pre className="console-row-text">{log.text}</pre>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default VirtualConsole;