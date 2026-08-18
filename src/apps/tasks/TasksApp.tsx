import { useState } from 'react';
import { useDesktopStore } from '../../store/useDesktopStore';

export function TasksApp() {
  const tasks = useDesktopStore((state) => state.tasks);
  const toggleTask = useDesktopStore((state) => state.toggleTask);
  const addTask = useDesktopStore((state) => state.addTask);
  const [draft, setDraft] = useState('');

  const submit = () => {
    if (!draft.trim()) return;
    addTask(draft.trim());
    setDraft('');
  };

  return (
    <div className="task-panel">
      <div className="task-add">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Add a task…" onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} />
        <button onClick={submit}>+</button>
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
