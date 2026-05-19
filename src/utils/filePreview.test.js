import {
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
});
