export type AppId = 'notes' | 'tasks' | 'calendar' | 'map' | 'files' | 'document' | 'assistant';
export type Vec3Tuple = [number, number, number];

export interface SpatialWindowTransform {
  position: Vec3Tuple;
  rotationZ: number;
  scale: number;
}

export interface SpatialWindowGeometry {
  width: number;
  height: number;
}

export interface SpatialWindowBounds {
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

export interface SpatialWindowModel extends SpatialWindowTransform, SpatialWindowGeometry {
  id: string;
  appId: AppId;
  resourceId?: string;
  title: string;
  open: boolean;
  focused: boolean;
  minimized: boolean;
  maximized: boolean;
  zOrder: number;
  restoreTransform?: SpatialWindowTransform;
  restoreGeometry?: SpatialWindowGeometry;
}

export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export type TaskStatus = 'todo' | 'done';

export interface TaskRecord {
  id: string;
  title: string;
  description?: string;
  dueAt?: number;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  updatedAt: number;
}

export type DocumentSourceKind = 'electron' | 'browser';

export interface DocumentRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sourceKind: DocumentSourceKind;
  sourceId: string;
  lastOpenedAt: number;
  currentPage: number;
  zoom: number;
  rotation: number;
}

export interface BrowserBlobRecord {
  id: string;
  blob: Blob;
}

export interface AppSettingRecord {
  key: string;
  value: unknown;
}

export interface GestureProfile {
  id: string;
  name: string;
  preferredHand: 'left' | 'right' | 'automatic';
  pinchOn: number;
  pinchOff: number;
  pointerSmoothing: number;
  dragSmoothing: number;
  sensitivity: number;
  updatedAt: number;
}

export interface FileDescriptor {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
}

export type FileReadResult =
  | { ok: true; file: FileDescriptor; data: Uint8Array }
  | { ok: false; error: string };

export interface DesktopBridge {
  pickFiles(): Promise<FileDescriptor[]>;
  openFile(fileId: string): Promise<{ ok: boolean; error?: string }>;
  readFile(fileId: string): Promise<FileReadResult>;
  fileResourceUrl(fileId: string): string;
  revokeFile(fileId: string): Promise<{ ok: boolean }>;
  platform(): Promise<string>;
}

declare global {
  interface Window {
    spatialDesktop?: DesktopBridge;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}
