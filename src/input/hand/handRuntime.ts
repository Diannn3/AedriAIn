import { createStore } from 'zustand/vanilla';
import type { HandInteractionSnapshot } from './types';

export type HandTrackingPhase = 'idle' | 'requesting-camera' | 'initializing' | 'ready' | 'tracking' | 'recovering' | 'error';

export interface HandRuntimeState {
  enabled: boolean;
  tracking: boolean;
  initializing: boolean;
  phase: HandTrackingPhase;
  delegate: 'GPU' | 'CPU' | null;
  error: string | null;
  inferenceTime: number;
  inferenceFps: number;
  droppedFrames: number;
  hands: HandInteractionSnapshot[];
  setState: (patch: Partial<Omit<HandRuntimeState, 'setState'>>) => void;
}

export const handRuntime = createStore<HandRuntimeState>((set) => ({
  enabled: false,
  tracking: false,
  initializing: false,
  phase: 'idle',
  delegate: null,
  error: null,
  inferenceTime: 0,
  inferenceFps: 0,
  droppedFrames: 0,
  hands: [],
  setState: (patch) => set(patch),
}));
