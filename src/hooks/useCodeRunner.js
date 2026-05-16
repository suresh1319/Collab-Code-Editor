import { useState, useCallback } from 'react';

const JUDGE0_LANGUAGE_IDS = {
    'python':           71,
    'text/x-java':      62,
    'text/x-csrc':      48,
    'text/x-c++src':    54,
    'text/x-csharp':    51,
    'php':              68,
    'shell':            46,
    'sql':              82,
};

const JUDGE0_BASE = 'https://ce.judge0.com';

async function runWithJudge0(code, languageId) {
    const res = await fetch(
        `${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ source_code: code, language_id: languageId }),
        }
    );

    if (!res.ok) throw new Error(`Judge0 error: ${res.status}`);

    const result = await res.json();
    return {
        stdout: result.stdout || '',
        stderr: result.stderr || result.compile_output || '',
        status: result.status?.description || 'Done',
    };
}

function runJavaScript(code) {
    const logs = [];
    const methods = ['log', 'warn', 'error', 'info'];
    const original = {};
    methods.forEach(m => {
        original[m] = console[m];
        console[m] = (...args) => {
            logs.push({
                type: m,
                text: args.map(a => {
                    try { return typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a); }
                    catch { return String(a); }
                }).join(' '),
            });
            original[m](...args);
        };
    });
    let errorLog = null;
    try {
        // eslint-disable-next-line no-new-func
        new Function(code)();
    } catch (err) {
        errorLog = { type: 'error', text: err.toString() };
    } finally {
        methods.forEach(m => { console[m] = original[m]; });
    }
    if (errorLog) logs.push(errorLog);
    if (logs.length === 0) logs.push({ type: 'info', text: '(no output)' });
    return logs;
}

export function useCodeRunner() {
    const [isRunning, setIsRunning] = useState(false);
    const [consoleLogs, setConsoleLogs] = useState([]);

    const clearLogs = useCallback(() => setConsoleLogs([]), []);

    const run = useCallback(async (code, cmMode, fileName) => {
        if (!code?.trim()) {
            setConsoleLogs(prev => [...prev, { type: 'warn', text: 'Nothing to run — file is empty.' }]);
            return;
        }

        setIsRunning(true);

        const label = fileName
            ? `▶ ${fileName} · ${new Date().toLocaleTimeString()}`
            : `▶ Run · ${new Date().toLocaleTimeString()}`;

        setConsoleLogs(prev => [...prev, { type: 'separator', text: label }]);

        const modeName = typeof cmMode === 'object' ? cmMode.name : (cmMode || '');

        try {
            if (modeName === 'javascript') {
                // ── JavaScript: run in-browser ────────────────────────────
                const logs = runJavaScript(code);
                setConsoleLogs(prev => [...prev, ...logs]);

            } else if (modeName === 'htmlmixed') {
                // ── HTML: render in a new browser tab ─────────────────────
                const blob = new Blob([code], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                // Free the object URL after the tab has had time to load it
                setTimeout(() => URL.revokeObjectURL(url), 5000);
                setConsoleLogs(prev => [...prev, {
                    type: 'info',
                    text: 'HTML preview opened in a new tab.',
                }]);

            } else {
                // ── Everything else: Judge0 ───────────────────────────────
                const languageId = JUDGE0_LANGUAGE_IDS[modeName];
                if (!languageId) {
                    setConsoleLogs(prev => [...prev, {
                        type: 'warn',
                        text: `Execution not supported for: ${modeName || 'this language'}`,
                    }]);
                    return;
                }
                const { stdout, stderr, status } = await runWithJudge0(code, languageId);
                const newLogs = [];
                if (stdout) stdout.split('\n').filter(Boolean).forEach(line => newLogs.push({ type: 'log', text: line }));
                if (stderr) stderr.split('\n').filter(Boolean).forEach(line => newLogs.push({ type: 'error', text: line }));
                if (newLogs.length === 0) newLogs.push({ type: 'info', text: `(${status} — no output)` });
                setConsoleLogs(prev => [...prev, ...newLogs]);
            }
        } catch (err) {
            setConsoleLogs(prev => [...prev, { type: 'error', text: `Execution error: ${err.message}` }]);
        } finally {
            setIsRunning(false);
        }
    }, []);

    return { run, isRunning, consoleLogs, clearLogs };
}