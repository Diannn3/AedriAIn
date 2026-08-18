import { describe, expect, it } from 'vitest';
import { DEFAULT_GESTURE_CONFIG, GestureEngine, classifyPose, getPinchStrength } from './gestures';
import type { Landmark, TrackedHand } from './types';

function baseHand(): Landmark[] {
  const lm = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.7, z: 0 }));
  lm[0] = { x: 0.5, y: 0.8, z: 0 }; lm[9] = { x: 0.5, y: 0.5, z: 0 };
  lm[4] = { x: 0.46, y: 0.32, z: 0 }; lm[8] = { x: 0.54, y: 0.25, z: 0 }; lm[6] = { x: 0.52, y: 0.46, z: 0 };
  lm[10] = { x: 0.5, y: 0.56, z: 0 }; lm[12] = { x: 0.5, y: 0.72, z: 0 };
  lm[14] = { x: 0.56, y: 0.58, z: 0 }; lm[16] = { x: 0.55, y: 0.72, z: 0 };
  lm[18] = { x: 0.62, y: 0.62, z: 0 }; lm[20] = { x: 0.61, y: 0.74, z: 0 };
  return lm;
}

const tracked = (landmarks: Landmark[]): TrackedHand => ({ trackingId: 'hand-1', handedness: 'Right', landmarks, worldLandmarks: [], score: 0.99 });

describe('GestureEngine', () => {
  it('classifies a pointing pose', () => {
    expect(classifyPose(baseHand(), false)).toBe('POINT');
  });

  it('uses scale-normalized pinch strength and hysteresis', () => {
    const pinch = baseHand(); pinch[4] = { x: 0.50, y: 0.25, z: 0 }; pinch[8] = { x: 0.515, y: 0.25, z: 0 };
    expect(getPinchStrength(pinch)).toBeLessThan(DEFAULT_GESTURE_CONFIG.pinchOn);
    const engine = new GestureEngine();
    expect(engine.analyze(tracked(pinch), 0).pinching).toBe(true);

    const mid = baseHand(); mid[4] = { x: 0.44, y: 0.25, z: 0 }; mid[8] = { x: 0.56, y: 0.25, z: 0 };
    expect(engine.analyze(tracked(mid), 0).pinching).toBe(true);

    const open = baseHand(); open[4] = { x: 0.40, y: 0.25, z: 0 }; open[8] = { x: 0.60, y: 0.25, z: 0 };
    expect(engine.analyze(tracked(open), 0).pinching).toBe(false);
  });

  it('accepts calibration overrides', () => {
    const engine = new GestureEngine({ pinchOn: 0.2, pinchOff: 0.3, pointerSmoothing: 1 });
    const hand = baseHand(); hand[4] = { x: 0.46, y: 0.25, z: 0 }; hand[8] = { x: 0.54, y: 0.25, z: 0 };
    expect(engine.analyze(tracked(hand), 0).pinching).toBe(false);
  });
});
