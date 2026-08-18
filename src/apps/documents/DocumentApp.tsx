import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { DocumentRecord } from '../../core/types';
import type { SpatialAppRenderProps } from '../types';
import { db } from '../../storage/db';
import { removeDocumentResource, touchDocumentResource, updateDocumentViewState } from '../../storage/resources';
import { useDesktopStore } from '../../store/useDesktopStore';
import { useVirtualList } from '../../ui/useVirtualList';
import { indexPdfDocument, searchDocumentIndex, type DocumentSearchResult, type IndexProgress } from './documentIndex';
import { loadPdfDocument, type PDFDocumentProxy } from './pdfRuntime';
import { PdfPageView } from './PdfPageView';
import { PdfThumbnail } from './PdfThumbnail';
import { useDocumentSource } from './useDocumentSource';

interface PasswordRequest {
  reason: number;
  updatePassword: (password: string) => void;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function DocumentApp({ resourceId }: SpatialAppRenderProps) {
  const document = useLiveQuery(() => resourceId ? db.documents.get(resourceId) : undefined, [resourceId], null);
  const source = useDocumentSource(document);
  const openApp = useDesktopStore((state) => state.openApp);
  const removeWindowsForResource = useDesktopStore((state) => state.removeWindowsForResource);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [passwordRequest, setPasswordRequest] = useState<PasswordRequest | null>(null);
  const [password, setPassword] = useState('');
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('single');
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DocumentSearchResult[]>([]);
  const [activeResult, setActiveResult] = useState(-1);
  const [indexProgress, setIndexProgress] = useState<IndexProgress | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const searchRunRef = useRef(0);

  useEffect(() => {
    if (!document) return;
    setPage(document.currentPage || 1);
    setZoom(document.zoom || 1);
    setRotation(document.rotation || 0);
    setViewMode(document.viewMode ?? 'single');
    void touchDocumentResource(document.id);
  }, [document?.id]);

  useEffect(() => {
    if (!source.url) {
      setPdf(null);
      return;
    }
    let active = true;
    const task = loadPdfDocument(source.url);
    setLoadError(null);
    setPasswordRequest(null);
    setPassword('');
    task.onPassword = (updatePassword, reason) => {
      if (!active) return;
      setPasswordRequest({ reason, updatePassword });
    };
    task.promise
      .then((loaded) => {
        if (!active) return;
        setPdf(loaded);
        setPasswordRequest(null);
        setPage((value) => clamp(value, 1, loaded.numPages));
      })
      .catch((error) => {
        if (active) setLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      active = false;
      void task.destroy();
    };
  }, [source.url]);

  useEffect(() => {
    if (!document || !pdf) return;
    const id = window.setTimeout(() => {
      void updateDocumentViewState(document.id, {
        currentPage: clamp(page, 1, pdf.numPages),
        zoom,
        rotation,
        viewMode,
      });
    }, 250);
    return () => window.clearTimeout(id);
  }, [document?.id, page, pdf, rotation, viewMode, zoom]);

  useEffect(() => {
    if (!pdf || !document) return;
    const controller = new AbortController();
    setIndexProgress(null);
    void indexPdfDocument(pdf, document.id, controller.signal, setIndexProgress).catch((error) => {
      if (!controller.signal.aborted) console.warn('Document indexing failed', error);
    });
    return () => controller.abort();
  }, [document?.id, pdf]);

  const estimatePageSize = useCallback(() => Math.max(360, 900 * zoom + 30), [zoom]);
  const continuous = useVirtualList({ count: pdf?.numPages ?? 0, scrollRef: viewportRef, estimateSize: estimatePageSize, overscan: 2, resetKey: `${zoom}:${rotation}` });
  const thumbnails = useVirtualList({ count: pdf?.numPages ?? 0, scrollRef: sidebarRef, estimateSize: () => 112, overscan: 4 });

  useEffect(() => {
    if (!pdf) return;
    thumbnails.scrollToIndex(clamp(page, 1, pdf.numPages) - 1, 'center');
  }, [page, pdf, thumbnails.scrollToIndex]);

  useEffect(() => {
    if (viewMode !== 'continuous' || !pdf || !continuous.virtualItems.length) return;
    const marker = continuous.scrollOffset + continuous.viewportSize * 0.32;
    let best = continuous.virtualItems[0];
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const item of continuous.virtualItems) {
      const distance = Math.abs(item.start + item.size / 2 - marker);
      if (distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
    const visiblePage = best.index + 1;
    if (visiblePage !== page) setPage(visiblePage);
  }, [continuous.scrollOffset, continuous.viewportSize, continuous.virtualItems, page, pdf, viewMode]);

  useEffect(() => {
    if (viewMode !== 'continuous' || !pdf) return;
    const id = window.requestAnimationFrame(() => continuous.scrollToIndex(clamp(page, 1, pdf.numPages) - 1, 'start'));
    return () => window.cancelAnimationFrame(id);
  // Only synchronize when mode/document changes. Page changes during scrolling must not fight the user.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, pdf, document?.id]);

  const goToPage = (nextPage: number) => {
    if (!pdf) return;
    const safe = clamp(nextPage, 1, pdf.numPages);
    setPage(safe);
    if (viewMode === 'continuous') window.requestAnimationFrame(() => continuous.scrollToIndex(safe - 1, 'start'));
  };

  const fit = async (mode: 'width' | 'page') => {
    if (!pdf) return;
    const pageProxy = await pdf.getPage(page);
    const base = pageProxy.getViewport({ scale: 1, rotation });
    const host = viewportRef.current;
    if (!host) return;
    const widthScale = Math.max(0.35, (host.clientWidth - 44) / base.width);
    if (mode === 'width' || viewMode === 'continuous') {
      setZoom(clamp(widthScale, 0.35, 3));
      return;
    }
    const heightScale = Math.max(0.35, (host.clientHeight - 44) / base.height);
    setZoom(clamp(Math.min(widthScale, heightScale), 0.35, 3));
  };

  useEffect(() => {
    searchRunRef.current += 1;
    setSearching(false);
    setResults([]);
    setActiveResult(-1);
  }, [search]);

  const runSearch = async () => {
    const query = search.trim();
    if (!document || !query) {
      setResults([]);
      return;
    }
    const run = ++searchRunRef.current;
    setSearching(true);
    try {
      const next = await searchDocumentIndex(document.id, query);
      if (searchRunRef.current !== run) return;
      setResults(next);
      setActiveResult(next.length ? 0 : -1);
      if (next.length) goToPage(next[0].page);
    } finally {
      if (searchRunRef.current === run) setSearching(false);
    }
  };

  const jumpResult = (index: number) => {
    if (!results.length) return;
    const safe = (index + results.length) % results.length;
    setActiveResult(safe);
    goToPage(results[safe].page);
  };

  const openExternally = async () => {
    if (!document) return;
    if (document.sourceKind === 'electron' && window.spatialDesktop) {
      await window.spatialDesktop.openFile(document.sourceId);
      return;
    }
    if (source.url) window.open(source.url, '_blank', 'noopener,noreferrer');
  };

  const removeDocument = async (target: DocumentRecord) => {
    if (!window.confirm(`Remove ${target.name} from AedriAIn? The original file will not be deleted.`)) return;
    const removed = await removeDocumentResource(target.id);
    if (!removed) return;
    removeWindowsForResource(target.id);
    if (removed.sourceKind === 'electron' && window.spatialDesktop) {
      await window.spatialDesktop.revokeFile(removed.sourceId).catch(() => ({ ok: false }));
    }
  };

  const openRelink = () => openApp('files');

  if (!resourceId) return <div className="document-empty"><b>NO DOCUMENT RESOURCE</b><span>Open a PDF from Files.</span></div>;
  if (document === null) return <div className="document-empty"><b>LOADING DOCUMENT…</b></div>;
  if (!document) return <div className="document-empty document-empty--error"><b>DOCUMENT RESOURCE MISSING</b><span>This resource was removed. Open Files to choose a PDF.</span><button onClick={() => openApp('files')}>OPEN FILES</button></div>;
  if (source.loading) return <div className="document-empty"><b>RESOLVING SECURE FILE…</b></div>;
  if (source.status === 'needs-relink') return <div className="document-empty document-empty--error"><b>SOURCE NEEDS RELINK</b><span>{source.error}</span><div className="document-empty__actions"><button onClick={openRelink}>OPEN FILES TO RELINK</button><button onClick={() => void removeDocument(document)}>REMOVE</button></div></div>;
  if (source.error) return <div className="document-empty document-empty--error"><b>DOCUMENT OFFLINE</b><span>{source.error}</span></div>;
  if (passwordRequest) return <div className="document-empty document-password"><b>PASSWORD REQUIRED</b><span>{passwordRequest.reason === 2 ? 'That password was incorrect. Try again.' : 'This PDF is password protected.'}</span><form onSubmit={(event) => { event.preventDefault(); if (!password) return; passwordRequest.updatePassword(password); setPassword(''); }}><input autoFocus type="password" value={password} onChange={(event) => setPassword(event.target.value)} aria-label="PDF password" /><button type="submit">UNLOCK</button></form></div>;
  if (loadError) return <div className="document-empty document-empty--error"><b>PDF COULD NOT BE READ</b><span>{loadError}</span><div className="document-empty__actions"><button onClick={() => void openExternally()}>OPEN EXTERNALLY</button><button onClick={() => void removeDocument(document)}>REMOVE</button></div></div>;
  if (!pdf) return <div className="document-empty"><b>LOADING PDF ENGINE…</b></div>;

  return (
    <div className="document-app">
      <div className="document-toolbar">
        <div className="document-toolbar__group">
          <button onClick={() => goToPage(page - 1)} disabled={page <= 1} aria-label="Previous page">‹</button>
          <input aria-label="Current page" value={page} onChange={(event) => goToPage(Number(event.target.value) || 1)} />
          <span>/ {pdf.numPages}</span>
          <button onClick={() => goToPage(page + 1)} disabled={page >= pdf.numPages} aria-label="Next page">›</button>
        </div>
        <div className="document-toolbar__group">
          <button onClick={() => setZoom((value) => clamp(value - 0.12, 0.35, 3))} aria-label="Zoom out">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => clamp(value + 0.12, 0.35, 3))} aria-label="Zoom in">+</button>
          <button onClick={() => void fit('width')}>WIDTH</button>
          <button onClick={() => void fit('page')}>PAGE</button>
          <button onClick={() => setRotation((value) => (value + 90) % 360)} aria-label="Rotate clockwise">↻</button>
        </div>
        <div className="document-toolbar__group document-toolbar__mode">
          <button className={viewMode === 'single' ? 'is-active' : ''} onClick={() => setViewMode('single')}>SINGLE</button>
          <button className={viewMode === 'continuous' ? 'is-active' : ''} onClick={() => setViewMode('continuous')}>SCROLL</button>
        </div>
        <div className="document-toolbar__search">
          <input aria-label="Search PDF" placeholder="Search indexed document…" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void runSearch(); }} />
          <button onClick={() => void runSearch()} disabled={searching}>{searching ? '…' : 'FIND'}</button>
        </div>
        <button className="document-toolbar__external" onClick={() => void openExternally()}>↗</button>
      </div>

      <div className="document-index-status" aria-live="polite">
        {indexProgress ? (indexProgress.complete ? `INDEX READY · ${indexProgress.total} PAGES` : `INDEXING · ${indexProgress.indexed}/${indexProgress.total}`) : 'INDEX STARTING…'}
      </div>

      <div className="document-body">
        <aside ref={sidebarRef} className="document-sidebar" aria-label="Page thumbnails">
          <div className="virtual-list-space" style={{ height: thumbnails.totalSize }}>
            {thumbnails.virtualItems.map((item) => {
              const pageNumber = item.index + 1;
              return <div key={item.key} className="virtual-list-row virtual-thumbnail-row" style={{ transform: `translateY(${item.start}px)` }}>
                <PdfThumbnail pdf={pdf} pageNumber={pageNumber} active={pageNumber === page} onSelect={() => goToPage(pageNumber)} />
              </div>;
            })}
          </div>
        </aside>
        <div ref={viewportRef} className={viewMode === 'continuous' ? 'document-viewport document-viewport--continuous' : 'document-viewport'}>
          {viewMode === 'single' ? (
            <PdfPageView pdf={pdf} pageNumber={page} scale={zoom} rotation={rotation} searchTerm={search} />
          ) : (
            <div className="virtual-document-space" style={{ height: continuous.totalSize }}>
              {continuous.virtualItems.map((item) => {
                const pageNumber = item.index + 1;
                return <div
                  key={item.key}
                  ref={(node) => continuous.measureElement(item.index, node)}
                  data-virtual-index={item.index}
                  className="virtual-document-row"
                  style={{ transform: `translateY(${item.start}px)` }}
                >
                  <PdfPageView pdf={pdf} pageNumber={pageNumber} scale={zoom} rotation={rotation} searchTerm={search} />
                  <small>PAGE {pageNumber}</small>
                </div>;
              })}
            </div>
          )}
        </div>
        {search.trim() && (
          <aside className="document-search-results" aria-label="PDF search results">
            <header><b>SEARCH</b><span>{searching ? 'SEARCHING…' : `${results.reduce((sum, result) => sum + result.count, 0)} MATCHES`}</span></header>
            {results.length > 0 && <div className="document-search-nav"><button onClick={() => jumpResult(activeResult - 1)}>‹</button><span>{activeResult + 1}/{results.length}</span><button onClick={() => jumpResult(activeResult + 1)}>›</button></div>}
            <div>
              {results.length === 0 && !searching ? <small>{indexProgress?.complete ? 'No matches found.' : 'Indexing is still in progress. Search currently covers indexed pages.'}</small> : results.map((result, index) => (
                <button className={index === activeResult ? 'is-active' : ''} key={result.page} onClick={() => jumpResult(index)}>
                  <b>P{result.page} · {result.count}</b>
                  <span>{result.preview}</span>
                </button>
              ))}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
