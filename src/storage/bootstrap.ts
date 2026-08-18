import type { NoteRecord, TaskRecord } from '../core/types';
import { db } from './db';
import { defaultNote, defaultTasks } from './defaults';

const MIGRATION_KEY = 'migration:zustand-v4-to-dexie-v1';

function readLegacyState() {
  try {
    const raw = localStorage.getItem('aedriain-desktop');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state && typeof parsed.state === 'object' ? parsed.state : null;
  } catch {
    return null;
  }
}

function normalizeLegacyNotes(value: unknown): NoteRecord[] {
  if (Array.isArray(value)) {
    return value.map((note: any, index) => ({
      id: typeof note?.id === 'string' ? note.id : index === 0 ? defaultNote.id : `legacy-note-${index}`,
      title: typeof note?.title === 'string' ? note.title : index === 0 ? 'Notes' : `Note ${index + 1}`,
      content: typeof note?.content === 'string' ? note.content : '',
      createdAt: Number.isFinite(note?.createdAt) ? note.createdAt : Date.now(),
      updatedAt: Number.isFinite(note?.updatedAt) ? note.updatedAt : Date.now(),
    }));
  }
  if (typeof value === 'string') return [{ ...defaultNote, content: value }];
  return [];
}

function normalizeLegacyTasks(value: unknown): TaskRecord[] {
  if (!Array.isArray(value)) return [];
  const now = Date.now();
  return value.map((task: any) => ({
    id: typeof task?.id === 'string' ? task.id : crypto.randomUUID(),
    title: typeof task?.title === 'string' ? task.title : 'Untitled task',
    description: typeof task?.description === 'string' ? task.description : undefined,
    status: task?.status === 'done' || task?.done === true ? 'done' : 'todo',
    priority: task?.priority === 'low' || task?.priority === 'high' ? task.priority : 'medium',
    dueAt: Number.isFinite(task?.dueAt) ? task.dueAt : undefined,
    createdAt: Number.isFinite(task?.createdAt) ? task.createdAt : now,
    updatedAt: Number.isFinite(task?.updatedAt) ? task.updatedAt : now,
  }));
}

export async function initializeStorage() {
  await db.open();
  const migrated = await db.settings.get(MIGRATION_KEY);
  if (migrated) return;

  const legacy = readLegacyState();
  const notes = normalizeLegacyNotes(legacy?.notes);
  const tasks = normalizeLegacyTasks(legacy?.tasks);

  await db.transaction('rw', db.notes, db.tasks, db.settings, async () => {
    if ((await db.notes.count()) === 0) await db.notes.bulkPut(notes.length ? notes : [defaultNote]);
    if ((await db.tasks.count()) === 0) await db.tasks.bulkPut(tasks.length ? tasks : defaultTasks);
    await db.settings.put({ key: MIGRATION_KEY, value: { completedAt: Date.now() } });
  });
}
