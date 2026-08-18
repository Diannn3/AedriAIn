import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { GestureEngine } from './gestures';
import { handRuntime } from './handRuntime';
import type { TrackedHand } from './types';

const TARGET_FRAME_MS = 1000 / 30;

export function HandTrackingProvider({ children }: PropsWithChildren) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const gestureEngineRef = useRef(new GestureEngine());
  const [enabled, setEnabled] = useState(false);

  const stop = useCallback(() => {
    setEnabled(false);
    if (frameTimerRef.current != null) window.clearTimeout(frameTimerRef.current);
    frameTimerRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    gestureEngineRef.current.reset();
    handRuntime.getState().setState({ enabled: false, tracking: false, initializing: false, hands: [], error: null });
  }, []);

  const scheduleFrame = useCallback(() => {
    if (!enabled) return;
    frameTimerRef.current = window.setTimeout(async () => {
      const video = videoRef.current;
      const worker = workerRef.current;
      if (!video || !worker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || busyRef.current) {
        scheduleFrame();
        return;
      }
      try {
        busyRef.current = true;
        const bitmap = await createImageBitmap(video);
        worker.postMessage({ type: 'FRAME', bitmap, timestamp: performance.now() }, [bitmap]);
      } catch {
        busyRef.current = false;
      }
      scheduleFrame();
    }, TARGET_FRAME_MS);
  }, [enabled]);

  const start = useCallback(async () => {
    if (enabled) return;
    setEnabled(true);
    handRuntime.getState().setState({ enabled: true, initializing: true, error: null });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Camera preview was not mounted.');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const worker = new Worker(new URL('./hand-landmarker.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = (event) => {
        const data = event.data;
        if (data.type === 'READY') {
          handRuntime.getState().setState({ initializing: false });
          busyRef.current = false;
          return;
        }
        if (data.type === 'RESULT') {
          busyRef.current = false;
          const result = data.result;
          const tracked: TrackedHand[] = (result.landmarks ?? []).map((landmarks: any[], index: number) => ({
            handedness: (result.handedness?.[index]?.[0]?.categoryName ?? 'Unknown') as TrackedHand['handedness'],
            landmarks,
            worldLandmarks: result.worldLandmarks?.[index] ?? [],
            score: result.handedness?.[index]?.[0]?.score ?? 0,
          }));
          const hands = tracked.map((hand, index) => gestureEngineRef.current.analyze(hand, index));
          handRuntime.getState().setState({ tracking: hands.length > 0, hands, inferenceTime: data.inferenceTime ?? 0, error: null });
          return;
        }
        if (data.type === 'INIT_ERROR' || data.type === 'FRAME_ERROR') {
          busyRef.current = false;
          handRuntime.getState().setState({ error: data.error || 'Hand tracking error', initializing: false });
        }
      };
      worker.postMessage({ type: 'INIT', delegate: 'GPU' });
    } catch (error) {
      setEnabled(false);
      handRuntime.getState().setState({ enabled: false, initializing: false, error: error instanceof Error ? error.message : String(error) });
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) scheduleFrame();
    return () => {
      if (frameTimerRef.current != null) window.clearTimeout(frameTimerRef.current);
    };
  }, [enabled, scheduleFrame]);

  useEffect(() => stop, [stop]);

  return (
    <>
      {children}
      <video ref={videoRef} className={`camera-feed ${enabled ? 'camera-feed--active' : ''}`} muted playsInline aria-hidden="true" />
      <button className={`camera-toggle ${enabled ? 'camera-toggle--active' : ''}`} onClick={enabled ? stop : start} type="button">
        <span className="camera-toggle__dot" />
        {enabled ? 'Disable hands' : 'Enable hands'}
      </button>
    </>
  );
}
