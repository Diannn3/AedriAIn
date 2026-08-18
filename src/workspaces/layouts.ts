import type { AppId, Vec3Tuple } from '../core/types';

export type WorkspaceId = 'study' | 'planning' | 'minimal';

export interface WorkspaceWindowRule {
  appId: AppId;
  open: boolean;
  position?: Vec3Tuple;
  scale?: number;
  rotationZ?: number;
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
    ],
  },
};
