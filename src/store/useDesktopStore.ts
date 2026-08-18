import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppId, SpatialWindowModel, TaskItem, Vec3Tuple } from '../core/types';
import { workspaceLayouts, type WorkspaceId } from '../workspaces/layouts';

const appTitles: Record<AppId, string> = {
  notes: 'Notes',
  tasks: 'Tasks',
  calendar: 'Calendar',
  map: 'Maps',
  files: 'Files',
  assistant: 'AI Console',
};

const initialWindows: SpatialWindowModel[] = [
  { id: 'notes-main', appId: 'notes', title: 'Notes', position: [-2.55, 0.85, 0], rotationZ: -0.03, scale: 1, open: true, focused: false, minimized: false, maximized: false, zOrder: 2 },
  { id: 'tasks-main', appId: 'tasks', title: 'Tasks', position: [2.55, 0.85, 0], rotationZ: 0.03, scale: 1, open: true, focused: false, minimized: false, maximized: false, zOrder: 3 },
  { id: 'calendar-main', appId: 'calendar', title: 'Calendar', position: [0, -1.65, 0], rotationZ: 0, scale: 1, open: true, focused: true, minimized: false, maximized: false, zOrder: 4 },
  { id: 'map-main', appId: 'map', title: 'Maps', position: [3.6, -1.65, -0.25], rotationZ: 0.02, scale: 0.9, open: false, focused: false, minimized: false, maximized: false, zOrder: 1 },
  { id: 'files-main', appId: 'files', title: 'Files', position: [-3.6, -1.65, -0.25], rotationZ: -0.02, scale: 0.9, open: false, focused: false, minimized: false, maximized: false, zOrder: 1 },
  { id: 'assistant-main', appId: 'assistant', title: 'AI Console', position: [0, 1.95, -0.3], rotationZ: 0, scale: 0.92, open: false, focused: false, minimized: false, maximized: false, zOrder: 1 },
];

const initialTasks: TaskItem[] = [
  { id: 't1', title: 'Review class notes', dueLabel: 'Today · 7:00 PM', done: false, priority: 'high' },
  { id: 't2', title: 'Check project deliverables', dueLabel: 'Tomorrow', done: false, priority: 'medium' },
  { id: 't3', title: 'Prototype hand gestures', dueLabel: 'This week', done: true, priority: 'low' },
];

interface DesktopState {
  windows: SpatialWindowModel[];
  notes: string;
  tasks: TaskItem[];
  toast: string | null;
  maxZ: number;
  openApp: (appId: AppId) => void;
  spawnWindow: (appId: AppId, title?: string) => string;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  setWindowTransform: (id: string, patch: Partial<Pick<SpatialWindowModel, 'position' | 'rotationZ' | 'scale'>>) => void;
  resetWorkspace: () => void;
  applyWorkspace: (workspaceId: WorkspaceId) => void;
  applyStudyLayout: () => void;
  setAllOpen: (open: boolean) => void;
  setNotes: (value: string) => void;
  toggleTask: (id: string) => void;
  addTask: (title: string) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

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
  return {
    ...windowModel,
    title: windowModel.appId === 'map' ? 'Maps' : windowModel.title ?? appTitles[windowModel.appId as AppId] ?? 'Window',
    minimized: Boolean(windowModel.minimized),
    maximized: Boolean(windowModel.maximized),
    restoreTransform: windowModel.restoreTransform,
  } as SpatialWindowModel;
}

