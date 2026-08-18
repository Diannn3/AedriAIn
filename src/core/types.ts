export type AppId = 'notes' | 'tasks' | 'calendar' | 'map' | 'files' | 'assistant';
export type Vec3Tuple = [number, number, number];

export interface SpatialWindowTransform {
  position: Vec3Tuple;
  rotationZ: number;
  scale: number;
}

export interface SpatialWindowModel extends SpatialWindowTransform {
  id: string;
  appId: AppId;
  resourceId?: string;
  title: string;
  width: number;
  height: number;
  open: boolean;
  focused: boolean;
  minimized: boolean;
  maximized: boolean;
  zOrder: number;
  restoreTransform?: SpatialWindowTransform;
}

export interface NoteRecord {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaskItem {
  id: string;
  title: string;
  dueLabel: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
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
