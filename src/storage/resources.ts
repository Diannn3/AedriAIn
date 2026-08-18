import type { DocumentRecord, FileDescriptor, NoteRecord, TaskRecord } from '../core/types';
import { db } from './db';

export function makeNoteRecord(title = 'Untitled note', content = '', id = crypto.randomUUID()): NoteRecord {
  const now = Date.now();
  return { id, title, content, createdAt: now, updatedAt: now };
}

export async function createNoteResource(title?: string, content?: string, id?: string) {
  const note = makeNoteRecord(title, content, id);
  await db.notes.put(note);
  return note;
}

export async function updateNoteResource(id: string, patch: Partial<Pick<NoteRecord, 'title' | 'content'>>) {
  await db.notes.update(id, { ...patch, updatedAt: Date.now() });
}

export async function createTaskResource(title: string) {
  const now = Date.now();
  const task: TaskRecord = {
    id: crypto.randomUUID(),
    title,
    status: 'todo',
    priority: 'medium',
    createdAt: now,
    updatedAt: now,
  };
  await db.tasks.add(task);
  return task;
}

export async function toggleTaskResource(id: string) {
  const task = await db.tasks.get(id);
  if (!task) return;
  await db.tasks.update(id, { status: task.status === 'done' ? 'todo' : 'done', updatedAt: Date.now() });
}

export async function ensureDocumentResource(
  file: FileDescriptor,
  sourceKind: DocumentRecord['sourceKind'],
  sourceId: string,
  browserBlob?: Blob,
) {
  const existing = await db.documents.where('sourceId').equals(sourceId).first();
  const now = Date.now();
  if (existing) {
    await db.documents.update(existing.id, { lastOpenedAt: now, name: file.name, size: file.size, mimeType: file.mimeType ?? existing.mimeType });
    if (browserBlob) await db.browserBlobs.put({ id: sourceId, blob: browserBlob });
    return { ...existing, lastOpenedAt: now, name: file.name, size: file.size, mimeType: file.mimeType ?? existing.mimeType };
  }

  const document: DocumentRecord = {
    id: crypto.randomUUID(),
    name: file.name,
    mimeType: file.mimeType || 'application/octet-stream',
    size: file.size,
    sourceKind,
    sourceId,
    lastOpenedAt: now,
    currentPage: 1,
    zoom: 1,
    rotation: 0,
  };
  await db.transaction('rw', db.documents, db.browserBlobs, async () => {
    await db.documents.add(document);
    if (browserBlob) await db.browserBlobs.put({ id: sourceId, blob: browserBlob });
  });
  return document;
}

export async function touchDocumentResource(id: string) {
  await db.documents.update(id, { lastOpenedAt: Date.now() });
}

export async function updateDocumentViewState(id: string, patch: Partial<Pick<DocumentRecord, 'currentPage' | 'zoom' | 'rotation'>>) {
  await db.documents.update(id, patch);
}
