import { useState, useCallback } from "react";

const JUDGE0_LANGUAGE_IDS = {
  python: 71,
  "text/x-java": 62,
  "text/x-csrc": 48,
  "text/x-c++src": 54,
  "text/x-csharp": 51,
  php: 68,
  shell: 46,
  sql: 82,
};

const JUDGE0_BASE = "https://ce.judge0.com";

async function runWithJudge0(code, languageId) {
  const res = await fetch(
    `${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_code: code, language_id: languageId }),
    },
  );

  if (!res.ok) throw new Error(`Judge0 error: ${res.status}`);

  const result = await res.json();
  return {
    stdout: result.stdout || "",
    stderr: result.stderr || result.compile_output || "",
    status: result.status?.description || "Done",
  };
}

// FIX: Replaced new Function(code)() with a sandboxed iframe + postMessage approach.
// new Function() requires 'unsafe-eval' which is blocked by strict CSP (script-src 'self').
// A sandboxed iframe with sandbox="allow-scripts" (without allow-same-origin) runs its own
// independent browsing context that is NOT bound by the parent page's CSP, so JS executes
// freely. postMessage tunnels console output back to the parent safely.
function runJavaScript(code) {
  return new Promise((resolve) => {
    const logs = [];

    // Unique channel ID to avoid cross-contamination if multiple runs overlap
    const channelId = `__cce_logs_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const wrappedCode = `
      (function() {
        const _send = (type, args) => window.parent.postMessage(
          {
            __cce: true,
            channel: ${JSON.stringify(channelId)},
            type,
            text: args.map(a => {
              try {
                return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a);
              } catch {
                return String(a);
              }
            }).join(' ')
          },
          '*'
        );

        const console = {
          log:   (...a) => _send('log', a),
          warn:  (...a) => _send('warn', a),
          error: (...a) => _send('error', a),
          info:  (...a) => _send('info', a),
        };

        try {
          ${code}
        } catch (err) {
          _send('error', [err.toString()]);
        } finally {
          window.parent.postMessage(
            { __cce: true, channel: ${JSON.stringify(channelId)}, type: '__done' },
            '*'
          );
        }
      })();
    `;

    // Build a minimal HTML page that just runs the user's code
    const html = `<!DOCTYPE html><html><body><script>${wrappedCode}<\/script></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);

    // sandbox="allow-scripts" WITHOUT allow-same-origin:
    //   - Allows script execution inside the iframe
    //   - Denies same-origin access, so the iframe cannot touch parent DOM/storage
    //   - Crucially: the iframe's CSP is independent of the parent's, so 'unsafe-eval'
    //     restrictions on the parent do NOT apply inside this sandboxed context
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.sandbox = "allow-scripts";
    iframe.src = blobUrl;

    // Safety: kill execution if it hangs for more than 10 seconds
    const timeout = setTimeout(() => {
      cleanup();
      logs.push({ type: "warn", text: "Execution timed out after 10 seconds." });
      resolve(logs);
    }, 10000);

    const onMessage = (event) => {
      // Ignore messages from unrelated sources or channels
      if (!event.data?.__cce || event.data.channel !== channelId) return;

      if (event.data.type === "__done") {
        cleanup();
        if (logs.length === 0) logs.push({ type: "info", text: "(no output)" });
        resolve(logs);
      } else {
        logs.push({ type: event.data.type, text: event.data.text });
      }
    };

    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener("message", onMessage);
      if (iframe.parentNode) document.body.removeChild(iframe);
      URL.revokeObjectURL(blobUrl);
    };

    window.addEventListener("message", onMessage);
    document.body.appendChild(iframe);
  });
}

export function useCodeRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState([]);

  const clearLogs = useCallback(() => setConsoleLogs([]), []);

  const run = useCallback(async (code, cmMode, fileName) => {
    if (!code?.trim()) {
      setConsoleLogs((prev) => [
        ...prev,
        { type: "warn", text: "Nothing to run — file is empty." },
      ]);
      return;
    }

    setIsRunning(true);

    const label = fileName
      ? `▶ ${fileName} · ${new Date().toLocaleTimeString()}`
      : `▶ Run · ${new Date().toLocaleTimeString()}`;

    setConsoleLogs((prev) => [...prev, { type: "separator", text: label }]);

    const modeName = typeof cmMode === "object" ? cmMode.name : cmMode || "";
    const isJsonMode = typeof cmMode === "object" && cmMode.json === true;

    try {
      if (modeName === "javascript" && !isJsonMode) {
        // ── JavaScript: run in sandboxed iframe (CSP-safe) ───────
        const logs = await runJavaScript(code); // FIX: now async, must be awaited
        setConsoleLogs((prev) => [...prev, ...logs]);
      } else if (isJsonMode) {
        // ── JSON: not executable ──────────────────────────────────
        setConsoleLogs((prev) => [
          ...prev,
          {
            type: "warn",
            text: "JSON files are not executable. Open a .js, .py, .java, or other supported file to run code.",
          },
        ]);
      } else if (modeName === "htmlmixed") {
        // ── HTML: render in a new browser tab ─────────────────────
        const blob = new Blob([code], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        setConsoleLogs((prev) => [
          ...prev,
          {
            type: "info",
            text: "HTML preview opened in a new tab.",
          },
        ]);
      } else {
        // ── Everything else: Judge0 ───────────────────────────────
        const languageId = JUDGE0_LANGUAGE_IDS?.[modeName];
        if (!languageId) {
          setConsoleLogs((prev) => [
            ...prev,
            {
              type: "warn",
              text: `Execution not supported for: ${modeName || "this language"}`,
            },
          ]);
          return;
        }
        const { stdout, stderr, status } = await runWithJudge0(
          code,
          languageId,
        );
        const newLogs = [];
        if (stdout)
          stdout.split("\n").forEach((line, i, arr) => {
            if (i < arr.length - 1 || line !== "") {
              newLogs.push({ type: "log", text: line });
            }
          });

        if (stderr)
          stderr.split("\n").forEach((line, i, arr) => {
            if (i < arr.length - 1 || line !== "") {
              newLogs.push({ type: "error", text: line });
            }
          });
        if (newLogs.length === 0)
          newLogs.push({ type: "info", text: `(${status} — no output)` });
        setConsoleLogs((prev) => [...prev, ...newLogs]);
      }
    } catch (err) {
      setConsoleLogs((prev) => [
        ...prev,
        { type: "error", text: `Execution error: ${err.message}` },
      ]);
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { run, isRunning, consoleLogs, clearLogs };
}