import type {
  AppSettingRecord,
  DocumentPageRecord,
  DocumentRecord,
  DocumentSourceFingerprint,
  DocumentViewMode,
  FileDescriptor,
  GestureProfile,
  NoteRecord,
  TaskRecord,
} from '../core/types';
import { db } from './db';
import {
  ACTIVE_GESTURE_PROFILE_KEY,
  DEFAULT_GESTURE_PROFILE_ID,
  REDUCED_MOTION_KEY,
  UI_SCALE_KEY,
  defaultGestureProfile,
} from './defaults';

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

export function documentFingerprint(file: Pick<FileDescriptor, 'name' | 'size' | 'mimeType' | 'modifiedAt'>): DocumentSourceFingerprint {
  return {
    name: file.name,
    size: file.size,
    mimeType: file.mimeType || 'application/octet-stream',
    ...(file.modifiedAt != null ? { modifiedAt: file.modifiedAt } : {}),
  };
}

export function fingerprintsMatch(a: DocumentSourceFingerprint, b: DocumentSourceFingerprint) {
  if (a.size !== b.size || a.name !== b.name) return false;
  if (a.modifiedAt != null && b.modifiedAt != null && a.modifiedAt !== b.modifiedAt) return false;
  return true;
}

export async function ensureDocumentResource(
  file: FileDescriptor,
  sourceKind: DocumentRecord['sourceKind'],
  sourceId: string,
  browserBlob?: Blob,
) {
  const existing = await db.documents.where('sourceId').equals(sourceId).first();
  const now = Date.now();
  const fingerprint = documentFingerprint(file);
  if (existing) {
    const patch = {
      lastOpenedAt: now,
      name: file.name,
      size: file.size,
      mimeType: file.mimeType ?? existing.mimeType,
      sourceFingerprint: fingerprint,
      viewMode: existing.viewMode ?? 'single' as DocumentViewMode,
    };
    await db.documents.update(existing.id, patch);
    if (browserBlob) await db.browserBlobs.put({ id: sourceId, blob: browserBlob });
    return { ...existing, ...patch };
  }

  const document: DocumentRecord = {
    id: crypto.randomUUID(),
    name: file.name,
    mimeType: file.mimeType || 'application/octet-stream',
    size: file.size,
    sourceKind,
    sourceId,
    sourceFingerprint: fingerprint,
    lastOpenedAt: now,
    currentPage: 1,
    zoom: 1,
    rotation: 0,
    viewMode: 'single',
  };
  await db.transaction('rw', db.documents, db.browserBlobs, async () => {
    await db.documents.add(document);
    if (browserBlob) await db.browserBlobs.put({ id: sourceId, blob: browserBlob });
  });
  return document;
}

export async function relinkDocumentResource(
  documentId: string,
  file: FileDescriptor,
  sourceKind: DocumentRecord['sourceKind'],
  sourceId: string,
  browserBlob?: Blob,
) {
  const existing = await db.documents.get(documentId);
  if (!existing) throw new Error('Document resource no longer exists.');
  const previousSource = { kind: existing.sourceKind, id: existing.sourceId };
  const patch: Partial<DocumentRecord> = {
    name: file.name,
    size: file.size,
    mimeType: file.mimeType || existing.mimeType,
    sourceKind,
    sourceId,
    sourceFingerprint: documentFingerprint(file),
    lastOpenedAt: Date.now(),
  };

  const sourceChanged = !fingerprintsMatch(existing.sourceFingerprint, documentFingerprint(file));
  await db.transaction('rw', db.documents, db.documentPages, db.browserBlobs, async () => {
    if (browserBlob) await db.browserBlobs.put({ id: sourceId, blob: browserBlob });
    await db.documents.update(documentId, patch);
    if (sourceChanged) await db.documentPages.where('documentId').equals(documentId).delete();
    if (previousSource.kind === 'browser' && previousSource.id !== sourceId) {
      const references = await db.documents.where('sourceId').equals(previousSource.id).count();
      if (references === 0) await db.browserBlobs.delete(previousSource.id);
    }
  });
  return { ...existing, ...patch } as DocumentRecord;
}

export async function removeDocumentResource(documentId: string) {
  const existing = await db.documents.get(documentId);
  if (!existing) return null;

  await db.transaction('rw', db.documents, db.documentPages, db.browserBlobs, async () => {
    await db.documentPages.where('documentId').equals(documentId).delete();
    await db.documents.delete(documentId);
    if (existing.sourceKind === 'browser') {
      const references = await db.documents.where('sourceId').equals(existing.sourceId).count();
      if (references === 0) await db.browserBlobs.delete(existing.sourceId);
    }
  });
  return existing;
}

