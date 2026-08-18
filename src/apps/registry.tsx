import type { AppId } from '../core/types';
import { AssistantApp } from './assistant/AssistantApp';
import { CalendarApp } from './calendar/CalendarApp';
import { FilesApp } from './files/FilesApp';
import { MapsApp } from './maps/MapsApp';
import { NotesApp } from './notes/NotesApp';
import { TasksApp } from './tasks/TasksApp';
import type { SpatialAppDefinition } from './types';

export const apps: Record<AppId, SpatialAppDefinition> = {
  notes: { id: 'notes', title: 'Notes', icon: 'N', singleton: false, capabilities: ['storage.read', 'storage.write'], Component: NotesApp },
  tasks: { id: 'tasks', title: 'Tasks', icon: 'T', singleton: true, capabilities: ['storage.read', 'storage.write'], Component: TasksApp },
  calendar: { id: 'calendar', title: 'Calendar', icon: 'C', singleton: true, capabilities: ['calendar.read'], Component: CalendarApp },
  map: { id: 'map', title: 'Maps', icon: 'M', singleton: true, capabilities: ['map.network'], Component: MapsApp },
  files: { id: 'files', title: 'Files', icon: 'F', singleton: true, capabilities: ['files.pick', 'files.open'], Component: FilesApp },
  assistant: { id: 'assistant', title: 'AI Console', icon: 'A', singleton: true, capabilities: ['ai.tools'], Component: AssistantApp },
};
