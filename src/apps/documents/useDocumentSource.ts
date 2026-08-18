import { useEffect, useState } from 'react';
import type { DocumentRecord } from '../../core/types';
import { db } from '../../storage/db';

export type DocumentSourceStatus = 'loading' | 'ready' | 'needs-relink' | 'missing';

interface DocumentSourceState {
  url: string | null;
  loading: boolean;
  status: DocumentSourceStatus;
  error: string | null;
}

export function useDocumentSource(document: DocumentRecord | null | undefined): DocumentSourceState {
  const [state, setState] = useState<DocumentSourceState>({
    url: null,
    loading: document === null || Boolean(document),
    status: document === null || document ? 'loading' : 'missing',
    error: null,
  });
  const sourceKey = document === null ? '__loading__' : document?.id ?? '__missing__';

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    if (document === null) {
      setState({ url: null, loading: true, status: 'loading', error: null });
      return;
    }
    if (!document) {
      setState({ url: null, loading: false, status: 'missing', error: 'Document metadata is unavailable.' });
      return;
    }

    setState({ url: null, loading: true, status: 'loading', error: null });

    const resolve = async () => {
      if (document.sourceKind === 'electron') {
        const bridge = window.spatialDesktop;
        if (!bridge) throw new Error('This desktop document is only available inside the AedriAIn desktop app.');
        const url = bridge.fileResourceUrl(document.sourceId);
        const response = await fetch(url, { method: 'HEAD', cache: 'no-store' });
        if (!response.ok) {
          if (active) setState({
            url: null,
            loading: false,
            status: 'needs-relink',
            error: 'Desktop file permission expired. Relink the original PDF to restore this document.',
          });
          return;
        }
        if (active) setState({ url, loading: false, status: 'ready', error: null });
        return;
      }

      const stored = await db.browserBlobs.get(document.sourceId);
      if (!stored?.blob) {
        if (active) setState({
          url: null,
          loading: false,
          status: 'needs-relink',
          error: 'The browser copy is missing. Relink the original PDF to restore this document.',
        });
        return;
      }
      objectUrl = URL.createObjectURL(stored.blob);
      if (active) setState({ url: objectUrl, loading: false, status: 'ready', error: null });
    };

    resolve().catch((error) => {
      if (!active) return;
      setState({ url: null, loading: false, status: 'needs-relink', error: error instanceof Error ? error.message : String(error) });
    });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sourceKey, document?.sourceId, document?.sourceKind]);

  return state;
}
