/// <reference lib="webworker" />
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

let landmarker: HandLandmarker | null = null;
let initializing = false;

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

async function initialize(delegate: 'GPU' | 'CPU') {
  if (initializing) return;
  initializing = true;
  try {
    landmarker?.close();
    landmarker = null;
    const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
    landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.55,
      minHandPresenceConfidence: 0.55,
      minTrackingConfidence: 0.5,
    });
    self.postMessage({ type: 'READY', delegate });
  } catch (error) {
    self.postMessage({ type: 'INIT_ERROR', delegate, error: error instanceof Error ? error.message : String(error) });
  } finally {
    initializing = false;
  }
}

self.onmessage = async (event: MessageEvent) => {
  const data = event.data;

  if (data.type === 'INIT') {
    await initialize(data.delegate === 'CPU' ? 'CPU' : 'GPU');
    return;
  }

  if (data.type === 'FRAME') {
    const bitmap = data.bitmap as ImageBitmap;
    if (!landmarker) {
      bitmap.close();
      self.postMessage({ type: 'NOT_READY' });
      return;
    }

    const startedAt = performance.now();
    try {
      const result: HandLandmarkerResult = landmarker.detectForVideo(bitmap, data.timestamp);
      self.postMessage({ type: 'RESULT', result, inferenceTime: performance.now() - startedAt });
    } catch (error) {
      self.postMessage({ type: 'FRAME_ERROR', error: error instanceof Error ? error.message : String(error) });
    } finally {
      bitmap.close();
    }
  }
};
