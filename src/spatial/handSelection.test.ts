import { describe, expect, it } from 'vitest';
import { choosePrimaryHand } from './handSelection';
import type { HandInteractionSnapshot } from '../input/hand/types';

const hand = (id: string, handedness: 'Left' | 'Right', gesture: HandInteractionSnapshot['gesture'], pinching = false, score = 0.9): HandInteractionSnapshot => ({
  id, handedness, gesture, pinching, score,
  pointer: { x: 0.5, y: 0.5 }, pinchPoint: { x: 0.5, y: 0.5 }, pinchStrength: 1,
});

describe('choosePrimaryHand', () => {
  it('keeps explicit gesture ownership despite detector reordering', () => {
    const selected = choosePrimaryHand([hand('left', 'Left', 'POINT'), hand('right', 'Right', 'IDLE')], 'right');
    expect(selected?.id).toBe('right');
  });

  it('prefers pinch, then point, then confidence', () => {
    expect(choosePrimaryHand([hand('idle', 'Right', 'IDLE', false, 0.99), hand('point', 'Left', 'POINT', false, 0.7)])?.id).toBe('point');
    expect(choosePrimaryHand([hand('point', 'Left', 'POINT'), hand('pinch', 'Right', 'PINCH', true)])?.id).toBe('pinch');
  });
});
