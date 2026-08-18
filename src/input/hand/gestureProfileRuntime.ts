import { createStore } from 'zustand/vanilla';
import type { GestureProfile } from '../../core/types';
import { defaultGestureProfile } from '../../storage/defaults';

interface GestureProfileRuntimeState {
  profile: GestureProfile;
  setProfile: (profile: GestureProfile) => void;
}

export const gestureProfileRuntime = createStore<GestureProfileRuntimeState>((set) => ({
  profile: { ...defaultGestureProfile },
  setProfile: (profile) => set({ profile }),
}));
