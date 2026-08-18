import type { HandInteractionSnapshot } from '../input/hand/types';

export function choosePrimaryHand(
  hands: HandInteractionSnapshot[],
  preferredId?: string | null,
  preferredHand: 'left' | 'right' | 'automatic' = 'automatic',
) {
  if (preferredId) {
    const preferred = hands.find((hand) => hand.id === preferredId);
    if (preferred) return preferred;
  }
  const ranked = [...hands].sort((a, b) => {
    if (preferredHand !== 'automatic') {
      const preferredLabel = preferredHand === 'left' ? 'Left' : 'Right';
      const aPreferred = a.handedness === preferredLabel ? 1 : 0;
      const bPreferred = b.handedness === preferredLabel ? 1 : 0;
      if (aPreferred !== bPreferred) return bPreferred - aPreferred;
    }
    const aIntent = a.pinching ? 3 : a.gesture === 'POINT' ? 2 : a.gesture === 'OPEN' ? 1 : 0;
    const bIntent = b.pinching ? 3 : b.gesture === 'POINT' ? 2 : b.gesture === 'OPEN' ? 1 : 0;
    if (aIntent !== bIntent) return bIntent - aIntent;
    if (a.score !== b.score) return b.score - a.score;
    if (a.handedness === b.handedness) return 0;
    return a.handedness === 'Right' ? -1 : 1;
  });
  return ranked[0] ?? null;
}
