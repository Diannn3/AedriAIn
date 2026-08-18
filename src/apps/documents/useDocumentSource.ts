import { useEffect, useState } from 'react';
import type { DocumentRecord } from '../../core/types';
import { db } from '../../storage/db';

interface DocumentSourceState {
  url: string | null;
  loading: boolean;
  error: string | null;
}

export function useDocumentSource(document: DocumentRecord | null | undefined): DocumentSourceState {
  const [state, setState] = useState<DocumentSourceState>({ url: null, loading: document === null || Boolean(document), error: null });
  const sourceKey = document === null ? '__loading__' : document?.id ?? '__missing__';

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    if (document === null) {
      setState({ url: null, loading: true, error: null });
      return;
    }
    if (!document) {
      setState({ url: null, loading: false, error: 'Document metadata is unavailable.' });
      return;
    }

    setState({ url: null, loading: true, error: null });

    const resolve = async () => {
      if (document.sourceKind === 'electron') {
        const bridge = window.spatialDesktop;
        if (!bridge) throw new Error('This desktop document is only available inside the AedriAIn desktop app.');
        const url = bridge.fileResourceUrl(document.sourceId);
        const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        if (!response.ok) {
          throw new Error('The desktop file permission expired. Re-select this file from Files to restore access.');
        }
        if (active) setState({ url, loading: false, error: null });
        return;
      }

      const stored = await db.browserBlobs.get(document.sourceId);
      if (!stored?.blob) throw new Error('The browser copy of this document is no longer available. Re-select the PDF from Files.');
      objectUrl = URL.createObjectURL(stored.blob);
      if (active) setState({ url: objectUrl, loading: false, error: null });
    };

    resolve().catch((error) => {
      if (!active) return;
      setState({ url: null, loading: false, error: error instanceof Error ? error.message : String(error) });
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceKey, document?.sourceId, document?.sourceKind]);

  return state;
}
