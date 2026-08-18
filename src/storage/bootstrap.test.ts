import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeStorage } from './bootstrap';
import { db } from './db';

beforeEach(async () => {
  db.close();
  await db.delete();
  localStorage.clear();
});

afterEach(async () => {
  db.close();
  await db.delete();
  localStorage.clear();
});

describe('legacy resource migration', () => {
  it('moves V2.1 notes and tasks out of Zustand persistence', async () => {
    localStorage.setItem('aedriain-desktop', JSON.stringify({
      state: {
        notes: [{ id: 'legacy-note', title: 'Legacy', content: 'Imported', createdAt: 1, updatedAt: 2 }],
        tasks: [{ id: 'legacy-task', title: 'Legacy task', done: true, priority: 'high' }],
      },
      version: 4,
    }));

    await initializeStorage();

    expect(await db.notes.get('legacy-note')).toMatchObject({ title: 'Legacy', content: 'Imported' });
    expect(await db.tasks.get('legacy-task')).toMatchObject({ title: 'Legacy task', status: 'done', priority: 'high' });
    expect(await db.settings.get('migration:zustand-v4-to-dexie-v1')).toBeTruthy();
  });

  it('does not overwrite already-migrated user data', async () => {
    await initializeStorage();
    await db.notes.put({ id: 'user-note', title: 'Keep me', content: 'Saved', createdAt: 1, updatedAt: 1 });
    localStorage.setItem('aedriain-desktop', JSON.stringify({ state: { notes: [{ id: 'late-legacy', title: 'Ignore', content: 'Old' }] } }));

    await initializeStorage();

    expect(await db.notes.get('user-note')).toBeTruthy();
    expect(await db.notes.get('late-legacy')).toBeUndefined();
  });
});
