import { cp, copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = path.join(root, 'node_modules', 'pdfjs-dist');
const outputRoot = path.join(root, 'public', 'pdfjs');

async function ensureExists(target, label) {
  try {
    await stat(target);
  } catch {
    throw new Error(`${label} was not found at ${target}. Run npm install first.`);
  }
}

await ensureExists(packageRoot, 'pdfjs-dist');
await mkdir(outputRoot, { recursive: true });

const workerCandidates = [
  path.join(packageRoot, 'build', 'pdf.worker.min.mjs'),
  path.join(packageRoot, 'build', 'pdf.worker.mjs'),
];
let workerSource = null;
for (const candidate of workerCandidates) {
  try {
    await stat(candidate);
    workerSource = candidate;
    break;
  } catch { /* try the next package layout */ }
}
if (!workerSource) throw new Error('Could not locate the PDF.js module worker in pdfjs-dist/build.');
await copyFile(workerSource, path.join(outputRoot, 'pdf.worker.min.mjs'));

const supportDirectories = ['cmaps', 'standard_fonts', 'wasm', 'iccs'];
for (const directory of supportDirectories) {
  const source = path.join(packageRoot, directory);
  const destination = path.join(outputRoot, directory);
  await ensureExists(source, `pdfjs-dist/${directory}`);
  await mkdir(destination, { recursive: true });
  await cp(source, destination, { recursive: true, force: true });
}

console.log(`PDF.js assets staged from ${packageRoot} -> ${outputRoot}`);
