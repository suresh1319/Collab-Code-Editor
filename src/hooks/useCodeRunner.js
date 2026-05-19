import { useState, useCallback, useRef, useEffect } from "react";

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
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Judge0 error: ${res.status}`);
  }

  const result = await res.json();

  return {
    stdout: result.stdout || "",
    stderr: result.stderr || result.compile_output || "",
    status: result.status?.description || "Done",
  };
}

function runJavaScript(code) {
  return new Promise((resolve) => {
    const logs = [];
    let resolved = false;

    code = code.replace(/<\/script>/gi, "<\\/script>");

    const channelId = `__cce_logs_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}`;

    const safeResolve = (value) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
    };

    const wrappedCode = `
      (function () {
        const _send = (type, args) =>
          window.parent.postMessage(
            {
              __cce: true,
              channel: ${JSON.stringify(channelId)},
              type,
              text: args
                .map((a) => {
                  try {
                    return typeof a === "object"
                      ? JSON.stringify(a, null, 2)
                      : String(a);
                  } catch {
                    return String(a);
                  }
                })
                .join(" "),
            },
            "*"
          );

        const console = {
          log: (...a) => _send("log", a),
          warn: (...a) => _send("warn", a),
          error: (...a) => _send("error", a),
          info: (...a) => _send("info", a),
        };

        try {
          _send("info", ["Executing JavaScript..."]);

          ${code}

          _send("info", ["Execution completed successfully."]);
        } catch (err) {
          _send("error", [err.toString()]);
        } finally {
          window.parent.postMessage(
            {
              __cce: true,
              channel: ${JSON.stringify(channelId)},
              type: "__done",
            },
            "*"
          );
        }
      })();
    `;

    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <script>
            ${wrappedCode}
          <\/script>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "text/html",
    });

    const blobUrl = URL.createObjectURL(blob);

    const iframe = document.createElement("iframe");

    iframe.style.display = "none";
    iframe.sandbox = "allow-scripts";
    iframe.src = blobUrl;

    const cleanup = () => {
      clearTimeout(timeout);

      window.removeEventListener("message", onMessage);

      try {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (err) {
        console.error("Iframe cleanup failed:", err);
      }

      URL.revokeObjectURL(blobUrl);
    };

    const timeout = setTimeout(() => {
      logs.push({
        type: "warn",
        text: "Execution timed out after 10 seconds.",
      });

      cleanup();
      safeResolve(logs);
    }, 10000);

    const onMessage = (event) => {
      if (!event.data?.__cce) return;

      if (event.data.channel !== channelId) return;

      if (event.data.type === "__done") {
        cleanup();

        if (logs.length === 0) {
          logs.push({
            type: "info",
            text: "(no output)",
          });
        }

        safeResolve(logs);
      } else {
        logs.push({
          type: event.data.type,
          text: event.data.text,
        });
      }
    };

    window.addEventListener("message", onMessage);

    document.body.appendChild(iframe);
  });
}

// Global lock to prevent overlapping executions across remounts or multiple instances
let globalExecutionLock = false;

export function useCodeRunner() {
  const [isRunning, setIsRunning] = useState(globalExecutionLock);
  const [consoleLogs, setConsoleLogs] = useState([]);

  // Sync with global lock to prevent race conditions during rapid execution spam
  const isRunningRef = useRef(globalExecutionLock);

  // Ensure local state syncs with global lock on remounts
  useEffect(() => {
    isRunningRef.current = globalExecutionLock;
    setIsRunning(globalExecutionLock);
  }, []);

  const clearLogs = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  const run = useCallback(async (code, cmMode, fileName) => {
      // FIX: robust synchronous protection checking both global and local locks
      if (globalExecutionLock || isRunningRef.current) {
        setConsoleLogs((prev) => [
          ...prev,
          {
            type: "warn",
            text: "Another execution is already in progress.",
          },
        ]);

        return;
      }

      if (!code?.trim()) {
        setConsoleLogs((prev) => [
          ...prev,
          {
            type: "warn",
            text: "Nothing to run — file is empty.",
          },
        ]);

        return;
      }

      // FIX: acquire locks to prevent concurrent executions
      globalExecutionLock = true;
      isRunningRef.current = true;
      setIsRunning(true);

      const label = fileName
        ? `▶ ${fileName} · ${new Date().toLocaleTimeString()}`
        : `▶ Run · ${new Date().toLocaleTimeString()}`;

      setConsoleLogs((prev) => [
        ...prev,
        {
          type: "separator",
          text: label,
        },
      ]);

      const modeName =
        typeof cmMode === "object" ? cmMode.name : cmMode || "";

      const isJsonMode =
        typeof cmMode === "object" && cmMode.json === true;

      try {
        if (modeName === "javascript" && !isJsonMode) {
          const logs = await runJavaScript(code);

          setConsoleLogs((prev) => [...prev, ...logs]);
        } else if (isJsonMode) {
          setConsoleLogs((prev) => [
            ...prev,
            {
              type: "warn",
              text:
                "JSON files are not executable. Open a supported executable file instead.",
            },
          ]);
        } else if (modeName === "htmlmixed") {
          const blob = new Blob([code], {
            type: "text/html",
          });

          const url = URL.createObjectURL(blob);

          window.open(url, "_blank");

          setTimeout(() => {
            URL.revokeObjectURL(url);
          }, 5000);

          setConsoleLogs((prev) => [
            ...prev,
            {
              type: "info",
              text: "HTML preview opened in a new tab.",
            },
          ]);
        } else {
          const languageId = JUDGE0_LANGUAGE_IDS?.[modeName];

          if (!languageId) {
            setConsoleLogs((prev) => [
              ...prev,
              {
                type: "warn",
                text: `Execution not supported for: ${
                  modeName || "this language"
                }`,
              },
            ]);

            return;
          }

          const { stdout, stderr, status } =
            await runWithJudge0(code, languageId);

          const newLogs = [];

          if (stdout) {
            stdout.split("\n").forEach((line, i, arr) => {
              if (i < arr.length - 1 || line !== "") {
                newLogs.push({
                  type: "log",
                  text: line,
                });
              }
            });
          }

          if (stderr) {
            stderr.split("\n").forEach((line, i, arr) => {
              if (i < arr.length - 1 || line !== "") {
                newLogs.push({
                  type: "error",
                  text: line,
                });
              }
            });
          }

          if (newLogs.length === 0) {
            newLogs.push({
              type: "info",
              text: `(${status} — no output)`,
            });
          }

          setConsoleLogs((prev) => [...prev, ...newLogs]);
        }
      } catch (err) {
        setConsoleLogs((prev) => [
          ...prev,
          {
            type: "error",
            text: `Execution error: ${err.message}`,
          },
        ]);
      } finally {
        // FIX: safely release all execution locks
        globalExecutionLock = false;
        isRunningRef.current = false;
        setIsRunning(false);
      }
    }, []);

  return {
    run,
    isRunning,
    consoleLogs,
    clearLogs,
  };
}