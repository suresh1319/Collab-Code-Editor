export const BINARY_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp',
  'mp4', 'mp3', 'woff', 'woff2', 'ttf', 'eot', 'pdf', 'zip'
]);

export const IMAGE_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp'
]);

export function getExtension(name = '') {
  if (!name) return '';
  const parts = name.split('.');
  if (parts.length === 1 || (parts[0] === '' && parts.length === 2)) {
    return ''; // No extension
  }
  return parts.pop().toLowerCase();
}

export function isBinary(name = '') {
  return BINARY_EXTS.has(getExtension(name));
}

export function isImage(name = '') {
  return IMAGE_EXTS.has(getExtension(name));
}

export function getModeFromFilename(name = "") {
  const ext = getExtension(name);
  if (IMAGE_EXTS.has(ext)) return "IMAGE";
  if (BINARY_EXTS.has(ext)) return "BINARY";

  const modeMap = {
    js: { name: "javascript", json: false },
    jsx: { name: "javascript", json: false },
    ts: { name: "javascript", json: false },
    tsx: { name: "javascript", json: false },
    json: { name: "javascript", json: true },
    html: "htmlmixed",
    htm: "htmlmixed",
    xml: "xml",
    svg: "xml",
    css: "css",
    scss: "css",
    py: "python",
    md: "markdown",
    markdown: "markdown",
    sh: "shell",
    bash: "shell",
    sql: "sql",
    php: "php",
    c: "text/x-csrc",
    cpp: "text/x-c++src",
    java: "text/x-java",
    cs: "text/x-csharp",
  };
  return modeMap[ext] || "text/plain";
}
