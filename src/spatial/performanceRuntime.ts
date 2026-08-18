import { createStore } from 'zustand/vanilla';

export interface RenderPerformanceState {
  fps: number;
  frameMs: number;
  dpr: number;
  set: (fps: number, frameMs: number, dpr: number) => void;
}

export const renderPerformanceRuntime = createStore<RenderPerformanceState>((set) => ({
  fps: 0,
  frameMs: 0,
  dpr: 1,
  set: (fps, frameMs, dpr) => set({ fps, frameMs, dpr }),
}));
