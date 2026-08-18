import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { SpatialAppRenderProps } from '../types';
import { db } from '../../storage/db';
import { touchDocumentResource, updateDocumentViewState } from '../../storage/resources';
import { loadPdfDocument, type PDFDocumentProxy } from './pdfRuntime';
import { PdfPageView } from './PdfPageView';
import { PdfThumbnail } from './PdfThumbnail';
import { useDocumentSource } from './useDocumentSource';

interface SearchResult {
  page: number;
  count: number;
  preview: string;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function DocumentApp({ resourceId }: SpatialAppRenderProps) {
  const document = useLiveQuery(() => resourceId ? db.documents.get(resourceId) : undefined, [resourceId], null);
  const source = useDocumentSource(document);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const searchRunRef = useRef(0);

  useEffect(() => {
    if (!document) return;
    setPage(document.currentPage || 1);
    setZoom(document.zoom || 1);
    setRotation(document.rotation || 0);
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
    task.promise
      .then((loaded) => {
        if (!active) return;
        setPdf(loaded);
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
      });
    }, 250);
    return () => window.clearTimeout(id);
  }, [document?.id, page, pdf, rotation, zoom]);

  const pageNumbers = useMemo(() => pdf ? Array.from({ length: pdf.numPages }, (_, index) => index + 1) : [], [pdf]);

  const fit = async (mode: 'width' | 'page') => {
    if (!pdf) return;
    const pageProxy = await pdf.getPage(page);
    const base = pageProxy.getViewport({ scale: 1, rotation });
    const host = viewportRef.current;
    if (!host) return;
    const widthScale = Math.max(0.35, (host.clientWidth - 36) / base.width);
    if (mode === 'width') {
      setZoom(clamp(widthScale, 0.35, 3));
      return;
    }
    const heightScale = Math.max(0.35, (host.clientHeight - 36) / base.height);
    setZoom(clamp(Math.min(widthScale, heightScale), 0.35, 3));
  };

  useEffect(() => {
    searchRunRef.current += 1;
    setSearching(false);
    setResults([]);
  }, [search]);

  const runSearch = async () => {
    const query = search.trim().toLocaleLowerCase();
    if (!pdf || !query) {
      setResults([]);
      return;
    }
    const run = ++searchRunRef.current;
    setSearching(true);
    const next: SearchResult[] = [];
    try {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        if (searchRunRef.current !== run) return;
        const pageProxy = await pdf.getPage(pageNumber);
        const content = await pageProxy.getTextContent();
        const text = content.items.map((item: any) => typeof item?.str === 'string' ? item.str : '').join(' ').replace(/\s+/g, ' ').trim();
        const haystack = text.toLocaleLowerCase();
        let count = 0;
        let cursor = 0;
        while ((cursor = haystack.indexOf(query, cursor)) !== -1) {
          count += 1;
          cursor += Math.max(query.length, 1);
        }
        if (count) {
          const at = haystack.indexOf(query);
          next.push({ page: pageNumber, count, preview: text.slice(Math.max(0, at - 34), at + query.length + 64) });
          if (next.length >= 60) break;
        }
      }
      if (searchRunRef.current === run) setResults(next);
    } finally {
      if (searchRunRef.current === run) setSearching(false);
    }
  };

  const openExternally = async () => {
    if (!document) return;
    if (document.sourceKind === 'electron' && window.spatialDesktop) {
      await window.spatialDesktop.openFile(document.sourceId);
      return;
    }
    if (source.url) window.open(source.url, '_blank', 'noopener,noreferrer');
  };

  if (!resourceId) return <div className="document-empty"><b>NO DOCUMENT RESOURCE</b><span>Open a PDF from Files.</span></div>;
  if (document === null) return <div className="document-empty"><b>LOADING DOCUMENT…</b></div>;
  if (!document) return <div className="document-empty document-empty--error"><b>DOCUMENT RESOURCE MISSING</b><span>Re-open this PDF from Files to restore the resource.</span></div>;
  if (source.loading) return <div className="document-empty"><b>RESOLVING SECURE FILE…</b></div>;
  if (source.error) return <div className="document-empty document-empty--error"><b>DOCUMENT OFFLINE</b><span>{source.error}</span></div>;
  if (loadError) return <div className="document-empty document-empty--error"><b>PDF ENGINE ERROR</b><span>{loadError}</span></div>;
  if (!pdf) return <div className="document-empty"><b>LOADING PDF ENGINE…</b></div>;

  return (
    <div className="document-app">
      <div className="document-toolbar">
        <div className="document-toolbar__group">
          <button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} aria-label="Previous page">‹</button>
          <input aria-label="Current page" value={page} onChange={(event) => setPage(clamp(Number(event.target.value) || 1, 1, pdf.numPages))} />
          <span>/ {pdf.numPages}</span>
          <button onClick={() => setPage((value) => Math.min(pdf.numPages, value + 1))} disabled={page >= pdf.numPages} aria-label="Next page">›</button>
        </div>
        <div className="document-toolbar__group">
          <button onClick={() => setZoom((value) => clamp(value - 0.12, 0.35, 3))} aria-label="Zoom out">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((value) => clamp(value + 0.12, 0.35, 3))} aria-label="Zoom in">+</button>
          <button onClick={() => void fit('width')}>WIDTH</button>
          <button onClick={() => void fit('page')}>PAGE</button>
          <button onClick={() => setRotation((value) => (value + 90) % 360)} aria-label="Rotate clockwise">↻</button>
        </div>
        <div className="document-toolbar__search">
          <input aria-label="Search PDF" placeholder="Search document…" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void runSearch(); }} />
          <button onClick={() => void runSearch()} disabled={searching}>{searching ? '…' : 'FIND'}</button>
        </div>
        <button className="document-toolbar__external" onClick={() => void openExternally()}>↗</button>
      </div>

      <div className="document-body">
        <aside className="document-sidebar" aria-label="Page thumbnails">
          {pageNumbers.map((pageNumber) => (
            <PdfThumbnail key={pageNumber} pdf={pdf} pageNumber={pageNumber} active={pageNumber === page} onSelect={() => setPage(pageNumber)} />
          ))}
        </aside>
        <div ref={viewportRef} className="document-viewport">
          <PdfPageView pdf={pdf} pageNumber={page} scale={zoom} rotation={rotation} searchTerm={search} />
        </div>
        {search.trim() && (
          <aside className="document-search-results" aria-label="PDF search results">
            <header><b>SEARCH</b><span>{searching ? 'SCANNING…' : `${results.reduce((sum, result) => sum + result.count, 0)} MATCHES`}</span></header>
            <div>
              {results.length === 0 && !searching ? <small>No matches found.</small> : results.map((result) => (
                <button key={result.page} onClick={() => setPage(result.page)}>
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
