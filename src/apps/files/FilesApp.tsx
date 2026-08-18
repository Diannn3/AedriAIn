import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { DocumentRecord, FileDescriptor } from '../../core/types';
import { db } from '../../storage/db';
import { ensureDocumentResource, touchDocumentResource } from '../../storage/resources';
import { useDesktopStore } from '../../store/useDesktopStore';

interface ListedFile extends FileDescriptor {
  browserFile?: File;
}

const isPdf = (file: Pick<FileDescriptor, 'name' | 'mimeType'>) =>
  file.mimeType === 'application/pdf' || file.name.toLocaleLowerCase().endsWith('.pdf');

const formatBytes = (bytes: number) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
};

export function FilesApp() {
  const [files, setFiles] = useState<ListedFile[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const spawnWindow = useDesktopStore((state) => state.spawnWindow);
  const recentDocuments = useLiveQuery(() => db.documents.orderBy('lastOpenedAt').reverse().limit(12).toArray(), [], []);

  const pick = async () => {
    setMessage(null);
    if (window.spatialDesktop) {
      try {
        setFiles(await window.spatialDesktop.pickFiles());
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'File selection failed.');
      }
    } else {
      inputRef.current?.click();
    }
  };

  const openDocumentWindow = async (document: DocumentRecord) => {
    await touchDocumentResource(document.id);
    spawnWindow('document', document.name, document.id);
  };

  const open = async (file: ListedFile) => {
    setMessage(null);
    if (isPdf(file)) {
      try {
        const sourceKind = window.spatialDesktop ? 'electron' : 'browser';
        const document = await ensureDocumentResource(file, sourceKind, file.id, file.browserFile);
        await openDocumentWindow(document);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not create a document resource.');
      }
      return;
    }

    if (window.spatialDesktop) {
      const result = await window.spatialDesktop.openFile(file.id);
      if (!result.ok) setMessage(result.error ?? 'Could not open file.');
      return;
    }
    if (file.browserFile) {
      const url = URL.createObjectURL(file.browserFile);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }
  };

  return (
    <div className="files-panel files-panel--v2">
      <div className="files-actions">
        <button className="primary-action" onClick={pick}>SELECT FILES</button>
        <span>PDF opens inside AedriAIn. Other formats use the system viewer for now.</span>
      </div>
      <input
        ref={inputRef}
        hidden
        type="file"
        multiple
        onChange={(event) => {
          setFiles(Array.from(event.target.files ?? []).map((file) => ({
            id: `browser-${crypto.randomUUID()}`,
            name: file.name,
            size: file.size,
            mimeType: file.type || (file.name.toLocaleLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
            browserFile: file,
          })));
          event.currentTarget.value = '';
        }}
      />
      {message && <div className="inline-error">{message}</div>}

      <div className="files-section">
        <header><b>SELECTED</b><span>{files.length}</span></header>
        <div className="file-list">
          {files.length === 0 ? <div className="files-empty">Choose PDFs or other files from this device.</div> : files.map((file) => (
            <button className="file-row" key={file.id} onClick={() => void open(file)}>
              <span>{isPdf(file) ? '▤' : '◈'}</span>
              <div><b>{file.name}</b><small>{isPdf(file) ? `PDF · ${formatBytes(file.size)} · OPEN SPATIALLY` : `${formatBytes(file.size)} · EXTERNAL`}</small></div>
            </button>
          ))}
        </div>
      </div>

      <div className="files-section files-section--recent">
        <header><b>RECENT DOCUMENTS</b><span>{recentDocuments?.length ?? 0}</span></header>
        <div className="file-list">
          {(recentDocuments ?? []).length === 0 ? <div className="files-empty">Opened PDFs will appear here.</div> : (recentDocuments ?? []).map((document) => (
            <button className="file-row" key={document.id} onClick={() => void openDocumentWindow(document)}>
              <span>▤</span><div><b>{document.name}</b><small>{formatBytes(document.size)} · {document.sourceKind.toUpperCase()}</small></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
