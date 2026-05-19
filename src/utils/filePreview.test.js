import {
  decodeDataUrlContent,
  getMimeTypeFromFilename,
  isBinaryFileName,
  isImageMimeType,
  parseDataUrl,
} from './filePreview';

describe('filePreview helpers', () => {
  test('detects image mime type from filename', () => {
    expect(getMimeTypeFromFilename('diagram.PNG')).toBe('image/png');
    expect(getMimeTypeFromFilename('photo.jpeg')).toBe('image/jpeg');
    expect(getMimeTypeFromFilename('notes.txt')).toBeNull();
  });

  test('identifies binary file names', () => {
    expect(isBinaryFileName('avatar.png')).toBe(true);
    expect(isBinaryFileName('archive.zip')).toBe(true);
    expect(isBinaryFileName('index.js')).toBe(false);
  });

  test('recognizes image mime types', () => {
    expect(isImageMimeType('image/webp')).toBe(true);
    expect(isImageMimeType('text/plain')).toBe(false);
  });

  test('parses base64 data urls', () => {
    expect(parseDataUrl('data:image/png;base64,QUJD')).toEqual({
      mimeType: 'image/png',
      isBase64: true,
      data: 'QUJD',
    });
  });

  test('decodes non-base64 svg data urls', () => {
    expect(
      decodeDataUrlContent('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%201%201%22%3E%3C%2Fsvg%3E')
    ).toEqual({
      mimeType: 'image/svg+xml',
      content: '<svg viewBox="0 0 1 1"></svg>',
      isBase64: false,
    });
  });
});
