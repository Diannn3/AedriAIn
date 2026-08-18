import type { AppId, Vec3Tuple } from '../core/types';

export type WorkspaceId = 'study' | 'planning' | 'research' | 'minimal';

export interface WorkspaceWindowRule {
  appId: AppId;
  open: boolean;
  position?: Vec3Tuple;
  scale?: number;
  rotationZ?: number;
  width?: number;
  height?: number;
  primaryOnly?: boolean;
}

export interface WorkspaceLayout {
  id: WorkspaceId;
  title: string;
  focusAppId: AppId | null;
  windows: WorkspaceWindowRule[];
}

export const workspaceLayouts: Record<WorkspaceId, WorkspaceLayout> = {
  study: {
    id: 'study',
    title: 'Study',
    focusAppId: 'notes',
    windows: [
      { appId: 'notes', open: true, position: [-2.55, 0.55, 0], scale: 1.02, rotationZ: -0.02 },
      { appId: 'tasks', open: true, position: [2.55, 0.55, 0], scale: 1.02, rotationZ: 0.02 },
      { appId: 'calendar', open: true, position: [0, -1.8, 0], scale: 0.95, rotationZ: 0 },
      { appId: 'map', open: false },
      { appId: 'files', open: false },
      { appId: 'document', open: false, primaryOnly: false },
      { appId: 'assistant', open: false },
    ],
  },
  planning: {
    id: 'planning',
    title: 'Planning',
    focusAppId: 'calendar',
    windows: [
      { appId: 'calendar', open: true, position: [-2.2, 0.55, 0], scale: 1.06, rotationZ: -0.01 },
      { appId: 'tasks', open: true, position: [2.2, 0.55, 0], scale: 1.06, rotationZ: 0.01 },
      { appId: 'notes', open: true, position: [0, -1.8, 0], scale: 0.9, rotationZ: 0 },
      { appId: 'map', open: false },
      { appId: 'files', open: false },
      { appId: 'document', open: false, primaryOnly: false },
      { appId: 'assistant', open: false },
    ],
  },
  research: {
    id: 'research',
    title: 'Research',
    focusAppId: 'document',
    windows: [
      { appId: 'document', open: true, position: [-1.45, 0.35, 0], width: 4.6, height: 3.5, scale: 0.95, rotationZ: -0.01, primaryOnly: true },
      { appId: 'notes', open: true, position: [3.05, 0.45, 0], width: 3.0, height: 2.9, scale: 0.95, rotationZ: 0.015 },
      { appId: 'tasks', open: true, position: [2.45, -2.15, -0.12], width: 2.8, height: 1.85, scale: 0.82, rotationZ: 0 },
      { appId: 'calendar', open: false },
      { appId: 'map', open: false },
      { appId: 'files', open: false },
      { appId: 'assistant', open: false },
    ],
  },
  minimal: {
    id: 'minimal',
    title: 'Minimal',
    focusAppId: 'assistant',
    windows: [
      { appId: 'assistant', open: true, position: [0, 0.2, 0], scale: 1.1, rotationZ: 0 },
      { appId: 'notes', open: false },
      { appId: 'tasks', open: false },
      { appId: 'calendar', open: false },
      { appId: 'map', open: false },
      { appId: 'files', open: false },
      { appId: 'document', open: false, primaryOnly: false },
    ],
  },
};
