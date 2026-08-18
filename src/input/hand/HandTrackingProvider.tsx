import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { GestureEngine } from './gestures';
import { HandIdentityTracker } from './HandIdentityTracker';
import { handRuntime } from './handRuntime';
import type { TrackedHand } from './types';

const TARGET_FRAME_MS = 1000 / 30;
const INIT_TIMEOUT_MS = 12_000;

export function HandTrackingProvider({ children }: PropsWithChildren) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const initTimerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const readyRef = useRef(false);
  const delegateRef = useRef<'GPU' | 'CPU'>('GPU');
  const gestureEngineRef = useRef(new GestureEngine());
  const identityTrackerRef = useRef(new HandIdentityTracker());
  const [enabled, setEnabled] = useState(false);

  const clearTimers = useCallback(() => {
    if (frameTimerRef.current != null) window.clearTimeout(frameTimerRef.current);
    if (initTimerRef.current != null) window.clearTimeout(initTimerRef.current);
    frameTimerRef.current = null;
    initTimerRef.current = null;
  }, []);

  const stop = useCallback(() => {
    setEnabled(false);
    clearTimers();
    readyRef.current = false;
    busyRef.current = false;
    workerRef.current?.terminate();
    workerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    gestureEngineRef.current.reset();
    identityTrackerRef.current.reset();
    handRuntime.getState().setState({
      enabled: false,
      tracking: false,
      initializing: false,
      phase: 'idle',
      delegate: null,
      hands: [],
      error: null,
      inferenceTime: 0,
      droppedFrames: 0,
    });
  }, [clearTimers]);

  const scheduleFrame = useCallback(() => {
    if (!enabled) return;
    frameTimerRef.current = window.setTimeout(async () => {
      const video = videoRef.current;
      const worker = workerRef.current;

      if (document.hidden || !readyRef.current || !video || !worker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        scheduleFrame();
        return;
      }

      if (busyRef.current) {
        handRuntime.getState().setState({ droppedFrames: handRuntime.getState().droppedFrames + 1 });
        scheduleFrame();
        return;
      }

      try {
        busyRef.current = true;
        const bitmap = await createImageBitmap(video);
        worker.postMessage({ type: 'FRAME', bitmap, timestamp: performance.now() }, [bitmap]);
      } catch (error) {
        busyRef.current = false;
        handRuntime.getState().setState({ error: error instanceof Error ? error.message : String(error) });
      }

      scheduleFrame();
    }, TARGET_FRAME_MS);
  }, [enabled]);

  const start = useCallback(async () => {
    if (enabled) return;
    setEnabled(true);
    handRuntime.getState().setState({
      enabled: true,
      tracking: false,
      initializing: true,
      phase: 'requesting-camera',
      delegate: null,
      error: null,
      droppedFrames: 0,
    });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Camera preview was not mounted.');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const bootWorker = (delegate: 'GPU' | 'CPU') => {
        workerRef.current?.terminate();
        readyRef.current = false;
        busyRef.current = false;
        delegateRef.current = delegate;
        handRuntime.getState().setState({
          initializing: true,
          phase: delegate === 'GPU' ? 'initializing' : 'recovering',
          delegate,
          error: null,
        });

        const worker = new Worker(new URL('./hand-landmarker.worker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        if (initTimerRef.current != null) window.clearTimeout(initTimerRef.current);
        initTimerRef.current = window.setTimeout(() => {
          if (readyRef.current) return;
          if (delegate === 'GPU') bootWorker('CPU');
          else handRuntime.getState().setState({ initializing: false, phase: 'error', error: 'Hand tracker initialization timed out.' });
        }, INIT_TIMEOUT_MS);

        worker.onmessage = (event) => {
          const data = event.data;

          if (data.type === 'READY') {
            if (initTimerRef.current != null) window.clearTimeout(initTimerRef.current);
            initTimerRef.current = null;
            readyRef.current = true;
            busyRef.current = false;
            handRuntime.getState().setState({ initializing: false, phase: 'ready', delegate: data.delegate ?? delegate, error: null });
            return;
          }

          if (data.type === 'RESULT') {
            busyRef.current = false;
            const result = data.result;
            const detections = (result.landmarks ?? []).map((landmarks: any[], index: number) => ({
              handedness: (result.handedness?.[index]?.[0]?.categoryName ?? 'Unknown') as TrackedHand['handedness'],
              landmarks,
              worldLandmarks: result.worldLandmarks?.[index] ?? [],
              score: result.handedness?.[index]?.[0]?.score ?? 0,
            }));
            const tracked = identityTrackerRef.current.update(detections);
            const hands = tracked.map((hand, index) => gestureEngineRef.current.analyze(hand, index));
            handRuntime.getState().setState({
              tracking: hands.length > 0,
              phase: hands.length > 0 ? 'tracking' : 'ready',
              hands,
              inferenceTime: data.inferenceTime ?? 0,
              error: null,
            });
            return;
          }

          if (data.type === 'NOT_READY') {
            busyRef.current = false;
            return;
          }

          if (data.type === 'INIT_ERROR') {
            busyRef.current = false;
            if (delegate === 'GPU') {
              bootWorker('CPU');
            } else {
              handRuntime.getState().setState({ initializing: false, phase: 'error', error: data.error || 'Hand tracker failed to initialize.' });
            }
            return;
          }

          if (data.type === 'FRAME_ERROR') {
            busyRef.current = false;
            handRuntime.getState().setState({ error: data.error || 'Hand tracking frame failed.' });
          }
        };

        worker.onerror = (event) => {
          busyRef.current = false;
          if (delegate === 'GPU') bootWorker('CPU');
          else handRuntime.getState().setState({ initializing: false, phase: 'error', error: event.message || 'Hand tracking worker crashed.' });
        };

        worker.postMessage({ type: 'INIT', delegate });
      };

      bootWorker('GPU');
    } catch (error) {
      setEnabled(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      handRuntime.getState().setState({
        enabled: false,
        initializing: false,
        phase: 'error',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) scheduleFrame();
    return clearTimers;
  }, [enabled, scheduleFrame, clearTimers]);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden && enabled && readyRef.current) handRuntime.getState().setState({ phase: handRuntime.getState().hands.length ? 'tracking' : 'ready' });
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [enabled]);

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
