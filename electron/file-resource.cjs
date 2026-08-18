const path = require('node:path');

function mimeTypeFor(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case '.pdf': return 'application/pdf';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.webp': return 'image/webp';
    case '.gif': return 'image/gif';
    case '.txt':
    case '.md': return 'text/plain; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

function parseSingleRange(rangeHeader, size) {
  if (!Number.isInteger(size) || size < 0) return null;
  if (!rangeHeader || !rangeHeader.startsWith('bytes=')) return null;
  const rawValue = rangeHeader.slice(6).trim();
  if (!rawValue || rawValue.includes(',')) return null;
  const [rawStart, rawEnd] = rawValue.split('-', 2);
  if (rawEnd == null) return null;

  let start;
  let end;
  if (rawStart === '') {
    const suffix = Number(rawEnd);
    if (!Number.isInteger(suffix) || suffix <= 0 || size === 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === '' ? size - 1 : Number(rawEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end)) return null;
  }

  if (start < 0 || start >= size || end < start) return null;
  return { start, end: Math.min(end, size - 1) };
}

module.exports = { mimeTypeFor, parseSingleRange };
