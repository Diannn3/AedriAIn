import type { GestureProfile, NoteRecord, TaskRecord } from '../core/types';

export const DEFAULT_NOTE_ID = 'note-default';
export const DEFAULT_GESTURE_PROFILE_ID = 'gesture-default';
export const ACTIVE_GESTURE_PROFILE_KEY = 'gesture:active-profile';
export const UI_SCALE_KEY = 'ui:scale';
export const REDUCED_MOTION_KEY = 'ui:reduced-motion';

export const defaultNote: NoteRecord = {
  id: DEFAULT_NOTE_ID,
  title: 'Notes',
  content: 'AedriAIn notes\n\n• Point at a holographic panel.\n• Pinch the header to grab the window.\n• Two pinches move, scale, and rotate.\n• Mouse and keyboard remain first-class fallbacks.\n\nDocuments V1.1 adds document lifecycle, indexed search, continuous reading, and gesture calibration.',
  createdAt: Date.UTC(2026, 7, 18),
  updatedAt: Date.UTC(2026, 7, 18),
};

const seededAt = Date.UTC(2026, 7, 18);

export const defaultTasks: TaskRecord[] = [
  { id: 't1', title: 'Review class notes', status: 'todo', priority: 'high', createdAt: seededAt, updatedAt: seededAt },
  { id: 't2', title: 'Check project deliverables', status: 'todo', priority: 'medium', createdAt: seededAt, updatedAt: seededAt },
  { id: 't3', title: 'Prototype hand gestures', status: 'done', priority: 'low', createdAt: seededAt, updatedAt: seededAt },
];

export const defaultGestureProfile: GestureProfile = {
  id: DEFAULT_GESTURE_PROFILE_ID,
  name: 'Default',
  preferredHand: 'automatic',
  pinchOn: 0.31,
  pinchOff: 0.46,
  pointerSmoothing: 0.42,
  dragSmoothing: 0.42,
  sensitivity: 1,
  updatedAt: seededAt,
};
