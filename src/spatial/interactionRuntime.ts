import { createStore } from 'zustand/vanilla';
import type { Vec3Tuple } from '../core/types';
import type { SpatialTargetRegion } from './targetRegistry';

export type InteractionMode = 'idle' | 'hover' | 'content' | 'grab' | 'transform';

export interface SpatialInteractionState {
  hoveredWindowId: string | null;
  hoveredRegion: SpatialTargetRegion | null;
  activeWindowId: string | null;
  primaryHandId: string | null;
  activeHandIds: string[];
  pointerWorld: Vec3Tuple | null;
  mode: InteractionMode;
  setState: (patch: Partial<Omit<SpatialInteractionState, 'setState' | 'reset'>>) => void;
  reset: () => void;
}

const sameVec3 = (a: Vec3Tuple | null, b: Vec3Tuple | null) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4 && Math.abs(a[2] - b[2]) < 1e-4;
};

const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((value, index) => value === b[index]);

const initialState = {
  hoveredWindowId: null,
  hoveredRegion: null,
  activeWindowId: null,
  primaryHandId: null,
  activeHandIds: [] as string[],
  pointerWorld: null as Vec3Tuple | null,
  mode: 'idle' as InteractionMode,
};

export const interactionRuntime = createStore<SpatialInteractionState>((set, get) => ({
  ...initialState,
  setState: (patch) => {
    const current = get();
    const next = { ...current, ...patch };
    if (
      next.hoveredWindowId === current.hoveredWindowId &&
      next.hoveredRegion === current.hoveredRegion &&
      next.activeWindowId === current.activeWindowId &&
      next.primaryHandId === current.primaryHandId &&
      sameIds(next.activeHandIds, current.activeHandIds) &&
      next.mode === current.mode &&
      sameVec3(next.pointerWorld, current.pointerWorld)
    ) return;
    set(patch);
  },
  reset: () => set(initialState),
}));
