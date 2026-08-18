import { lazy } from 'react';
import type { AppId } from '../core/types';
import { appWindowDefaults, singletonApps } from './windowDefaults';
import type { SpatialAppDefinition } from './types';

const lazyNamed = <T extends Record<string, unknown>, K extends keyof T>(
  loader: () => Promise<T>,
  exportName: K,
) => lazy(async () => ({ default: (await loader())[exportName] as never }));

export const apps: Record<AppId, SpatialAppDefinition> = {
  notes: {
    id: 'notes', title: 'Notes', icon: 'N', singleton: singletonApps.has('notes'), showInDock: true,
    capabilities: ['storage.read', 'storage.write'], defaultWindow: appWindowDefaults.notes,
    Component: lazyNamed(() => import('./notes/NotesApp'), 'NotesApp'),
  },
  tasks: {
    id: 'tasks', title: 'Tasks', icon: 'T', singleton: singletonApps.has('tasks'), showInDock: true,
    capabilities: ['storage.read', 'storage.write'], defaultWindow: appWindowDefaults.tasks,
    Component: lazyNamed(() => import('./tasks/TasksApp'), 'TasksApp'),
  },
  calendar: {
    id: 'calendar', title: 'Calendar', icon: 'C', singleton: singletonApps.has('calendar'), showInDock: true,
    capabilities: ['calendar.read'], defaultWindow: appWindowDefaults.calendar,
    Component: lazyNamed(() => import('./calendar/CalendarApp'), 'CalendarApp'),
  },
  map: {
    id: 'map', title: 'Maps', icon: 'M', singleton: singletonApps.has('map'), showInDock: true,
    capabilities: ['map.network'], defaultWindow: appWindowDefaults.map,
    Component: lazyNamed(() => import('./maps/MapsApp'), 'MapsApp'),
  },
  files: {
    id: 'files', title: 'Files', icon: 'F', singleton: singletonApps.has('files'), showInDock: true,
    capabilities: ['files.pick', 'files.open', 'files.read'], defaultWindow: appWindowDefaults.files,
    Component: lazyNamed(() => import('./files/FilesApp'), 'FilesApp'),
  },
  document: {
    id: 'document', title: 'Documents', icon: 'D', singleton: singletonApps.has('document'), showInDock: false,
    capabilities: ['storage.read', 'storage.write', 'files.open', 'files.read'], defaultWindow: appWindowDefaults.document,
    Component: lazyNamed(() => import('./documents/DocumentApp'), 'DocumentApp'),
  },
  settings: {
    id: 'settings', title: 'Settings', icon: 'S', singleton: singletonApps.has('settings'), showInDock: true,
    capabilities: ['storage.read', 'storage.write'], defaultWindow: appWindowDefaults.settings,
    Component: lazyNamed(() => import('./settings/SettingsApp'), 'SettingsApp'),
  },
  assistant: {
    id: 'assistant', title: 'AI Console', icon: 'A', singleton: singletonApps.has('assistant'), showInDock: true,
    capabilities: ['ai.tools'], defaultWindow: appWindowDefaults.assistant,
    Component: lazyNamed(() => import('./assistant/AssistantApp'), 'AssistantApp'),
  },
};
