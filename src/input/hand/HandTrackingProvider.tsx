import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { GestureEngine } from './gestures';
import { db } from '../../storage/db';
import { ACTIVE_GESTURE_PROFILE_KEY, DEFAULT_GESTURE_PROFILE_ID, defaultGestureProfile } from '../../storage/defaults';
import { gestureProfileRuntime } from './gestureProfileRuntime';
import { HandIdentityTracker } from './HandIdentityTracker';
import { handRuntime } from './handRuntime';
import type { TrackedHand } from './types';

const TARGET_FRAME_MS = 1000 / 30;
const INIT_TIMEOUT_MS = 12_000;

const assetUrl = (path: string) => new URL(path, document.baseURI).toString();

export function HandTrackingProvider({ children }: PropsWithChildren) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const initTimerRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const readyRef = useRef(false);
  const lastResultAtRef = useRef<number | null>(null);
  const inferenceFpsRef = useRef(0);
  const gestureEngineRef = useRef(new GestureEngine());
  const identityTrackerRef = useRef(new HandIdentityTracker());
  const [enabled, setEnabled] = useState(false);
  const activeProfileSetting = useLiveQuery(() => db.settings.get(ACTIVE_GESTURE_PROFILE_KEY), []);
  const activeProfileId = typeof activeProfileSetting?.value === 'string' ? activeProfileSetting.value : DEFAULT_GESTURE_PROFILE_ID;
  const activeProfile = useLiveQuery(() => db.gestureProfiles.get(activeProfileId), [activeProfileId]) ?? defaultGestureProfile;

  useEffect(() => {
    gestureEngineRef.current.updateConfig({
      pinchOn: activeProfile.pinchOn,
      pinchOff: activeProfile.pinchOff,
      pointerSmoothing: activeProfile.pointerSmoothing,
      dragSmoothing: activeProfile.dragSmoothing,
      sensitivity: activeProfile.sensitivity,
    });
    gestureEngineRef.current.reset();
    gestureProfileRuntime.getState().setProfile(activeProfile);
  }, [activeProfile]);

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
    lastResultAtRef.current = null;
    inferenceFpsRef.current = 0;
    handRuntime.getState().setState({
      enabled: false,
      tracking: false,
      initializing: false,
      phase: 'idle',
      delegate: null,
      hands: [],
      error: null,
      inferenceTime: 0,
      inferenceFps: 0,
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
      inferenceFps: 0,
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

      const failTracker = (phase: 'device-lost' | 'error', message: string) => {
        readyRef.current = false;
        busyRef.current = false;
        if (initTimerRef.current != null) window.clearTimeout(initTimerRef.current);
        initTimerRef.current = null;
        workerRef.current?.terminate();
        workerRef.current = null;
        streamRef.current?.getTracks().forEach((track) => { if (track.readyState !== 'ended') track.stop(); });
        streamRef.current = null;
        if (videoRef.current) videoRef.current.srcObject = null;
        gestureEngineRef.current.reset();
        identityTrackerRef.current.reset();
        lastResultAtRef.current = null;
        inferenceFpsRef.current = 0;
        setEnabled(false);
        handRuntime.getState().setState({
          enabled: false,
          tracking: false,
          initializing: false,
          phase,
          hands: [],
          error: message,
          inferenceFps: 0,
        });
      };

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => {
          failTracker('device-lost', 'Camera stream ended or the camera was disconnected.');
        }, { once: true });
      }

      const wasmRoot = assetUrl('mediapipe/wasm/');
      const modelUrl = assetUrl('mediapipe/models/hand_landmarker.task');

      const bootWorker = (delegate: 'GPU' | 'CPU') => {
        workerRef.current?.terminate();
        readyRef.current = false;
        busyRef.current = false;
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
          else failTracker('error', 'Hand tracker initialization timed out.');
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
            const now = performance.now();
            if (lastResultAtRef.current != null) {
              const instantFps = 1000 / Math.max(now - lastResultAtRef.current, 1);
              inferenceFpsRef.current = inferenceFpsRef.current ? inferenceFpsRef.current * 0.72 + instantFps * 0.28 : instantFps;
            }
            lastResultAtRef.current = now;
            handRuntime.getState().setState({
              tracking: hands.length > 0,
              phase: hands.length > 0 ? 'tracking' : 'ready',
              hands,
              inferenceTime: data.inferenceTime ?? 0,
              inferenceFps: inferenceFpsRef.current,
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
              failTracker('error', data.error || 'Hand tracker failed to initialize.');
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
          else failTracker('error', event.message || 'Hand tracking worker crashed.');
        };

        worker.postMessage({ type: 'INIT', delegate, wasmRoot, modelUrl });
      };

      bootWorker('GPU');
    } catch (error) {
      setEnabled(false);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      const name = error instanceof DOMException ? error.name : '';
      const phase = name === 'NotAllowedError' || name === 'SecurityError'
        ? 'permission-denied'
        : name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'NotReadableError'
          ? 'device-unavailable'
          : 'error';
      handRuntime.getState().setState({
        enabled: false,
        tracking: false,
        initializing: false,
        phase,
        hands: [],
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
