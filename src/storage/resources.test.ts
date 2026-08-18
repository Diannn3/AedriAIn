import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  bulkPutDocumentPageIndex,
  createGestureProfile,
  createNoteResource,
  createTaskResource,
  ensureDocumentResource,
  garbageCollectBrowserBlobs,
  relinkDocumentResource,
  removeDocumentResource,
  toggleTaskResource,
  updateDocumentViewState,
  updateGestureProfile,
  updateNoteResource,
} from './resources';

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
  localStorage.clear();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe('resource database', () => {
  it('creates and updates independent note resources', async () => {
    const first = await createNoteResource('First', 'Alpha', 'note-a');
    const second = await createNoteResource('Second', 'Beta', 'note-b');
    await updateNoteResource(first.id, { content: 'Updated' });

    expect((await db.notes.get(first.id))?.content).toBe('Updated');
    expect((await db.notes.get(second.id))?.content).toBe('Beta');
  });

  it('creates and toggles durable tasks', async () => {
    const task = await createTaskResource('Read the paper');
    expect(task.status).toBe('todo');
    await toggleTaskResource(task.id);
    expect((await db.tasks.get(task.id))?.status).toBe('done');
  });

  it('persists browser PDF blobs and view state', async () => {
    const file = { id: 'browser-file', name: 'paper.pdf', size: 4, mimeType: 'application/pdf', modifiedAt: 10 };
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    const document = await ensureDocumentResource(file, 'browser', file.id, blob);

    await updateDocumentViewState(document.id, { currentPage: 3, zoom: 1.4, rotation: 90, viewMode: 'continuous' });
    const stored = await db.documents.get(document.id);
    const storedBlob = await db.browserBlobs.get(file.id);

    expect(stored).toMatchObject({ currentPage: 3, zoom: 1.4, rotation: 90, viewMode: 'continuous' });
    expect(stored?.sourceFingerprint).toMatchObject({ name: 'paper.pdf', size: 4, modifiedAt: 10 });
    expect(storedBlob?.blob.size).toBe(blob.size);
  });

  it('relinks an existing document without duplicating it and clears stale page index', async () => {
    const firstBlob = new Blob(['first'], { type: 'application/pdf' });
    const document = await ensureDocumentResource({ id: 'old', name: 'paper.pdf', size: 5, mimeType: 'application/pdf', modifiedAt: 1 }, 'browser', 'old', firstBlob);
    await bulkPutDocumentPageIndex([{ documentId: document.id, pageNumber: 1, text: 'old', normalizedText: 'old', indexedAt: 1 }]);

    const nextBlob = new Blob(['different'], { type: 'application/pdf' });
    await relinkDocumentResource(document.id, { id: 'new', name: 'paper.pdf', size: 9, mimeType: 'application/pdf', modifiedAt: 2 }, 'browser', 'new', nextBlob);

    expect(await db.documents.count()).toBe(1);
    expect((await db.documents.get(document.id))?.sourceId).toBe('new');
    expect(await db.browserBlobs.get('old')).toBeUndefined();
    expect((await db.browserBlobs.get('new'))?.blob.size).toBe(nextBlob.size);
    expect(await db.documentPages.where('documentId').equals(document.id).count()).toBe(0);
  });

  it('keeps a cached text index when relinking the same fingerprint', async () => {
    const document = await ensureDocumentResource(
      { id: 'source-a', name: 'same.pdf', size: 6, mimeType: 'application/pdf', modifiedAt: 42 },
      'browser',
      'source-a',
      new Blob(['same!!']),
    );
    await bulkPutDocumentPageIndex([{ documentId: document.id, pageNumber: 1, text: 'cached', normalizedText: 'cached', indexedAt: 1 }]);

    await relinkDocumentResource(
      document.id,
      { id: 'source-b', name: 'same.pdf', size: 6, mimeType: 'application/pdf', modifiedAt: 42 },
      'browser',
      'source-b',
      new Blob(['same!!']),
    );

    expect(await db.documents.count()).toBe(1);
    expect(await db.documentPages.where('documentId').equals(document.id).count()).toBe(1);
  });

  it('removes document metadata, cached pages, and an unreferenced browser Blob', async () => {
    const document = await ensureDocumentResource({ id: 'blob-source', name: 'remove.pdf', size: 4, mimeType: 'application/pdf' }, 'browser', 'blob-source', new Blob(['%PDF']));
    await bulkPutDocumentPageIndex([{ documentId: document.id, pageNumber: 1, text: 'page', normalizedText: 'page', indexedAt: 1 }]);

    await removeDocumentResource(document.id);

    expect(await db.documents.get(document.id)).toBeUndefined();
    expect(await db.browserBlobs.get('blob-source')).toBeUndefined();
    expect(await db.documentPages.where('documentId').equals(document.id).count()).toBe(0);
  });

  it('garbage-collects only orphaned browser Blobs', async () => {
    await ensureDocumentResource({ id: 'used', name: 'used.pdf', size: 4, mimeType: 'application/pdf' }, 'browser', 'used', new Blob(['used']));
    await db.browserBlobs.put({ id: 'orphan', blob: new Blob(['orphan']) });

    expect(await garbageCollectBrowserBlobs()).toBe(1);
    expect(await db.browserBlobs.get('used')).toBeTruthy();
    expect(await db.browserBlobs.get('orphan')).toBeUndefined();
  });

  it('clamps unsafe gesture calibration values', async () => {
    const profile = await createGestureProfile('Test');
    const updated = await updateGestureProfile(profile.id, {
      pinchOn: 0.9,
      pinchOff: 0.1,
      pointerSmoothing: 5,
      dragSmoothing: 0,
      sensitivity: 9,
    });

    expect(updated.pinchOn).toBeLessThanOrEqual(0.42);
    expect(updated.pinchOff).toBeGreaterThan(updated.pinchOn);
    expect(updated.pointerSmoothing).toBeLessThanOrEqual(0.9);
    expect(updated.dragSmoothing).toBeGreaterThanOrEqual(0.08);
    expect(updated.sensitivity).toBeLessThanOrEqual(1.8);
  });
});
