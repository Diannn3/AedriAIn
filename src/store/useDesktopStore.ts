import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppId,
  SpatialWindowGeometry,
  SpatialWindowModel,
  SpatialWindowTransform,
  Vec3Tuple,
} from '../core/types';
import { appWindowDefaults, singletonApps } from '../apps/windowDefaults';
import { DEFAULT_NOTE_ID } from '../storage/defaults';
import { createNoteResource } from '../storage/resources';
import { workspaceLayouts, type WorkspaceId } from '../workspaces/layouts';

const MIN_SCALE = 0.55;
const MAX_SCALE = 1.85;
const MAX_ROTATION = 0.72;
const X_BOUNDS: [number, number] = [-5.8, 5.8];
const Y_BOUNDS: [number, number] = [-3.1, 3.1];
const Z_BOUNDS: [number, number] = [-1.2, 1.2];

const appTitles: Record<AppId, string> = {
  notes: 'Notes',
  tasks: 'Tasks',
  calendar: 'Calendar',
  map: 'Maps',
  files: 'Files',
  document: 'Document',
  assistant: 'AI Console',
  settings: 'Settings',
};

function windowFor(
  id: string,
  appId: AppId,
  title: string,
  position: Vec3Tuple,
  zOrder: number,
  options: Partial<Pick<SpatialWindowModel, 'resourceId' | 'rotationZ' | 'scale' | 'open' | 'focused'>> = {},
): SpatialWindowModel {
  const geometry = appWindowDefaults[appId];
  return {
    id,
    appId,
    title,
    resourceId: options.resourceId,
    width: geometry.width,
    height: geometry.height,
    position,
    rotationZ: options.rotationZ ?? 0,
    scale: options.scale ?? 1,
    open: options.open ?? true,
    focused: options.focused ?? false,
    minimized: false,
    maximized: false,
    zOrder,
  };
}

const initialWindows: SpatialWindowModel[] = [
  windowFor('notes-main', 'notes', 'Notes', [-2.55, 0.85, 0], 2, { resourceId: DEFAULT_NOTE_ID, rotationZ: -0.03 }),
  windowFor('tasks-main', 'tasks', 'Tasks', [2.55, 0.85, 0], 3, { rotationZ: 0.03 }),
  windowFor('calendar-main', 'calendar', 'Calendar', [0, -1.65, 0], 4, { focused: true }),
  windowFor('map-main', 'map', 'Maps', [3.6, -1.65, -0.25], 1, { open: false, rotationZ: 0.02, scale: 0.9 }),
  windowFor('files-main', 'files', 'Files', [-3.6, -1.65, -0.25], 1, { open: false, rotationZ: -0.02, scale: 0.9 }),
  windowFor('assistant-main', 'assistant', 'AI Console', [0, 1.95, -0.3], 1, { open: false, scale: 0.92 }),
  windowFor('settings-main', 'settings', 'Settings', [0, 0.35, 0.1], 1, { open: false }),
];

