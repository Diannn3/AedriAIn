import { createStore } from 'zustand/vanilla';
import type { HandInteractionSnapshot } from './types';

export interface HandRuntimeState {
  enabled: boolean;
  tracking: boolean;
  initializing: boolean;
  error: string | null;
  inferenceTime: number;
  hands: HandInteractionSnapshot[];
  setState: (patch: Partial<Omit<HandRuntimeState, 'setState'>>) => void;
}

export const handRuntime = createStore<HandRuntimeState>((set) => ({
  enabled: false,
  tracking: false,
  initializing: false,
  error: null,
  inferenceTime: 0,
  hands: [],
  setState: (patch) => set(patch),
}));
