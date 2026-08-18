import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { DocumentRecord, FileDescriptor } from '../../core/types';
import { db } from '../../storage/db';
import {
  documentFingerprint,
  ensureDocumentResource,
  fingerprintsMatch,
  relinkDocumentResource,
  removeDocumentResource,
  touchDocumentResource,
} from '../../storage/resources';
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

const browserDescriptor = (file: File): ListedFile => ({
  id: `browser-${crypto.randomUUID()}`,
  name: file.name,
  size: file.size,
  mimeType: file.type || (file.name.toLocaleLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
  modifiedAt: file.lastModified,
  browserFile: file,
});

export function FilesApp() {
  const [files, setFiles] = useState<ListedFile[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [relinkTarget, setRelinkTarget] = useState<DocumentRecord | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const relinkInputRef = useRef<HTMLInputElement>(null);
  const spawnWindow = useDesktopStore((state) => state.spawnWindow);
  const removeWindowsForResource = useDesktopStore((state) => state.removeWindowsForResource);
  const setWindowTitle = useDesktopStore((state) => state.setWindowTitle);
  const recentDocuments = useLiveQuery(() => db.documents.orderBy('lastOpenedAt').reverse().limit(20).toArray(), [], []);

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

  const confirmDifferentSource = (document: DocumentRecord, file: FileDescriptor) => {
    const same = fingerprintsMatch(document.sourceFingerprint, documentFingerprint(file));
    return same || window.confirm(`This file differs from ${document.name}. Relink the existing document resource anyway?`);
  };

  const finishRelink = async (document: DocumentRecord, file: ListedFile) => {
    if (!isPdf(file)) throw new Error('Relink requires a PDF file.');
    if (!confirmDifferentSource(document, file)) return;
    const oldSource = { kind: document.sourceKind, id: document.sourceId };
    const sourceKind = window.spatialDesktop ? 'electron' : 'browser';
    const relinked = await relinkDocumentResource(document.id, file, sourceKind, file.id, file.browserFile);
    for (const windowModel of useDesktopStore.getState().windows.filter((item) => item.resourceId === document.id)) {
      setWindowTitle(windowModel.id, relinked.name);
    }
    if (oldSource.kind === 'electron' && window.spatialDesktop && oldSource.id !== file.id) {
      await window.spatialDesktop.revokeFile(oldSource.id).catch(() => ({ ok: false }));
    }
    setMessage(`${document.name} relinked.`);
  };

  const requestRelink = async (document: DocumentRecord) => {
    setMessage(null);
    if (window.spatialDesktop) {
      const picked = await window.spatialDesktop.pickFiles();
      const file = picked.find(isPdf);
      const unused = picked.filter((item) => item.id !== file?.id);
      await Promise.all(unused.map((item) => window.spatialDesktop!.revokeFile(item.id).catch(() => ({ ok: false }))));
      if (!file) {
        setMessage(picked.length ? 'Choose a PDF to relink this document.' : 'Relink cancelled.');
        return;
      }
      await finishRelink(document, file);
      return;
    }
    setRelinkTarget(document);
    relinkInputRef.current?.click();
  };

  const removeRecent = async (document: DocumentRecord) => {
    if (!window.confirm(`Remove ${document.name} from AedriAIn? The original file will not be deleted.`)) return;
    const removed = await removeDocumentResource(document.id);
    if (!removed) return;
    removeWindowsForResource(document.id);
    if (removed.sourceKind === 'electron' && window.spatialDesktop) {
      await window.spatialDesktop.revokeFile(removed.sourceId).catch(() => ({ ok: false }));
    }
    setMessage(`${document.name} removed from AedriAIn.`);
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
          setFiles(Array.from(event.target.files ?? []).map(browserDescriptor));
          event.currentTarget.value = '';
        }}
      />
      <input
        ref={relinkInputRef}
        hidden
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => {
          const file = event.target.files?.[0];
          const target = relinkTarget;
          event.currentTarget.value = '';
          setRelinkTarget(null);
          if (file && target) void finishRelink(target, browserDescriptor(file)).catch((error) => setMessage(error instanceof Error ? error.message : String(error)));
        }}
      />
      {message && <div className="inline-status">{message}</div>}

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
        <div className="file-list recent-document-list">
          {(recentDocuments ?? []).length === 0 ? <div className="files-empty">Opened PDFs will appear here.</div> : (recentDocuments ?? []).map((document) => (
            <div className="recent-document-row" key={document.id}>
              <button className="recent-document-main" onClick={() => void openDocumentWindow(document)}>
                <span>▤</span><div><b>{document.name}</b><small>{formatBytes(document.size)} · {document.sourceKind.toUpperCase()}</small></div>
              </button>
              <div className="recent-document-actions">
                <button onClick={() => void requestRelink(document)} title="Relink document">↺</button>
                <button onClick={() => void removeRecent(document)} title="Remove from AedriAIn">×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
