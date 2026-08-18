export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface TrackedHand {
  trackingId: string;
  handedness: 'Left' | 'Right' | 'Unknown';
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  score: number;
}

export type GestureLabel = 'PINCH' | 'POINT' | 'FIST' | 'OPEN' | 'IDLE';

export interface HandInteractionSnapshot {
  id: string;
  handedness: TrackedHand['handedness'];
  pointer: { x: number; y: number };
  pinchPoint: { x: number; y: number };
  pinchStrength: number;
  pinching: boolean;
  gesture: GestureLabel;
  score: number;
}
