import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import {
  createNoteResource,
  createTaskResource,
  ensureDocumentResource,
  toggleTaskResource,
  updateDocumentViewState,
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
    const file = { id: 'browser-file', name: 'paper.pdf', size: 4, mimeType: 'application/pdf' };
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    const document = await ensureDocumentResource(file, 'browser', file.id, blob);

    await updateDocumentViewState(document.id, { currentPage: 3, zoom: 1.4, rotation: 90 });
    const stored = await db.documents.get(document.id);
    const storedBlob = await db.browserBlobs.get(file.id);

    expect(stored).toMatchObject({ currentPage: 3, zoom: 1.4, rotation: 90 });
    expect(storedBlob?.blob.size).toBe(blob.size);
  });
});
