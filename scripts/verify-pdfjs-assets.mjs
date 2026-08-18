import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pdfRoot = path.join(root, 'public', 'pdfjs');
const requiredFile = path.join(pdfRoot, 'pdf.worker.min.mjs');
const requiredDirectories = ['cmaps', 'standard_fonts', 'wasm', 'iccs'];

async function fail(message) {
  console.error(`PDF.js assets are not staged: ${message}`);
  console.error('Run `npm run assets:pdfjs` after `npm install`.');
  process.exit(1);
}

try {
  const info = await stat(requiredFile);
  if (!info.isFile() || info.size < 100_000) await fail('pdf.worker.min.mjs is missing or incomplete.');
} catch {
  await fail('pdf.worker.min.mjs is missing.');
}

for (const directory of requiredDirectories) {
  try {
    const entries = (await readdir(path.join(pdfRoot, directory))).filter((name) => !name.startsWith('.'));
    if (!entries.length) await fail(`${directory}/ is empty.`);
  } catch {
    await fail(`${directory}/ is missing.`);
  }
}

console.log('PDF.js assets: PASS');
