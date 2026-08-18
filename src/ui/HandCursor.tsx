import { useEffect, useState } from 'react';
import { handRuntime, type HandRuntimeState } from '../input/hand/handRuntime';
import { interactionRuntime, type SpatialInteractionState } from '../spatial/interactionRuntime';

export function HandCursor() {
  const [state, setState] = useState<HandRuntimeState>(() => handRuntime.getState());
  const [interaction, setInteraction] = useState<SpatialInteractionState>(() => interactionRuntime.getState());
  useEffect(() => handRuntime.subscribe(setState), []);
  useEffect(() => interactionRuntime.subscribe(setInteraction), []);
  const primary = state.hands[0];
  if (!state.enabled || !primary) return null;
  const x = (1 - primary.pointer.x) * window.innerWidth;
  const y = primary.pointer.y * window.innerHeight;
  const active = interaction.mode === 'grab' || interaction.mode === 'transform';
  return (
    <div className={`hand-cursor ${primary.pinching || active ? 'hand-cursor--pinch' : ''}`} style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}>
      <div className="hand-cursor__reticle" />
      <span>{interaction.mode === 'idle' ? primary.gesture : interaction.mode.toUpperCase()}</span>
    </div>
  );
}
