import type { SpatialAppRenderProps } from '../types';
import { useDesktopStore } from '../../store/useDesktopStore';

export function NotesApp({ resourceId }: SpatialAppRenderProps) {
  const note = useDesktopStore((state) => state.notes.find((item) => item.id === resourceId) ?? state.notes[0]);
  const updateNote = useDesktopStore((state) => state.updateNote);

  if (!note) return <div className="empty-state">No note is attached to this window.</div>;

  return (
    <div className="notes-app">
      <input
        className="note-title-input"
        value={note.title}
        onChange={(event) => updateNote(note.id, { title: event.target.value })}
        aria-label="Note title"
      />
      <textarea
        className="panel-notes"
        value={note.content}
        onChange={(event) => updateNote(note.id, { content: event.target.value })}
        aria-label="Note content"
      />
    </div>
  );
}
