import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { SpatialAppRenderProps } from '../types';
import { db } from '../../storage/db';
import { updateNoteResource } from '../../storage/resources';
import { useDesktopStore } from '../../store/useDesktopStore';

export function NotesApp({ windowId, resourceId }: SpatialAppRenderProps) {
  const note = useLiveQuery(() => resourceId ? db.notes.get(resourceId) : undefined, [resourceId], null);
  const setWindowTitle = useDesktopStore((state) => state.setWindowTitle);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (!note) return;
    setTitle(note.title);
    setContent(note.content);
  }, [note?.id, note?.title, note?.content]);

  useEffect(() => {
    if (!note || title === note.title) return;
    const timer = window.setTimeout(() => {
      void updateNoteResource(note.id, { title });
      setWindowTitle(windowId, title || 'Untitled note');
    }, 180);
    return () => window.clearTimeout(timer);
  }, [note, title, setWindowTitle, windowId]);

  useEffect(() => {
    if (!note || content === note.content) return;
    const timer = window.setTimeout(() => { void updateNoteResource(note.id, { content }); }, 220);
    return () => window.clearTimeout(timer);
  }, [note, content]);

  if (note === null) return <div className="empty-state">Loading note…</div>;
  if (!note) return <div className="empty-state">No note is attached to this window.</div>;

  return (
    <div className="notes-app">
      <input
        className="note-title-input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        aria-label="Note title"
      />
      <textarea
        className="panel-notes"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        aria-label="Note content"
      />
    </div>
  );
}
