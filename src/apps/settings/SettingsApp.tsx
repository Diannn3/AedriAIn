import { useMemo, useState, useSyncExternalStore } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { handRuntime } from '../../input/hand/handRuntime';
import { db } from '../../storage/db';
import {
  ACTIVE_GESTURE_PROFILE_KEY,
  DEFAULT_GESTURE_PROFILE_ID,
  REDUCED_MOTION_KEY,
  UI_SCALE_KEY,
} from '../../storage/defaults';
import {
  createGestureProfile,
  setActiveGestureProfile,
  setReducedMotion,
  setUiScale,
  updateGestureProfile,
} from '../../storage/resources';

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

async function samplePinchStrength(preferredHand: 'left' | 'right' | 'automatic', durationMs = 1600) {
  const values: number[] = [];
  const startedAt = performance.now();
  while (performance.now() - startedAt < durationMs) {
    const hands = handRuntime.getState().hands;
    const preferredLabel = preferredHand === 'left' ? 'Left' : preferredHand === 'right' ? 'Right' : null;
    const hand = (preferredLabel ? hands.find((item) => item.handedness === preferredLabel) : null) ?? hands[0];
    if (hand && Number.isFinite(hand.pinchStrength)) values.push(hand.pinchStrength);
    await new Promise((resolve) => window.setTimeout(resolve, 55));
  }
  return values;
}

