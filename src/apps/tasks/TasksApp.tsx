import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../storage/db';
import { createTaskResource, toggleTaskResource } from '../../storage/resources';

export function TasksApp() {
  const tasks = useLiveQuery(() => db.tasks.orderBy('updatedAt').reverse().toArray(), [], []);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const title = draft.trim();
    if (!title) return;
    void createTaskResource(title);
    setDraft('');
  };

  return (
    <div className="task-panel">
      <div className="task-add">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add a task…" onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} />
        <button onClick={submit} aria-label="Add task">+</button>
      </div>
      <div className="task-list">
        {tasks.map((task) => {
          const done = task.status === 'done';
          return (
            <button key={task.id} className={`task-row ${done ? 'task-row--done' : ''}`} onClick={() => { void toggleTaskResource(task.id); }}>
              <span className="task-check">{done ? '✓' : ''}</span>
              <span className="task-main"><b>{task.title}</b><small>{task.dueAt ? new Date(task.dueAt).toLocaleString() : 'No due date'}</small></span>
              <span className={`priority priority--${task.priority}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
