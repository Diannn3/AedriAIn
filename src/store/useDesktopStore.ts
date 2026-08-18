import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppId, SpatialWindowModel, TaskItem, Vec3Tuple } from '../core/types';

const initialWindows: SpatialWindowModel[] = [
  { id: 'notes-main', appId: 'notes', title: 'Notes', position: [-2.55, 0.85, 0], rotationZ: -0.03, scale: 1, open: true, focused: false, zOrder: 2 },
  { id: 'tasks-main', appId: 'tasks', title: 'Tasks', position: [2.55, 0.85, 0], rotationZ: 0.03, scale: 1, open: true, focused: false, zOrder: 3 },
  { id: 'calendar-main', appId: 'calendar', title: 'Calendar', position: [0, -1.65, 0], rotationZ: 0, scale: 1, open: true, focused: true, zOrder: 4 },
  { id: 'map-main', appId: 'map', title: 'UPLB Map', position: [3.6, -1.65, -0.25], rotationZ: 0.02, scale: 0.9, open: false, focused: false, zOrder: 1 },
  { id: 'files-main', appId: 'files', title: 'Files', position: [-3.6, -1.65, -0.25], rotationZ: -0.02, scale: 0.9, open: false, focused: false, zOrder: 1 },
  { id: 'assistant-main', appId: 'assistant', title: 'AI Console', position: [0, 1.95, -0.3], rotationZ: 0, scale: 0.92, open: false, focused: false, zOrder: 1 },
];

const initialTasks: TaskItem[] = [
  { id: 't1', title: 'Review MATH notes', dueLabel: 'Today · 7:00 PM', done: false, priority: 'high' },
  { id: 't2', title: 'Check org deliverables', dueLabel: 'Tomorrow', done: false, priority: 'medium' },
  { id: 't3', title: 'Prototype hand gestures', dueLabel: 'This week', done: true, priority: 'low' },
];

interface DesktopState {
  windows: SpatialWindowModel[];
  notes: string;
  tasks: TaskItem[];
  toast: string | null;
  maxZ: number;
  openApp: (appId: AppId) => void;
  closeWindow: (id: string) => void;
  focusWindow: (id: string) => void;
  setWindowTransform: (id: string, patch: Partial<Pick<SpatialWindowModel, 'position' | 'rotationZ' | 'scale'>>) => void;
  resetWorkspace: () => void;
  applyStudyLayout: () => void;
  setAllOpen: (open: boolean) => void;
  setNotes: (value: string) => void;
  toggleTask: (id: string) => void;
  addTask: (title: string) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
}

const cloneInitialWindows = () => initialWindows.map((item) => ({ ...item, position: [...item.position] as Vec3Tuple }));

export const useDesktopStore = create<DesktopState>()(
  persist(
    (set, get) => ({
      windows: cloneInitialWindows(),
      notes: 'Spatial Desktop notes\n\n• Pinch a window header to grab it.\n• Two pinches resize + rotate.\n• Mouse drag remains available as a fallback.\n\nNext: connect course notes, UPLB modules, and AI tools.',
      tasks: initialTasks,
      toast: null,
      maxZ: 10,
      openApp: (appId) => {
        const existing = get().windows.find((w) => w.appId === appId);
        if (!existing) return;
        get().focusWindow(existing.id);
        set((state) => ({ windows: state.windows.map((w) => (w.id === existing.id ? { ...w, open: true } : w)) }));
      },
      closeWindow: (id) => set((state) => ({ windows: state.windows.map((w) => (w.id === id ? { ...w, open: false, focused: false } : w)) })),
      focusWindow: (id) => {
        const nextZ = get().maxZ + 1;
        set((state) => ({
          maxZ: nextZ,
          windows: state.windows.map((w) => ({ ...w, focused: w.id === id, zOrder: w.id === id ? nextZ : w.zOrder })),
        }));
      },
      setWindowTransform: (id, patch) => set((state) => ({ windows: state.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),
      resetWorkspace: () => set({ windows: cloneInitialWindows(), maxZ: 10 }),
      applyStudyLayout: () => set((state) => ({
        windows: state.windows.map((w) => {
          if (w.appId === 'notes') return { ...w, open: true, position: [-2.55, 0.55, 0] as Vec3Tuple, scale: 1.02, rotationZ: -0.02 };
          if (w.appId === 'tasks') return { ...w, open: true, position: [2.55, 0.55, 0] as Vec3Tuple, scale: 1.02, rotationZ: 0.02 };
          if (w.appId === 'calendar') return { ...w, open: true, position: [0, -1.8, 0] as Vec3Tuple, scale: 0.95, rotationZ: 0 };
          return { ...w, open: false };
        }),
      })),
      setAllOpen: (open) => set((state) => ({ windows: state.windows.map((w) => ({ ...w, open })) })),
      setNotes: (notes) => set({ notes }),
      toggleTask: (id) => set((state) => ({ tasks: state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)) })),
      addTask: (title) => set((state) => ({ tasks: [{ id: crypto.randomUUID(), title, dueLabel: 'No due date', done: false, priority: 'medium' }, ...state.tasks] })),
      showToast: (toast) => set({ toast }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'spatial-student-desktop-v1',
      partialize: (state) => ({ windows: state.windows, notes: state.notes, tasks: state.tasks, maxZ: state.maxZ }),
    },
  ),
);
