import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const model = path.join(root, 'public', 'mediapipe', 'models', 'hand_landmarker.task');
const wasmDir = path.join(root, 'public', 'mediapipe', 'wasm');

let modelStat;
try { modelStat = await stat(model); } catch { throw new Error('Missing local Hand Landmarker model. Run npm run assets:mediapipe.'); }
if (modelStat.size < 100_000) throw new Error('Local Hand Landmarker model is unexpectedly small. Re-run npm run assets:mediapipe -- --refresh.');

let wasmFiles;
try { wasmFiles = await readdir(wasmDir); } catch { throw new Error('Missing local MediaPipe WASM directory. Run npm run assets:mediapipe.'); }
if (!wasmFiles.some((name) => name.endsWith('.wasm'))) throw new Error('No MediaPipe WASM binary found. Run npm run assets:mediapipe.');

console.log('mediapipe-assets: PASS');
