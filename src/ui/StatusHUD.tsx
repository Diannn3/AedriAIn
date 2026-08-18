import { useEffect, useState } from 'react';
import { handRuntime, type HandRuntimeState } from '../input/hand/handRuntime';
import { renderPerformanceRuntime, type RenderPerformanceState } from '../spatial/performanceRuntime';

export function StatusHUD() {
  const [hand, setHand] = useState<HandRuntimeState>(() => handRuntime.getState());
  const [render, setRender] = useState<RenderPerformanceState>(() => renderPerformanceRuntime.getState());
  useEffect(() => handRuntime.subscribe(setHand), []);
  useEffect(() => renderPerformanceRuntime.subscribe(setRender), []);
  const input = hand.enabled ? (hand.tracking ? `${hand.hands.length} HAND${hand.hands.length > 1 ? 'S' : ''}` : hand.phase.toUpperCase()) : 'MOUSE';
  const vision = hand.error ? 'ERROR' : hand.enabled ? `${hand.delegate ?? '—'} · ${hand.inferenceTime.toFixed(0)} MS · ${hand.inferenceFps.toFixed(0)} FPS` : 'STANDBY';
  return (
    <div className="status-hud">
      <div><small>INPUT</small><b>{input}</b></div>
      <div><small>VISION</small><b>{vision}</b></div>
      <div><small>RENDER</small><b>{render.fps ? `${render.fps.toFixed(0)} FPS · ${render.dpr.toFixed(1)}×` : 'BOOTING'}</b></div>
      <div><small>FRAMES</small><b>{hand.enabled ? `${hand.droppedFrames} DROP` : '—'}</b></div>
      <div><small>CORE</small><b>DOCUMENTS V1</b></div>
    </div>
  );
}
