import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppId, NoteRecord, SpatialWindowModel, SpatialWindowTransform, TaskItem, Vec3Tuple } from '../core/types';
import { workspaceLayouts, type WorkspaceId } from '../workspaces/layouts';

const DEFAULT_NOTE_ID = 'note-default';
const DEFAULT_WINDOW_WIDTH = 3.05;
const DEFAULT_WINDOW_HEIGHT = 2.12;
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
  assistant: 'AI Console',
};

const singletonApps = new Set<AppId>(['tasks', 'calendar', 'map', 'files', 'assistant']);

const initialNotes: NoteRecord[] = [
  {
    id: DEFAULT_NOTE_ID,
    title: 'Notes',
    content: 'AedriAIn notes\n\n• Point at a holographic panel.\n• Pinch to grab it in world space.\n• Two pinches move, resize, and rotate.\n• Mouse and keyboard remain first-class fallbacks.\n\nCore V2.1 is separating windows from the resources they display.',
    createdAt: Date.UTC(2026, 7, 18),
    updatedAt: Date.UTC(2026, 7, 18),
  },
];

const initialWindows: SpatialWindowModel[] = [
  { id: 'notes-main', appId: 'notes', resourceId: DEFAULT_NOTE_ID, title: 'Notes', width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT, position: [-2.55, 0.85, 0], rotationZ: -0.03, scale: 1, open: true, focused: false, minimized: false, maximized: false, zOrder: 2 },
  { id: 'tasks-main', appId: 'tasks', title: 'Tasks', width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT, position: [2.55, 0.85, 0], rotationZ: 0.03, scale: 1, open: true, focused: false, minimized: false, maximized: false, zOrder: 3 },
  { id: 'calendar-main', appId: 'calendar', title: 'Calendar', width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT, position: [0, -1.65, 0], rotationZ: 0, scale: 1, open: true, focused: true, minimized: false, maximized: false, zOrder: 4 },
  { id: 'map-main', appId: 'map', title: 'Maps', width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT, position: [3.6, -1.65, -0.25], rotationZ: 0.02, scale: 0.9, open: false, focused: false, minimized: false, maximized: false, zOrder: 1 },
  { id: 'files-main', appId: 'files', title: 'Files', width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT, position: [-3.6, -1.65, -0.25], rotationZ: -0.02, scale: 0.9, open: false, focused: false, minimized: false, maximized: false, zOrder: 1 },
  { id: 'assistant-main', appId: 'assistant', title: 'AI Console', width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT, position: [0, 1.95, -0.3], rotationZ: 0, scale: 0.92, open: false, focused: false, minimized: false, maximized: false, zOrder: 1 },
];

const initialTasks: TaskItem[] = [
  { id: 't1', title: 'Review class notes', dueLabel: 'Today · 7:00 PM', done: false, priority: 'high' },
  { id: 't2', title: 'Check project deliverables', dueLabel: 'Tomorrow', done: false, priority: 'medium' },
  { id: 't3', title: 'Prototype hand gestures', dueLabel: 'This week', done: true, priority: 'low' },
];

interface DesktopState {
  windows: SpatialWindowModel[];
  notes: NoteRecord[];
  tasks: TaskItem[];
  toast: string | null;
  maxZ: number;
  openApp: (appId: AppId) => void;
  spawnWindow: (appId: AppId, title?: string, resourceId?: string) => string;
  closeWindow: (id: string) => void;
  minimizeWindow: (id: string) => void;
  toggleMaximizeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  setWindowTransform: (id: string, patch: Partial<SpatialWindowTransform>) => void;
  resetWorkspace: () => void;
  applyWorkspace: (workspaceId: WorkspaceId) => void;
  applyStudyLayout: () => void;
  setAllOpen: (open: boolean) => void;
  createNote: (title?: string, content?: string) => string;
  updateNote: (id: string, patch: Partial<Pick<NoteRecord, 'title' | 'content'>>) => void;
  toggleTask: (id: string) => void;
  addTask: (title: string) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

const clamp = (value: number, [min, max]: [number, number]) => Math.max(min, Math.min(max, value));
const cloneInitialWindows = () => initialWindows.map((item) => ({ ...item, position: [...item.position] as Vec3Tuple }));
const cloneInitialNotes = () => initialNotes.map((note) => ({ ...note }));

function makeNote(title = 'Untitled note', content = ''): NoteRecord {
  const now = Date.now();
  return { id: crypto.randomUUID(), title, content, createdAt: now, updatedAt: now };
}

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
    width: Number.isFinite(windowModel.width) ? windowModel.width : DEFAULT_WINDOW_WIDTH,
    height: Number.isFinite(windowModel.height) ? windowModel.height : DEFAULT_WINDOW_HEIGHT,
    resourceId: windowModel.appId === 'notes' ? (windowModel.resourceId ?? DEFAULT_NOTE_ID) : windowModel.resourceId,
    minimized: Boolean(windowModel.minimized),
    maximized: Boolean(windowModel.maximized),
    restoreTransform: windowModel.restoreTransform,
  } as SpatialWindowModel;
}

