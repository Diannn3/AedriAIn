import type { AppId, SpatialWindowBounds, SpatialWindowGeometry } from '../core/types';

export interface AppWindowDefaults extends SpatialWindowGeometry, SpatialWindowBounds {}

export const appWindowDefaults: Record<AppId, AppWindowDefaults> = {
  notes: { width: 3.05, height: 2.18, minWidth: 2.45, minHeight: 1.75, maxWidth: 5.4, maxHeight: 4.2 },
  tasks: { width: 3.05, height: 2.18, minWidth: 2.45, minHeight: 1.75, maxWidth: 5.0, maxHeight: 4.0 },
  calendar: { width: 3.8, height: 2.7, minWidth: 3.0, minHeight: 2.1, maxWidth: 6.2, maxHeight: 4.8 },
  map: { width: 4.1, height: 2.9, minWidth: 3.0, minHeight: 2.1, maxWidth: 6.4, maxHeight: 4.8 },
  files: { width: 3.45, height: 2.45, minWidth: 2.7, minHeight: 1.9, maxWidth: 5.6, maxHeight: 4.4 },
  document: { width: 4.5, height: 3.55, minWidth: 3.2, minHeight: 2.4, maxWidth: 7.4, maxHeight: 5.7 },
  assistant: { width: 3.2, height: 2.25, minWidth: 2.6, minHeight: 1.8, maxWidth: 5.2, maxHeight: 4.0 },
  settings: { width: 3.65, height: 3.1, minWidth: 3.0, minHeight: 2.35, maxWidth: 5.6, maxHeight: 4.8 },
};

export const singletonApps = new Set<AppId>(['tasks', 'calendar', 'map', 'files', 'assistant', 'settings']);
