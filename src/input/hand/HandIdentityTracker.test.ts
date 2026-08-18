import { describe, expect, it } from 'vitest';
import { HandIdentityTracker } from './HandIdentityTracker';
import type { Landmark } from './types';
import reorderFixture from './fixtures/reorder.json';

function hand(handedness: 'Left' | 'Right', x: number) {
  const landmarks: Landmark[] = Array.from({ length: 21 }, () => ({ x, y: 0.5, z: 0 }));
  landmarks[0] = { x, y: 0.7, z: 0 };
  landmarks[5] = { x: x - 0.02, y: 0.55, z: 0 };
  landmarks[9] = { x, y: 0.5, z: 0 };
  landmarks[13] = { x: x + 0.02, y: 0.55, z: 0 };
  landmarks[17] = { x: x + 0.04, y: 0.58, z: 0 };
  return { handedness, landmarks, worldLandmarks: [], score: 0.99 } as const;
}

describe('HandIdentityTracker', () => {
  it('preserves identities when detector ordering changes', () => {
    const tracker = new HandIdentityTracker();
    const frames = reorderFixture.frames.map((frame) => tracker.update(frame.hands.map((item) => hand(item.handedness as 'Left' | 'Right', item.x))));
    const leftId = frames[0].find((item) => item.handedness === 'Left')?.trackingId;
    const rightId = frames[0].find((item) => item.handedness === 'Right')?.trackingId;
    for (const frame of frames.slice(1)) {
      expect(frame.find((item) => item.handedness === 'Left')?.trackingId).toBe(leftId);
      expect(frame.find((item) => item.handedness === 'Right')?.trackingId).toBe(rightId);
    }
  });

  it('keeps a track alive across a short detection gap', () => {
    const tracker = new HandIdentityTracker();
    const first = tracker.update([hand('Right', 0.65)])[0];
    tracker.update([]);
    tracker.update([]);
    const reacquired = tracker.update([hand('Right', 0.63)])[0];
    expect(reacquired.trackingId).toBe(first.trackingId);
  });
});