function sanitizeTransform(current: SpatialWindowModel, patch: Partial<SpatialWindowTransform>): Partial<SpatialWindowTransform> {
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

export const useDesktopStore = create<DesktopState>()(
  persist(
    (set, get) => ({
      windows: cloneInitialWindows(),
      notes: cloneInitialNotes(),
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
        let notes = state.notes;
        let resourceId = requestedResourceId;
        let resolvedTitle = title ?? `${appTitles[appId]}${count ? ` ${count + 1}` : ''}`;

        if (appId === 'notes') {
          const existingNote = resourceId ? state.notes.find((note) => note.id === resourceId) : null;
          const note = existingNote ?? makeNote(title ?? `Untitled note ${Math.max(1, count + 1)}`);
          if (!existingNote) notes = [...state.notes, note];
          resourceId = note.id;
          resolvedTitle = note.title;
        }

        const created: SpatialWindowModel = {
          id,
          appId,
          resourceId,
          title: resolvedTitle,
          width: DEFAULT_WINDOW_WIDTH,
          height: DEFAULT_WINDOW_HEIGHT,
          position: [offset, 0.35 - offset, 0],
          rotationZ: 0,
          scale: 1,
          open: true,
          focused: true,
          minimized: false,
          maximized: false,
          zOrder: nextZ,
        };

        set({
          notes,
          maxZ: nextZ,
          windows: [...state.windows.map((windowModel) => ({ ...windowModel, focused: false })), created],
        });
        return id;
      },

      closeWindow: (id) => set((state) => {
        const closing = state.windows.find((windowModel) => windowModel.id === id);
        const closed = state.windows.map((windowModel) => windowModel.id === id
          ? { ...windowModel, open: false, focused: false, minimized: false, maximized: false, restoreTransform: undefined }
          : windowModel);
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
        const nextZ = state.maxZ + 1;
        return {
          maxZ: nextZ,
          windows: state.windows.map((windowModel) => windowModel.id === id ? {
            ...windowModel,
            restoreTransform: { position: [...windowModel.position] as Vec3Tuple, rotationZ: windowModel.rotationZ, scale: windowModel.scale },
            position: [0, 0.15, 0] as Vec3Tuple,
            rotationZ: 0,
            scale: 1.55,
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
          ? { ...windowModel, ...sanitizeTransform(windowModel, patch), maximized: false, restoreTransform: undefined }
          : windowModel),
      })),

      resetWorkspace: () => set({ windows: cloneInitialWindows(), maxZ: 10 }),

      applyWorkspace: (workspaceId) => set((state) => {
        const layout = workspaceLayouts[workspaceId];
        const nextZ = state.maxZ + 1;
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
          if (!isPrimary) {
            return { ...windowModel, open: false, focused: false, minimized: false, maximized: false, restoreTransform: undefined };
          }
          const shouldFocus = layout.focusAppId === windowModel.appId && !focusedId && rule.open;
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

      createNote: (title, content) => {
        const note = makeNote(title, content);
        set((state) => ({ notes: [...state.notes, note] }));
        return note.id;
      },

      updateNote: (id, patch) => set((state) => {
        const now = Date.now();
        const notes = state.notes.map((note) => note.id === id ? { ...note, ...patch, updatedAt: now } : note);
        const windows = patch.title == null ? state.windows : state.windows.map((windowModel) => windowModel.resourceId === id ? { ...windowModel, title: patch.title || 'Untitled note' } : windowModel);
        return { notes, windows };
      }),

      toggleTask: (id) => set((state) => ({ tasks: state.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) })),
      addTask: (title) => set((state) => ({ tasks: [{ id: crypto.randomUUID(), title, dueLabel: 'No due date', done: false, priority: 'medium' }, ...state.tasks] })),
      showToast: (toast) => set({ toast }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'aedriain-desktop',
      version: 4,
      partialize: (state) => ({ windows: state.windows, notes: state.notes, tasks: state.tasks, maxZ: state.maxZ }),
      migrate: (persisted: any) => {
        if (!persisted || typeof persisted !== 'object') return persisted;
        const notes: NoteRecord[] = Array.isArray(persisted.notes)
          ? persisted.notes.map((note: any, index: number) => ({
            id: note.id ?? (index === 0 ? DEFAULT_NOTE_ID : `legacy-note-${index}`),
            title: note.title ?? (index === 0 ? 'Notes' : `Note ${index + 1}`),
            content: note.content ?? '',
            createdAt: Number.isFinite(note.createdAt) ? note.createdAt : Date.now(),
            updatedAt: Number.isFinite(note.updatedAt) ? note.updatedAt : Date.now(),
          }))
          : [{ ...initialNotes[0], content: typeof persisted.notes === 'string' ? persisted.notes : initialNotes[0].content }];
        const rawWindows = Array.isArray(persisted.windows) ? persisted.windows : cloneInitialWindows();
        const normalized = rawWindows.map(normalizeWindow);
        const focused = normalized.filter((windowModel: SpatialWindowModel) => windowModel.open && !windowModel.minimized && windowModel.focused).sort((a: SpatialWindowModel, b: SpatialWindowModel) => b.zOrder - a.zOrder)[0];
        return { ...persisted, notes, windows: focusExactly(normalized, focused?.id ?? fallbackFocus(normalized)) };
      },
    },
  ),
);
