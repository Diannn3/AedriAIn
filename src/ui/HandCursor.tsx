import { useEffect, useState } from 'react';
import { handRuntime, type HandRuntimeState } from '../input/hand/handRuntime';

export function HandCursor() {
  const [state, setState] = useState<HandRuntimeState>(() => handRuntime.getState());
  useEffect(() => handRuntime.subscribe(setState), []);
  const primary = state.hands[0];
  if (!state.enabled || !primary) return null;
  const x = (1 - primary.pointer.x) * window.innerWidth;
  const y = primary.pointer.y * window.innerHeight;
  return (
    <div className={`hand-cursor ${primary.pinching ? 'hand-cursor--pinch' : ''}`} style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}>
      <div className="hand-cursor__reticle" />
      <span>{primary.gesture}</span>
    </div>
  );
}
