/// <reference lib="webworker" />
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

let landmarker: HandLandmarker | null = null;

const WASM_ROOT = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task';

self.onmessage = async (event: MessageEvent) => {
  const data = event.data;
  if (data.type === 'INIT') {
    try {
      const fileset = await FilesetResolver.forVisionTasks(WASM_ROOT);
      landmarker = await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: data.delegate === 'CPU' ? 'CPU' : 'GPU' },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.5,
      });
      self.postMessage({ type: 'READY' });
    } catch (error) {
      self.postMessage({ type: 'INIT_ERROR', error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (data.type === 'FRAME') {
    const bitmap = data.bitmap as ImageBitmap;
    if (!landmarker) {
      bitmap.close();
      return;
    }
    const startedAt = performance.now();
    try {
      const result: HandLandmarkerResult = landmarker.detectForVideo(bitmap, data.timestamp);
      bitmap.close();
      self.postMessage({ type: 'RESULT', result, inferenceTime: performance.now() - startedAt });
    } catch (error) {
      bitmap.close();
      self.postMessage({ type: 'FRAME_ERROR', error: error instanceof Error ? error.message : String(error) });
    }
  }
};
