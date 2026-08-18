import type { NoteRecord, TaskRecord } from '../core/types';

export const DEFAULT_NOTE_ID = 'note-default';

export const defaultNote: NoteRecord = {
  id: DEFAULT_NOTE_ID,
  title: 'Notes',
  content: 'AedriAIn notes\n\n• Point at a holographic panel.\n• Pinch the header to grab the window.\n• Two pinches move, scale, and rotate.\n• Mouse and keyboard remain first-class fallbacks.\n\nDocuments V1 separates durable resources from transient workspace state.',
  createdAt: Date.UTC(2026, 7, 18),
  updatedAt: Date.UTC(2026, 7, 18),
};

const seededAt = Date.UTC(2026, 7, 18);

export const defaultTasks: TaskRecord[] = [
  { id: 't1', title: 'Review class notes', status: 'todo', priority: 'high', createdAt: seededAt, updatedAt: seededAt },
  { id: 't2', title: 'Check project deliverables', status: 'todo', priority: 'medium', createdAt: seededAt, updatedAt: seededAt },
  { id: 't3', title: 'Prototype hand gestures', status: 'done', priority: 'low', createdAt: seededAt, updatedAt: seededAt },
];