export async function garbageCollectBrowserBlobs() {
  const browserDocuments = (await db.documents.toArray()).filter((document) => document.sourceKind === 'browser');
  const referenced = new Set(browserDocuments.map((document) => document.sourceId));
  const blobIds = await db.browserBlobs.toCollection().primaryKeys();
  const orphanIds = blobIds.filter((id) => !referenced.has(String(id))).map(String);
  if (orphanIds.length) await db.browserBlobs.bulkDelete(orphanIds);
  return orphanIds.length;
}

export async function touchDocumentResource(id: string) {
  await db.documents.update(id, { lastOpenedAt: Date.now() });
}

export async function updateDocumentViewState(
  id: string,
  patch: Partial<Pick<DocumentRecord, 'currentPage' | 'zoom' | 'rotation' | 'viewMode'>>,
) {
  await db.documents.update(id, patch);
}

export async function putDocumentPageIndex(record: DocumentPageRecord) {
  await db.documentPages.put(record);
}

export async function bulkPutDocumentPageIndex(records: DocumentPageRecord[]) {
  if (records.length) await db.documentPages.bulkPut(records);
}

export async function clearDocumentPageIndex(documentId: string) {
  return db.documentPages.where('documentId').equals(documentId).delete();
}

export async function getDocumentPageIndex(documentId: string) {
  return db.documentPages.where('documentId').equals(documentId).sortBy('pageNumber');
}

export async function getDocumentIndexedPageCount(documentId: string) {
  return db.documentPages.where('documentId').equals(documentId).count();
}

export async function ensureDefaultGestureProfile() {
  const existing = await db.gestureProfiles.get(DEFAULT_GESTURE_PROFILE_ID);
  if (!existing) await db.gestureProfiles.put({ ...defaultGestureProfile });
  const active = await db.settings.get(ACTIVE_GESTURE_PROFILE_KEY);
  if (!active) await setSetting(ACTIVE_GESTURE_PROFILE_KEY, DEFAULT_GESTURE_PROFILE_ID);
}

export async function getActiveGestureProfile() {
  await ensureDefaultGestureProfile();
  const active = await getSetting<string>(ACTIVE_GESTURE_PROFILE_KEY, DEFAULT_GESTURE_PROFILE_ID);
  return (await db.gestureProfiles.get(active)) ?? (await db.gestureProfiles.get(DEFAULT_GESTURE_PROFILE_ID)) ?? { ...defaultGestureProfile };
}

export async function setActiveGestureProfile(id: string) {
  if (!(await db.gestureProfiles.get(id))) throw new Error('Gesture profile does not exist.');
  await setSetting(ACTIVE_GESTURE_PROFILE_KEY, id);
}

export async function updateGestureProfile(id: string, patch: Partial<Omit<GestureProfile, 'id'>>) {
  const profile = await db.gestureProfiles.get(id);
  if (!profile) throw new Error('Gesture profile does not exist.');
  const pinchOn = Math.max(0.12, Math.min(0.42, patch.pinchOn ?? profile.pinchOn));
  const pinchOff = Math.max(pinchOn + 0.04, Math.min(0.62, patch.pinchOff ?? profile.pinchOff));
  const next: GestureProfile = {
    ...profile,
    ...patch,
    pinchOn,
    pinchOff,
    pointerSmoothing: Math.max(0.08, Math.min(0.9, patch.pointerSmoothing ?? profile.pointerSmoothing)),
    dragSmoothing: Math.max(0.08, Math.min(0.9, patch.dragSmoothing ?? profile.dragSmoothing)),
    sensitivity: Math.max(0.55, Math.min(1.8, patch.sensitivity ?? profile.sensitivity)),
    updatedAt: Date.now(),
  };
  await db.gestureProfiles.put(next);
  return next;
}

export async function createGestureProfile(name = 'Custom profile') {
  const profile: GestureProfile = {
    ...defaultGestureProfile,
    id: crypto.randomUUID(),
    name,
    updatedAt: Date.now(),
  };
  await db.gestureProfiles.add(profile);
  return profile;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const record = await db.settings.get(key);
  return (record?.value as T | undefined) ?? fallback;
}

export async function setSetting<T>(key: string, value: T) {
  const record: AppSettingRecord = { key, value };
  await db.settings.put(record);
}

export const getUiScale = () => getSetting<number>(UI_SCALE_KEY, 1);
export const setUiScale = (value: number) => setSetting(UI_SCALE_KEY, Math.max(0.9, Math.min(1.3, value)));
export const getReducedMotion = () => getSetting<boolean>(REDUCED_MOTION_KEY, false);
export const setReducedMotion = (value: boolean) => setSetting(REDUCED_MOTION_KEY, Boolean(value));