interface DesktopState {
  windows: SpatialWindowModel[];
  toast: string | null;
  maxZ: number;
  openApp: (appId: AppId) => void;
  spawnWindow: (appId: AppId, title?: string, resourceId?: string) => string;
  closeWindow: (id: string) => void;
  removeWindowsForResource: (resourceId: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  setWindowTransform: (id: string, patch: Partial<SpatialWindowTransform>) => void;
  setWindowGeometry: (id: string, patch: Partial<SpatialWindowGeometry>) => void;
  setWindowTitle: (id: string, title: string) => void;
  resetWorkspace: () => void;
  applyWorkspace: (workspaceId: WorkspaceId) => void;
  applyStudyLayout: () => void;
  setAllOpen: (open: boolean) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

const clamp = (value: number, [min, max]: [number, number]) => Math.max(min, Math.min(max, value));
const cloneInitialWindows = () => initialWindows.map((item) => ({ ...item, position: [...item.position] as Vec3Tuple }));

function focusExactly(windows: SpatialWindowModel[], id: string | null, zOrder?: number) {
  return windows.map((windowModel) => ({
    ...windowModel,
    focused: Boolean(id && windowModel.id === id && windowModel.open && !windowModel.minimized),
    ...(id && windowModel.id === id && zOrder != null ? { zOrder } : {}),
  }));
}

function fallbackFocus(windows: SpatialWindowModel[]) {
  return windows.filter((windowModel) => windowModel.open && !windowModel.minimized).sort((a, b) => b.zOrder - a.zOrder)[0]?.id ?? null;
}

function normalizeWindow(windowModel: any): SpatialWindowModel {
  const appId = (Object.prototype.hasOwnProperty.call(appWindowDefaults, windowModel.appId) ? windowModel.appId : 'notes') as AppId;
  const defaults = appWindowDefaults[appId];
  return {
    ...windowModel,
    appId,
    title: appId === 'map' ? 'Maps' : windowModel.title ?? appTitles[appId],
    width: Number.isFinite(windowModel.width) ? clamp(windowModel.width, [defaults.minWidth, defaults.maxWidth]) : defaults.width,
    height: Number.isFinite(windowModel.height) ? clamp(windowModel.height, [defaults.minHeight, defaults.maxHeight]) : defaults.height,
    resourceId: appId === 'notes' ? (windowModel.resourceId ?? DEFAULT_NOTE_ID) : windowModel.resourceId,
    minimized: Boolean(windowModel.minimized),
    maximized: Boolean(windowModel.maximized),
    restoreTransform: windowModel.restoreTransform,
    restoreGeometry: windowModel.restoreGeometry,
  } as SpatialWindowModel;
}

function sanitizeTransform(patch: Partial<SpatialWindowTransform>): Partial<SpatialWindowTransform> {
  const next: Partial<SpatialWindowTransform> = {};
  if (patch.position) next.position = [
    clamp(patch.position[0], X_BOUNDS),
    clamp(patch.position[1], Y_BOUNDS),
    clamp(patch.position[2], Z_BOUNDS),
  ];
  if (patch.scale != null && Number.isFinite(patch.scale)) next.scale = clamp(patch.scale, [MIN_SCALE, MAX_SCALE]);
  if (patch.rotationZ != null && Number.isFinite(patch.rotationZ)) next.rotationZ = clamp(patch.rotationZ, [-MAX_ROTATION, MAX_ROTATION]);
  return next;
}

function sanitizeGeometry(windowModel: SpatialWindowModel, patch: Partial<SpatialWindowGeometry>) {
  const bounds = appWindowDefaults[windowModel.appId];
  return {
    ...(patch.width != null && Number.isFinite(patch.width) ? { width: clamp(patch.width, [bounds.minWidth, bounds.maxWidth]) } : {}),
    ...(patch.height != null && Number.isFinite(patch.height) ? { height: clamp(patch.height, [bounds.minHeight, bounds.maxHeight]) } : {}),
  };
}

export const useDesktopStore = create<DesktopState>()(
  persist(
    (set, get) => ({
      windows: cloneInitialWindows(),
      toast: null,
      maxZ: 10,

      openApp: (appId) => {
        const state = get();
        const existing = state.windows.filter((windowModel) => windowModel.appId === appId).sort((a, b) => b.zOrder - a.zOrder)[0];
        if (!existing) {
          get().spawnWindow(appId);
          return;
        }
        const nextZ = state.maxZ + 1;
        set({
          maxZ: nextZ,
          windows: state.windows.map((windowModel) => windowModel.id === existing.id
            ? { ...windowModel, open: true, minimized: false, focused: true, zOrder: nextZ }
            : { ...windowModel, focused: false }),
        });
      },

      spawnWindow: (appId, title, requestedResourceId) => {
        const state = get();
        if (singletonApps.has(appId)) {
          const existing = state.windows.filter((windowModel) => windowModel.appId === appId).sort((a, b) => b.zOrder - a.zOrder)[0];
          if (existing) {
            get().openApp(appId);
            return existing.id;
          }
        }

        const nextZ = state.maxZ + 1;
        const count = state.windows.filter((windowModel) => windowModel.appId === appId).length;
        const id = `${appId}-${crypto.randomUUID()}`;
        const offset = Math.min(count, 5) * 0.22;
        let resourceId = requestedResourceId;
        let resolvedTitle = title ?? `${appTitles[appId]}${count ? ` ${count + 1}` : ''}`;

        if (appId === 'notes' && !resourceId) {
          resourceId = crypto.randomUUID();
          resolvedTitle = title ?? `Untitled note ${Math.max(1, count + 1)}`;
          void createNoteResource(resolvedTitle, '', resourceId);
        }

        const created = windowFor(id, appId, resolvedTitle, [offset, 0.35 - offset, 0], nextZ, { resourceId, focused: true });
        set({
          maxZ: nextZ,
          windows: [...state.windows.map((windowModel) => ({ ...windowModel, focused: false })), created],
        });
        return id;
      },

      closeWindow: (id) => set((state) => {
        const closing = state.windows.find((windowModel) => windowModel.id === id);
        const closed = state.windows.map((windowModel) => windowModel.id === id
          ? { ...windowModel, open: false, focused: false, minimized: false, maximized: false, restoreTransform: undefined, restoreGeometry: undefined }
          : windowModel);
        if (!closing?.focused) return { windows: closed };
        return { windows: focusExactly(closed, fallbackFocus(closed)) };
      }),

      removeWindowsForResource: (resourceId) => set((state) => {
        const remaining = state.windows.filter((windowModel) => windowModel.resourceId !== resourceId);
        const focused = remaining.find((windowModel) => windowModel.focused && windowModel.open && !windowModel.minimized);
        return { windows: focused ? remaining : focusExactly(remaining, fallbackFocus(remaining)) };
      }),

      minimizeWindow: (id) => set((state) => {
        const minimized = state.windows.map((windowModel) => windowModel.id === id ? { ...windowModel, minimized: true, focused: false } : windowModel);
        return { windows: focusExactly(minimized, fallbackFocus(minimized)) };
      }),

      toggleMaximizeWindow: (id) => set((state) => {
        const target = state.windows.find((windowModel) => windowModel.id === id);
        if (!target) return {};
        if (target.maximized && target.restoreTransform) {
          return {
            windows: state.windows.map((windowModel) => windowModel.id === id ? {
              ...windowModel,
              ...target.restoreTransform,
              ...(target.restoreGeometry ?? {}),
              maximized: false,
              restoreTransform: undefined,
              restoreGeometry: undefined,
            } : windowModel),
          };
        }
        const bounds = appWindowDefaults[target.appId];
        const nextZ = state.maxZ + 1;
        return {
          maxZ: nextZ,
          windows: state.windows.map((windowModel) => windowModel.id === id ? {
            ...windowModel,
            restoreTransform: { position: [...windowModel.position] as Vec3Tuple, rotationZ: windowModel.rotationZ, scale: windowModel.scale },
            restoreGeometry: { width: windowModel.width, height: windowModel.height },
            position: [0, 0.1, 0] as Vec3Tuple,
            rotationZ: 0,
            scale: 1,
            width: Math.min(bounds.maxWidth, Math.max(bounds.width * 1.35, 4.4)),
            height: Math.min(bounds.maxHeight, Math.max(bounds.height * 1.35, 3.25)),
            maximized: true,
            minimized: false,
            focused: true,
            zOrder: nextZ,
          } : { ...windowModel, focused: false }),
        };
      }),

      focusWindow: (id) => {
        const state = get();
        const target = state.windows.find((windowModel) => windowModel.id === id && windowModel.open && !windowModel.minimized);
        if (!target) return;
        const nextZ = state.maxZ + 1;
        set({ maxZ: nextZ, windows: focusExactly(state.windows, id, nextZ) });
      },

      setWindowTransform: (id, patch) => set((state) => ({
        windows: state.windows.map((windowModel) => windowModel.id === id
          ? { ...windowModel, ...sanitizeTransform(patch), maximized: false, restoreTransform: undefined, restoreGeometry: undefined }
          : windowModel),
      })),

      setWindowGeometry: (id, patch) => set((state) => ({
        windows: state.windows.map((windowModel) => windowModel.id === id
          ? { ...windowModel, ...sanitizeGeometry(windowModel, patch), maximized: false, restoreTransform: undefined, restoreGeometry: undefined }
          : windowModel),
      })),

      setWindowTitle: (id, title) => set((state) => ({
        windows: state.windows.map((windowModel) => windowModel.id === id ? { ...windowModel, title: title || appTitles[windowModel.appId] } : windowModel),
      })),

      resetWorkspace: () => set({ windows: cloneInitialWindows(), maxZ: 10 }),

      applyWorkspace: (workspaceId) => set((state) => {
        const layout = workspaceLayouts[workspaceId];
        const nextZ = state.maxZ + 1;
        const hasDocument = state.windows.some((windowModel) => windowModel.appId === 'document');
        const researchNeedsFile = workspaceId === 'research' && !hasDocument;
        const effectiveFocusAppId: AppId | null = researchNeedsFile ? 'files' : layout.focusAppId;
        const primaryByApp = new Map<AppId, string>();
        for (const appId of Object.keys(appTitles) as AppId[]) {
          const primary = state.windows.filter((windowModel) => windowModel.appId === appId).sort((a, b) => b.zOrder - a.zOrder)[0];
          if (primary) primaryByApp.set(appId, primary.id);
        }

        let focusedId: string | null = null;
        const windows = state.windows.map((windowModel) => {
          const rule = layout.windows.find((item) => item.appId === windowModel.appId);
          if (!rule) return { ...windowModel, focused: false };
          const isPrimary = primaryByApp.get(windowModel.appId) === windowModel.id;
          if (!isPrimary && rule.primaryOnly !== false) {
            return { ...windowModel, open: false, focused: false, minimized: false, maximized: false, restoreTransform: undefined, restoreGeometry: undefined };
          }
          const effectiveOpen = researchNeedsFile && windowModel.appId === 'files' ? true : rule.open;
          const shouldFocus = effectiveFocusAppId === windowModel.appId && !focusedId && effectiveOpen;
          if (shouldFocus) focusedId = windowModel.id;
          return {
            ...windowModel,
            open: effectiveOpen,
            minimized: false,
            maximized: false,
            restoreTransform: undefined,
            restoreGeometry: undefined,
            focused: shouldFocus,
            zOrder: shouldFocus ? nextZ : windowModel.zOrder,
            ...(rule.position ? { position: [...rule.position] as Vec3Tuple } : {}),
            ...(rule.scale != null ? { scale: rule.scale } : {}),
            ...(rule.rotationZ != null ? { rotationZ: rule.rotationZ } : {}),
            ...(rule.width != null ? { width: rule.width } : {}),
            ...(rule.height != null ? { height: rule.height } : {}),
          };
        });
        return { windows, maxZ: focusedId ? nextZ : state.maxZ };
      }),

      applyStudyLayout: () => get().applyWorkspace('study'),

      setAllOpen: (open) => set((state) => {
        if (!open) return { windows: state.windows.map((windowModel) => ({ ...windowModel, open: false, focused: false, minimized: false })) };
        const nextZ = state.maxZ + 1;
        const preferred = state.windows.find((windowModel) => windowModel.appId === 'notes')?.id ?? state.windows[0]?.id ?? null;
        return {
          maxZ: nextZ,
          windows: state.windows.map((windowModel) => ({
            ...windowModel,
            open: true,
            minimized: false,
            focused: windowModel.id === preferred,
            zOrder: windowModel.id === preferred ? nextZ : windowModel.zOrder,
          })),
        };
      }),

      showToast: (toast) => set({ toast }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'aedriain-desktop',
      version: 6,
      partialize: (state) => ({ windows: state.windows, maxZ: state.maxZ }),
      migrate: (persisted: any) => {
        if (!persisted || typeof persisted !== 'object') return persisted;
        const rawWindows = Array.isArray(persisted.windows) ? persisted.windows : cloneInitialWindows();
        const normalized = rawWindows.map(normalizeWindow);
        const focused = normalized
          .filter((windowModel: SpatialWindowModel) => windowModel.open && !windowModel.minimized && windowModel.focused)
          .sort((a: SpatialWindowModel, b: SpatialWindowModel) => b.zOrder - a.zOrder)[0];
        return { windows: focusExactly(normalized, focused?.id ?? fallbackFocus(normalized)), maxZ: Number.isFinite(persisted.maxZ) ? persisted.maxZ : 10 };
      },
    },
  ),
);
