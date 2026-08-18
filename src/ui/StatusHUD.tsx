import { useEffect, useState } from 'react';
import { handRuntime, type HandRuntimeState } from '../input/hand/handRuntime';

export function StatusHUD() {
  const [hand, setHand] = useState<HandRuntimeState>(() => handRuntime.getState());
  useEffect(() => handRuntime.subscribe(setHand), []);
  return (
    <div className="status-hud">
      <div><small>INPUT</small><b>{hand.enabled ? (hand.tracking ? `${hand.hands.length} HAND${hand.hands.length > 1 ? 'S' : ''}` : 'SEARCHING') : 'MOUSE'}</b></div>
      <div><small>VISION</small><b>{hand.initializing ? 'BOOTING' : hand.error ? 'ERROR' : hand.enabled ? `${hand.inferenceTime.toFixed(0)} MS` : 'STANDBY'}</b></div>
      <div><small>RENDER</small><b>SPATIAL 0.1</b></div>
    </div>
  );
}
