import type { GestureLabel, Landmark, TrackedHand } from './types';

const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

const distance2D = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);
const handSpan = (lm: Landmark[]) => Math.max(distance2D(lm[WRIST], lm[MIDDLE_MCP]), 1e-4);
const extended = (lm: Landmark[], tip: number, pip: number) => distance2D(lm[tip], lm[WRIST]) > distance2D(lm[pip], lm[WRIST]) * 1.14;

export const getPinchStrength = (lm: Landmark[]) => distance2D(lm[THUMB_TIP], lm[INDEX_TIP]) / handSpan(lm);

export const getPinchPoint = (lm: Landmark[]) => ({
  x: (lm[THUMB_TIP].x + lm[INDEX_TIP].x) / 2,
  y: (lm[THUMB_TIP].y + lm[INDEX_TIP].y) / 2,
});

export const getPointerPoint = (lm: Landmark[]) => ({ x: lm[INDEX_TIP].x, y: lm[INDEX_TIP].y });

export const classifyPose = (lm: Landmark[], pinching: boolean): GestureLabel => {
  if (pinching) return 'PINCH';
  const index = extended(lm, INDEX_TIP, INDEX_PIP);
  const middle = extended(lm, MIDDLE_TIP, MIDDLE_PIP);
  const ring = extended(lm, RING_TIP, RING_PIP);
  const pinky = extended(lm, PINKY_TIP, PINKY_PIP);
  if (index && !middle && !ring) return 'POINT';
  if (!index && !middle && !ring && !pinky) return 'FIST';
  if (index && middle && ring && pinky) return 'OPEN';
  return 'IDLE';
};

export class GestureEngine {
  private pinchState = new Map<string, boolean>();
  private smoothedPointers = new Map<string, { x: number; y: number }>();
  private readonly pinchOn = 0.31;
  private readonly pinchOff = 0.46;
  private readonly smoothing = 0.42;

  analyze(hand: TrackedHand, index: number) {
    const id = `${hand.handedness}-${index}`;
    const strength = getPinchStrength(hand.landmarks);
    const wasPinching = this.pinchState.get(id) ?? false;
    const pinching = wasPinching ? strength < this.pinchOff : strength < this.pinchOn;
    this.pinchState.set(id, pinching);

    const rawPointer = getPointerPoint(hand.landmarks);
    const previous = this.smoothedPointers.get(id) ?? rawPointer;
    const pointer = {
      x: previous.x + (rawPointer.x - previous.x) * this.smoothing,
      y: previous.y + (rawPointer.y - previous.y) * this.smoothing,
    };
    this.smoothedPointers.set(id, pointer);

    return {
      id,
      handedness: hand.handedness,
      pointer,
      pinchPoint: getPinchPoint(hand.landmarks),
      pinchStrength: strength,
      pinching,
      gesture: classifyPose(hand.landmarks, pinching),
      score: hand.score,
    };
  }

  reset() {
    this.pinchState.clear();
    this.smoothedPointers.clear();
  }
}
