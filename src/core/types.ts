export type AppId = 'notes' | 'tasks' | 'calendar' | 'map' | 'files' | 'assistant';
export type Vec3Tuple = [number, number, number];

export interface SpatialWindowModel {
  id: string;
  appId: AppId;
  title: string;
  position: Vec3Tuple;
  rotationZ: number;
  scale: number;
  open: boolean;
  focused: boolean;
  zOrder: number;
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
