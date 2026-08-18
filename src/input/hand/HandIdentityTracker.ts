import type { Landmark, TrackedHand } from './types';

interface Track {
  id: string;
  handedness: TrackedHand['handedness'];
  center: { x: number; y: number };
  velocity: { x: number; y: number };
  missed: number;
}

const centerOf = (landmarks: Landmark[]) => {
  if (!landmarks.length) return { x: 0.5, y: 0.5 };
  const indices = [0, 5, 9, 13, 17].filter((index) => landmarks[index]);
  const sum = indices.reduce((acc, index) => ({ x: acc.x + landmarks[index].x, y: acc.y + landmarks[index].y }), { x: 0, y: 0 });
  return { x: sum.x / indices.length, y: sum.y / indices.length };
};

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const add = (a: { x: number; y: number }, b: { x: number; y: number }, scale = 1) => ({ x: a.x + b.x * scale, y: a.y + b.y * scale });

export class HandIdentityTracker {
  private tracks = new Map<string, Track>();
  private nextId = 1;
  private readonly maxMissedFrames = 10;
  private readonly maxMatchCost = 0.44;

  update(hands: Omit<TrackedHand, 'trackingId'>[]): TrackedHand[] {
    const detections = hands.map((hand, index) => ({ hand, index, center: centerOf(hand.landmarks) }));
    const tracks = [...this.tracks.values()];
    const candidates: Array<{ detectionIndex: number; trackId: string; cost: number }> = [];

    for (const detection of detections) {
      for (const track of tracks) {
        const predicted = add(track.center, track.velocity, Math.min(track.missed + 1, 3));
        const handednessPenalty = detection.hand.handedness === 'Unknown' || track.handedness === 'Unknown' || detection.hand.handedness === track.handedness ? 0 : 0.18;
        const cost = distance(detection.center, predicted) + handednessPenalty;
        if (cost < this.maxMatchCost) candidates.push({ detectionIndex: detection.index, trackId: track.id, cost });
      }
    }

    candidates.sort((a, b) => a.cost - b.cost);
    const detectionToTrack = new Map<number, string>();
    const usedTracks = new Set<string>();
    for (const candidate of candidates) {
      if (detectionToTrack.has(candidate.detectionIndex) || usedTracks.has(candidate.trackId)) continue;
      detectionToTrack.set(candidate.detectionIndex, candidate.trackId);
      usedTracks.add(candidate.trackId);
    }

    const assigned = detections.map(({ hand, index, center }) => {
      const matchedId = detectionToTrack.get(index);
      const id = matchedId ?? `hand-${this.nextId++}`;
      const previous = matchedId ? this.tracks.get(matchedId) : undefined;
      const delta = previous ? { x: center.x - previous.center.x, y: center.y - previous.center.y } : { x: 0, y: 0 };
      const velocity = previous
        ? { x: previous.velocity.x * 0.55 + delta.x * 0.45, y: previous.velocity.y * 0.55 + delta.y * 0.45 }
        : delta;
      this.tracks.set(id, { id, handedness: hand.handedness, center, velocity, missed: 0 });
      usedTracks.add(id);
      return { ...hand, trackingId: id };
    });

    for (const [id, track] of this.tracks) {
      if (usedTracks.has(id)) continue;
      const missed = track.missed + 1;
      if (missed > this.maxMissedFrames) this.tracks.delete(id);
      else this.tracks.set(id, { ...track, center: add(track.center, track.velocity), missed });
    }

    return assigned;
  }

  reset() {
    this.tracks.clear();
    this.nextId = 1;
  }
}
