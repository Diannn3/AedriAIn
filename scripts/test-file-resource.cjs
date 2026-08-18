const assert = require('node:assert/strict');
const { mimeTypeFor, parseSingleRange } = require('../electron/file-resource.cjs');

assert.deepEqual(parseSingleRange('bytes=0-99', 1000), { start: 0, end: 99 });
assert.deepEqual(parseSingleRange('bytes=100-', 1000), { start: 100, end: 999 });
assert.deepEqual(parseSingleRange('bytes=-50', 1000), { start: 950, end: 999 });
assert.deepEqual(parseSingleRange('bytes=950-5000', 1000), { start: 950, end: 999 });
assert.equal(parseSingleRange('bytes=100-50', 1000), null);
assert.equal(parseSingleRange('bytes=0-1,4-5', 1000), null);
assert.equal(parseSingleRange('items=0-10', 1000), null);
assert.equal(parseSingleRange('bytes=0-1', 0), null);
assert.equal(mimeTypeFor('paper.PDF'), 'application/pdf');
assert.equal(mimeTypeFor('notes.md'), 'text/plain; charset=utf-8');
assert.equal(mimeTypeFor('unknown.bin'), 'application/octet-stream');
console.log('file-resource: PASS');
