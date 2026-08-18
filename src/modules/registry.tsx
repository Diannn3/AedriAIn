import { useRef, useState, type ReactNode } from 'react';
import type { AppId } from '../core/types';
import { useDesktopStore } from '../store/useDesktopStore';

export type AppCapability = 'local-storage' | 'file-picker' | 'map-data' | 'ai-tools';

export interface SpatialAppDefinition {
  id: AppId;
  title: string;
  icon: string;
  capabilities: AppCapability[];
  render: () => ReactNode;
}

function NotesPanel() {
  const notes = useDesktopStore((s) => s.notes);
  const setNotes = useDesktopStore((s) => s.setNotes);
  return <textarea className="panel-notes" value={notes} onChange={(event) => setNotes(event.target.value)} aria-label="Notes" />;
}

function TasksPanel() {
  const tasks = useDesktopStore((s) => s.tasks);
  const toggleTask = useDesktopStore((s) => s.toggleTask);
  const addTask = useDesktopStore((s) => s.addTask);
  const [draft, setDraft] = useState('');
  return (
    <div className="task-panel">
      <div className="task-add">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a task…" onKeyDown={(e) => {
          if (e.key === 'Enter' && draft.trim()) { addTask(draft.trim()); setDraft(''); }
        }} />
        <button onClick={() => { if (draft.trim()) { addTask(draft.trim()); setDraft(''); } }}>+</button>
      </div>
      <div className="task-list">
        {tasks.map((task) => (
          <button key={task.id} className={`task-row ${task.done ? 'task-row--done' : ''}`} onClick={() => toggleTask(task.id)}>
            <span className="task-check">{task.done ? '✓' : ''}</span>
            <span className="task-main"><b>{task.title}</b><small>{task.dueLabel}</small></span>
            <span className={`priority priority--${task.priority}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function CalendarPanel() {
  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  return (
    <div className="calendar-mini">
      <div className="calendar-head"><b>AUGUST</b><span>2026</span></div>
      <div className="calendar-grid">
        {days.map((day, i) => <div key={day} className="calendar-day"><small>{day}</small><strong>{17 + i}</strong>{i === 1 && <span className="calendar-event">MATH</span>}{i === 3 && <span className="calendar-event calendar-event--alt">ORG</span>}</div>)}
      </div>
    </div>
  );
}

function MapPanel() {
  return (
    <div className="campus-map" aria-label="UPLB campus map prototype">
      <div className="map-road map-road--a" /><div className="map-road map-road--b" />
      <span className="map-node map-node--1">SU</span><span className="map-node map-node--2">IMS</span><span className="map-node map-node--3">LIB</span><span className="map-node map-node--4">FREEDOM</span>
      <div className="map-route" />
      <small>Prototype layer · MapLibre/PMTiles integration next</small>
    </div>
  );
}

function FilesPanel() {
  const [files, setFiles] = useState<Array<{ name: string; path: string; size: number }>>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async () => {
    if (window.spatialDesktop) {
      const selected = await window.spatialDesktop.pickFiles();
      setFiles(selected);
    } else {
      inputRef.current?.click();
    }
  };

  return (
    <div className="files-panel">
      <button className="primary-action" onClick={pick}>Select files</button>
      <input ref={inputRef} hidden type="file" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []).map((file) => ({ name: file.name, path: file.name, size: file.size })))} />
      <div className="file-list">
        {(files.length ? files : [{ name: 'Course Notes.pdf', path: 'Demo', size: 1420000 }, { name: 'UPLB Projects', path: 'Demo folder', size: 0 }]).map((file) => (
          <div className="file-row" key={`${file.path}-${file.name}`}><span>◈</span><div><b>{file.name}</b><small>{file.path}</small></div></div>
        ))}
      </div>
    </div>
  );
}

function AssistantPanel() {
  return (
    <div className="assistant-panel">
      <div className="assistant-status"><span />Command bus online</div>
      <p>This MVP uses a deterministic command parser first. The next layer can swap in an LLM that emits the same typed commands.</p>
      <code>open map</code><code>study mode</code><code>close notes</code><code>reset workspace</code>
    </div>
  );
}

export const apps: Record<AppId, SpatialAppDefinition> = {
  notes: { id: 'notes', title: 'Notes', icon: 'N', capabilities: ['local-storage'], render: () => <NotesPanel /> },
  tasks: { id: 'tasks', title: 'Tasks', icon: 'T', capabilities: ['local-storage'], render: () => <TasksPanel /> },
  calendar: { id: 'calendar', title: 'Calendar', icon: 'C', capabilities: ['local-storage'], render: () => <CalendarPanel /> },
  map: { id: 'map', title: 'UPLB Map', icon: 'M', capabilities: ['map-data'], render: () => <MapPanel /> },
  files: { id: 'files', title: 'Files', icon: 'F', capabilities: ['file-picker'], render: () => <FilesPanel /> },
  assistant: { id: 'assistant', title: 'AI Console', icon: 'A', capabilities: ['ai-tools'], render: () => <AssistantPanel /> },
};