export function SettingsApp() {
  const profiles = useLiveQuery(() => db.gestureProfiles.orderBy('updatedAt').reverse().toArray(), [], []);
  const activeSetting = useLiveQuery(() => db.settings.get(ACTIVE_GESTURE_PROFILE_KEY), []);
  const uiScaleSetting = useLiveQuery(() => db.settings.get(UI_SCALE_KEY), []);
  const reducedMotionSetting = useLiveQuery(() => db.settings.get(REDUCED_MOTION_KEY), []);
  const handState = useSyncExternalStore(handRuntime.subscribe, handRuntime.getState, handRuntime.getState);
  const activeId = typeof activeSetting?.value === 'string' ? activeSetting.value : DEFAULT_GESTURE_PROFILE_ID;
  const activeProfile = useMemo(() => (profiles ?? []).find((profile) => profile.id === activeId) ?? (profiles ?? [])[0], [activeId, profiles]);
  const [sampling, setSampling] = useState<'open' | 'pinch' | null>(null);
  const [openMedian, setOpenMedian] = useState<number | null>(null);
  const [calibrationMessage, setCalibrationMessage] = useState('Enable hands, then sample an open hand and a natural pinch.');

  const patchProfile = async (patch: Parameters<typeof updateGestureProfile>[1]) => {
    if (!activeProfile) return;
    await updateGestureProfile(activeProfile.id, patch);
  };

  const sampleOpen = async () => {
    setSampling('open');
    setCalibrationMessage('Hold thumb and index naturally apart…');
    const result = median(await samplePinchStrength(activeProfile?.preferredHand ?? 'automatic'));
    setSampling(null);
    if (result == null) {
      setCalibrationMessage('No tracked hand samples. Enable hands and try again.');
      return;
    }
    setOpenMedian(result);
    setCalibrationMessage(`Open sample ${result.toFixed(3)} captured. Now hold a comfortable pinch.`);
  };

  const samplePinch = async () => {
    if (!activeProfile) return;
    setSampling('pinch');
    setCalibrationMessage('Hold a comfortable thumb/index pinch…');
    const pinchMedian = median(await samplePinchStrength(activeProfile.preferredHand));
    setSampling(null);
    if (pinchMedian == null) {
      setCalibrationMessage('No tracked hand samples. Enable hands and try again.');
      return;
    }
    if (openMedian == null) {
      setCalibrationMessage('Capture the open-hand sample first.');
      return;
    }
    if (openMedian - pinchMedian < 0.08) {
      setCalibrationMessage('The two samples were too similar. Repeat with a clearly open hand, then a natural pinch.');
      return;
    }
    const delta = openMedian - pinchMedian;
    const pinchOn = Math.max(0.12, Math.min(0.42, pinchMedian + delta * 0.30));
    const pinchOff = Math.max(pinchOn + 0.05, Math.min(0.62, pinchMedian + delta * 0.62));
    await updateGestureProfile(activeProfile.id, { pinchOn, pinchOff });
    setCalibrationMessage(`Calibrated · ON ${pinchOn.toFixed(3)} · OFF ${pinchOff.toFixed(3)}`);
  };

  return (
    <div className="settings-app">
      <section className="settings-section">
        <header><b>GESTURES</b><span>{handState.phase.replaceAll('-', ' ').toUpperCase()}</span></header>
        <label>PROFILE
          <select aria-label="Gesture profile" value={activeId} onChange={(event) => void setActiveGestureProfile(event.target.value)}>
            {(profiles ?? []).map((profile) => <option value={profile.id} key={profile.id}>{profile.name}</option>)}
          </select>
        </label>
        <div className="settings-inline-actions">
          <button onClick={async () => { const profile = await createGestureProfile(`Profile ${(profiles?.length ?? 0) + 1}`); await setActiveGestureProfile(profile.id); }}>NEW PROFILE</button>
        </div>
        {activeProfile && <>
          <label>PREFERRED HAND
            <select aria-label="Preferred hand" value={activeProfile.preferredHand} onChange={(event) => void patchProfile({ preferredHand: event.target.value as typeof activeProfile.preferredHand })}>
              <option value="automatic">Automatic</option><option value="left">Left</option><option value="right">Right</option>
            </select>
          </label>
          <label>POINTER SMOOTHING <output>{activeProfile.pointerSmoothing.toFixed(2)}</output>
            <input aria-label="Pointer smoothing" type="range" min="0.08" max="0.9" step="0.02" value={activeProfile.pointerSmoothing} onChange={(event) => void patchProfile({ pointerSmoothing: Number(event.target.value) })} />
          </label>
          <label>DRAG SMOOTHING <output>{activeProfile.dragSmoothing.toFixed(2)}</output>
            <input aria-label="Drag smoothing" type="range" min="0.08" max="0.9" step="0.02" value={activeProfile.dragSmoothing} onChange={(event) => void patchProfile({ dragSmoothing: Number(event.target.value) })} />
          </label>
          <label>SENSITIVITY <output>{activeProfile.sensitivity.toFixed(2)}×</output>
            <input aria-label="Gesture sensitivity" type="range" min="0.55" max="1.8" step="0.05" value={activeProfile.sensitivity} onChange={(event) => void patchProfile({ sensitivity: Number(event.target.value) })} />
          </label>
          <div className="calibration-panel">
            <div><b>PINCH CALIBRATION</b><small>{calibrationMessage}</small></div>
            <div className="settings-inline-actions">
              <button disabled={sampling != null} onClick={() => void sampleOpen()}>{sampling === 'open' ? 'SAMPLING…' : '1 · SAMPLE OPEN'}</button>
              <button disabled={sampling != null || openMedian == null} onClick={() => void samplePinch()}>{sampling === 'pinch' ? 'SAMPLING…' : '2 · SAMPLE PINCH'}</button>
            </div>
            <small>Current thresholds · {activeProfile.pinchOn.toFixed(3)} / {activeProfile.pinchOff.toFixed(3)}</small>
          </div>
        </>}
      </section>

      <section className="settings-section">
        <header><b>INTERFACE</b><span>ACCESSIBILITY FOUNDATION</span></header>
        <label>UI TEXT SCALE <output>{Math.round(Number(uiScaleSetting?.value ?? 1) * 100)}%</output>
          <input aria-label="UI text scale" type="range" min="0.9" max="1.3" step="0.05" value={Number(uiScaleSetting?.value ?? 1)} onChange={(event) => void setUiScale(Number(event.target.value))} />
        </label>
        <label className="settings-check"><input aria-label="Reduce motion" type="checkbox" checked={Boolean(reducedMotionSetting?.value ?? false)} onChange={(event) => void setReducedMotion(event.target.checked)} /> REDUCE NON-ESSENTIAL MOTION</label>
      </section>

      <section className="settings-section settings-section--status">
        <header><b>CAMERA / TRACKER</b><span>{handState.delegate ?? 'OFF'}</span></header>
        <div>PHASE <b>{handState.phase.toUpperCase()}</b></div>
        <div>INFERENCE <b>{handState.inferenceFps.toFixed(1)} FPS · {handState.inferenceTime.toFixed(1)} MS</b></div>
        {handState.error && <div className="inline-error">{handState.error}</div>}
      </section>
    </div>
  );
}
