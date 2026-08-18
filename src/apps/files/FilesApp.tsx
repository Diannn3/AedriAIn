import { useRef, useState } from 'react';
import type { FileDescriptor } from '../../core/types';

interface ListedFile extends FileDescriptor {
  browserFile?: File;
}

export function FilesApp() {
  const [files, setFiles] = useState<ListedFile[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async () => {
    setMessage(null);
    if (window.spatialDesktop) {
      setFiles(await window.spatialDesktop.pickFiles());
    } else {
      inputRef.current?.click();
    }
  };

  const open = async (file: ListedFile) => {
    setMessage(null);
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

  const visibleFiles: ListedFile[] = files.length ? files : [
    { id: 'demo-pdf', name: 'Research Notes.pdf', size: 1_420_000 },
    { id: 'demo-projects', name: 'Projects', size: 0 },
  ];

  return (
    <div className="files-panel">
      <button className="primary-action" onClick={pick}>Select files</button>
      <input
        ref={inputRef}
        hidden
        type="file"
        multiple
        onChange={(event) => setFiles(Array.from(event.target.files ?? []).map((file) => ({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          mimeType: file.type,
          browserFile: file,
        })))}
      />
      {message && <div className="inline-error">{message}</div>}
      <div className="file-list">
        {visibleFiles.map((file) => (
          <button className="file-row" key={file.id} onClick={() => open(file)} disabled={file.id.startsWith('demo-')}>
            <span>◈</span><div><b>{file.name}</b><small>{file.size ? `${Math.max(1, Math.round(file.size / 1024))} KB` : 'Demo'}</small></div>
          </button>
        ))}
      </div>
    </div>
  );
}
