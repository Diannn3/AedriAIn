import { cp, mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const wasmSource = path.join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const wasmTarget = path.join(root, 'public', 'mediapipe', 'wasm');
const modelTarget = path.join(root, 'public', 'mediapipe', 'models', 'hand_landmarker.task');
const modelUrl = process.env.MEDIAPIPE_HAND_MODEL_URL || 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const refresh = process.argv.includes('--refresh');

async function exists(filePath) {
  try { await stat(filePath); return true; } catch { return false; }
}

await mkdir(wasmTarget, { recursive: true });
await mkdir(path.dirname(modelTarget), { recursive: true });

if (!(await exists(wasmSource))) {
  throw new Error('MediaPipe WASM source is missing. Run npm install before npm run assets:mediapipe.');
}

await cp(wasmSource, wasmTarget, { recursive: true, force: true });

if (refresh || !(await exists(modelTarget))) {
  const response = await fetch(modelUrl);
  if (!response.ok) throw new Error(`Could not download Hand Landmarker model: ${response.status} ${response.statusText}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength < 100_000) throw new Error('Downloaded Hand Landmarker model looks unexpectedly small.');
  await writeFile(modelTarget, buffer);
}

const modelStats = await stat(modelTarget);
console.log(`MediaPipe assets ready: WASM copied, model ${(modelStats.size / 1024 / 1024).toFixed(1)} MB.`);
