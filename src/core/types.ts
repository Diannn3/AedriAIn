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
  title: string;
  open: boolean;
  focused: boolean;
  minimized: boolean;
  maximized: boolean;
  zOrder: number;
  restoreTransform?: SpatialWindowTransform;
}

export interface TaskItem {
  id: string;
  title: string;
  dueLabel: string;
  done: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface DesktopBridge {
  pickFiles(): Promise<Array<{ name: string; path: string; size: number }>>;
  openPath(path: string): Promise<{ ok: boolean; error?: string }>;
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