export const useDesktopStore = create<DesktopState>()(
  persist(
    (set, get) => ({
      windows: cloneInitialWindows(),
      notes: 'AedriAIn notes\n\n• Point at a holographic panel.\n• Pinch to grab it in world space.\n• Two pinches move, resize, and rotate.\n• Mouse and keyboard remain first-class fallbacks.\n\nNext: real files, schedules, maps, notes, tasks, and AI tools.',
      tasks: initialTasks,
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
          windows: state.windows.map((windowModel) => {
            if (windowModel.id === existing.id) return { ...windowModel, open: true, minimized: false, focused: true, zOrder: nextZ };
            return { ...windowModel, focused: false };
          }),
        });
      },

      spawnWindow: (appId, title) => {
        const state = get();
        const nextZ = state.maxZ + 1;
        const count = state.windows.filter((windowModel) => windowModel.appId === appId).length;
        const id = `${appId}-${crypto.randomUUID()}`;
        const offset = Math.min(count, 5) * 0.22;
        const created: SpatialWindowModel = {
          id,
          appId,
          title: title ?? `${appTitles[appId]}${count ? ` ${count + 1}` : ''}`,
          position: [offset, 0.35 - offset, 0],
          rotationZ: 0,
          scale: 1,
          open: true,
          focused: true,
          minimized: false,
          maximized: false,
          zOrder: nextZ,
        };
        set({ maxZ: nextZ, windows: [...state.windows.map((windowModel) => ({ ...windowModel, focused: false })), created] });
        return id;
      },

      closeWindow: (id) => set((state) => {
        const closing = state.windows.find((windowModel) => windowModel.id === id);
        const closed = state.windows.map((windowModel) => windowModel.id === id ? { ...windowModel, open: false, focused: false, minimized: false, maximized: false, restoreTransform: undefined } : windowModel);
        if (!closing?.focused) return { windows: closed };
        return { windows: focusExactly(closed, fallbackFocus(closed)) };
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
              maximized: false,
              restoreTransform: undefined,
            } : windowModel),
          };
        }
        return {
          windows: state.windows.map((windowModel) => windowModel.id === id ? {
            ...windowModel,
            restoreTransform: { position: [...windowModel.position] as Vec3Tuple, rotationZ: windowModel.rotationZ, scale: windowModel.scale },
            position: [0, 0.15, 0] as Vec3Tuple,
            rotationZ: 0,
            scale: 1.55,
            maximized: true,
            minimized: false,
          } : windowModel),
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
        windows: state.windows.map((windowModel) => windowModel.id === id ? { ...windowModel, ...patch, maximized: false, restoreTransform: undefined } : windowModel),
      })),

      resetWorkspace: () => set({ windows: cloneInitialWindows(), maxZ: 10 }),

      applyWorkspace: (workspaceId) => set((state) => {
        const layout = workspaceLayouts[workspaceId];
        const nextZ = state.maxZ + 1;
        let focusedId: string | null = null;
        const windows = state.windows.map((windowModel) => {
          const rule = layout.windows.find((item) => item.appId === windowModel.appId);
          if (!rule) return { ...windowModel, focused: false };
          const shouldFocus = layout.focusAppId === windowModel.appId && !focusedId;
          if (shouldFocus) focusedId = windowModel.id;
          return {
            ...windowModel,
            open: rule.open,
            minimized: false,
            maximized: false,
            restoreTransform: undefined,
            focused: shouldFocus,
            zOrder: shouldFocus ? nextZ : windowModel.zOrder,
            ...(rule.position ? { position: [...rule.position] as Vec3Tuple } : {}),
            ...(rule.scale != null ? { scale: rule.scale } : {}),
            ...(rule.rotationZ != null ? { rotationZ: rule.rotationZ } : {}),
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

      setNotes: (notes) => set({ notes }),
      toggleTask: (id) => set((state) => ({ tasks: state.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) })),
      addTask: (title) => set((state) => ({ tasks: [{ id: crypto.randomUUID(), title, dueLabel: 'No due date', done: false, priority: 'medium' }, ...state.tasks] })),
      showToast: (toast) => set({ toast }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'aedriain-desktop',
      version: 3,
      partialize: (state) => ({ windows: state.windows, notes: state.notes, tasks: state.tasks, maxZ: state.maxZ }),
      migrate: (persisted: any) => {
        if (!persisted || typeof persisted !== 'object') return persisted;
        const rawWindows = Array.isArray(persisted.windows) ? persisted.windows : cloneInitialWindows();
        const normalized = rawWindows.map(normalizeWindow);
        const focused = normalized.filter((windowModel: SpatialWindowModel) => windowModel.open && !windowModel.minimized && windowModel.focused).sort((a: SpatialWindowModel, b: SpatialWindowModel) => b.zOrder - a.zOrder)[0];
        return { ...persisted, windows: focusExactly(normalized, focused?.id ?? fallbackFocus(normalized)) };
      },
    },
  ),
);
