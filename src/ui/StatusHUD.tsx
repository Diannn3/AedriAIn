import { useEffect, useState } from 'react';
import { handRuntime, type HandRuntimeState } from '../input/hand/handRuntime';

export function StatusHUD() {
  const [hand, setHand] = useState<HandRuntimeState>(() => handRuntime.getState());
  useEffect(() => handRuntime.subscribe(setHand), []);
  const input = hand.enabled ? (hand.tracking ? `${hand.hands.length} HAND${hand.hands.length > 1 ? 'S' : ''}` : hand.phase.toUpperCase()) : 'MOUSE';
  const vision = hand.error ? 'ERROR' : hand.enabled ? `${hand.delegate ?? '—'} · ${hand.inferenceTime.toFixed(0)} MS` : 'STANDBY';
  return (
    <div className="status-hud">
      <div><small>INPUT</small><b>{input}</b></div>
      <div><small>VISION</small><b>{vision}</b></div>
      <div><small>FRAMES</small><b>{hand.enabled ? `${hand.droppedFrames} DROP` : '—'}</b></div>
      <div><small>CORE</small><b>SPATIAL V2</b></div>
    </div>
  );
}
