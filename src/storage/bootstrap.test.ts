import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { initializeStorage } from './bootstrap';
import { db } from './db';
import { ACTIVE_GESTURE_PROFILE_KEY, DEFAULT_GESTURE_PROFILE_ID } from './defaults';

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

describe('resource/database migration', () => {
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

  it('upgrades Documents V1 records with V1.1 fingerprint and view-mode defaults', async () => {
    const legacyDb = new Dexie('aedriain');
    legacyDb.version(1).stores({
      notes: 'id, title, updatedAt, createdAt',
      tasks: 'id, status, priority, dueAt, updatedAt',
      documents: 'id, sourceId, mimeType, name, lastOpenedAt',
      browserBlobs: 'id',
      settings: 'key',
      gestureProfiles: 'id, preferredHand, updatedAt',
    });
    await legacyDb.open();
    await legacyDb.table('documents').add({
      id: 'legacy-document',
      name: 'legacy.pdf',
      mimeType: 'application/pdf',
      size: 321,
      sourceKind: 'electron',
      sourceId: 'old-token',
      lastOpenedAt: 1,
      currentPage: 7,
      zoom: 1.2,
      rotation: 0,
    });
    legacyDb.close();

    await db.open();
    const upgraded = await db.documents.get('legacy-document');
    expect(upgraded?.viewMode).toBe('single');
    expect(upgraded?.sourceFingerprint).toMatchObject({ name: 'legacy.pdf', size: 321, mimeType: 'application/pdf' });
  });

  it('seeds an active default gesture profile', async () => {
    await initializeStorage();
    expect(await db.gestureProfiles.get(DEFAULT_GESTURE_PROFILE_ID)).toBeTruthy();
    expect((await db.settings.get(ACTIVE_GESTURE_PROFILE_KEY))?.value).toBe(DEFAULT_GESTURE_PROFILE_ID);
  });
});
