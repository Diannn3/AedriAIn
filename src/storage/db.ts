import Dexie, { type Table } from 'dexie';
import type {
  AppSettingRecord,
  BrowserBlobRecord,
  DocumentRecord,
  GestureProfile,
  NoteRecord,
  TaskRecord,
} from '../core/types';

export class AedriAInDatabase extends Dexie {
  notes!: Table<NoteRecord, string>;
  tasks!: Table<TaskRecord, string>;
  documents!: Table<DocumentRecord, string>;
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
  }
}

export const db = new AedriAInDatabase();
