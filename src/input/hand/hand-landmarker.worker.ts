/// <reference lib="webworker" />
import { FilesetResolver, HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';

let landmarker: HandLandmarker | null = null;
let initializing = false;

async function initialize(delegate: 'GPU' | 'CPU', wasmRoot: string, modelUrl: string) {
  if (initializing) return;
  initializing = true;
  try {
    landmarker?.close();
    landmarker = null;
    const fileset = await FilesetResolver.forVisionTasks(wasmRoot);
    const modelResponse = await fetch(modelUrl);
    if (!modelResponse.ok) throw new Error(`Hand model request failed (${modelResponse.status}). Run npm run assets:mediapipe.`);
    const modelBuffer = await modelResponse.arrayBuffer();
    landmarker = await HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: new Uint8Array(modelBuffer), delegate },
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
    await initialize(data.delegate === 'CPU' ? 'CPU' : 'GPU', String(data.wasmRoot), String(data.modelUrl));
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
