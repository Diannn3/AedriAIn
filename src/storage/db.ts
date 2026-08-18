import { Dexie, type Table } from 'dexie';
import type {
  AppSettingRecord,
  BrowserBlobRecord,
  DocumentPageRecord,
  DocumentRecord,
  GestureProfile,
  NoteRecord,
  TaskRecord,
} from '../core/types';

export class AedriAInDatabase extends Dexie {
  notes!: Table<NoteRecord, string>;
  tasks!: Table<TaskRecord, string>;
  documents!: Table<DocumentRecord, string>;
  documentPages!: Table<DocumentPageRecord, [string, number]>;
  browserBlobs!: Table<BrowserBlobRecord, string>;
  settings!: Table<AppSettingRecord, string>;
  gestureProfiles!: Table<GestureProfile, string>;

  constructor() {
    super('aedriain');
    this.version(1).stores({
      notes: 'id, title, updatedAt, createdAt',
      tasks: 'id, status, priority, dueAt, updatedAt',
      documents: 'id, sourceId, mimeType, name, lastOpenedAt',
      browserBlobs: 'id',
      settings: 'key',
      gestureProfiles: 'id, preferredHand, updatedAt',
    });
    this.version(2).stores({
      notes: 'id, title, updatedAt, createdAt',
      tasks: 'id, status, priority, dueAt, updatedAt',
      documents: 'id, sourceId, mimeType, name, lastOpenedAt',
      documentPages: '[documentId+pageNumber], documentId, pageNumber, indexedAt',
      browserBlobs: 'id',
      settings: 'key',
      gestureProfiles: 'id, preferredHand, updatedAt',
    }).upgrade(async (tx) => {
      await tx.table('documents').toCollection().modify((document: any) => {
        document.sourceFingerprint ??= {
          name: document.name,
          size: document.size ?? 0,
          mimeType: document.mimeType || 'application/octet-stream',
        };
        document.viewMode ??= 'single';
      });
    });
  }
}

export const db = new AedriAInDatabase();
