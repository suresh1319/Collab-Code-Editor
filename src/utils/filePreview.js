const IMAGE_MIME_BY_EXT = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

const BINARY_EXTS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'ico',
  'webp',
  'bmp',
  'mp4',
  'mp3',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'pdf',
  'zip',
]);

export function getMimeTypeFromFilename(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  return ext ? IMAGE_MIME_BY_EXT[ext] || null : null;
}

export function isImageMimeType(mimeType = '') {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('image/');
}

export function isBinaryFileName(name = '') {
  const ext = name.split('.').pop()?.toLowerCase();
  return !!ext && BINARY_EXTS.has(ext);
}

export function parseDataUrl(value = '') {
  if (typeof value !== 'string' || !value.startsWith('data:')) return null;
  const match = value.match(/^data:([^;,]+)?(?:;(base64))?,([\s\S]*)$/);
  if (!match) return null;

  return {
    mimeType: match[1] || 'text/plain',
    isBase64: match[2] === 'base64',
    data: match[3],
  };
}

export function decodeDataUrlContent(value = '') {
  const parsed = parseDataUrl(value);
  if (!parsed) return null;

  if (parsed.isBase64) {
    return {
      mimeType: parsed.mimeType,
      content: parsed.data,
      isBase64: true,
    };
  }

  let content = parsed.data;
  try {
    content = decodeURIComponent(parsed.data);
  } catch {
    content = parsed.data;
  }

  return {
    mimeType: parsed.mimeType,
    content,
    isBase64: false,
  };
}
