import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from './pdfRuntime';
import { TextLayer } from './pdfRuntime';

interface PdfPageViewProps {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  rotation: number;
  searchTerm?: string;
}

export function PdfPageView({ pdf, pageNumber, scale, rotation, searchTerm = '' }: PdfPageViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [textLayerVersion, setTextLayerVersion] = useState(0);

  useEffect(() => {
    let active = true;
    let renderTask: any = null;
    let textLayer: any = null;

    const render = async () => {
      setError(null);
      const page = await pdf.getPage(pageNumber);
      if (!active) return;
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      const layer = textLayerRef.current;
      if (!canvas || !layer) return;

      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Canvas rendering is unavailable.');
      const outputScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
      canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      layer.style.width = `${Math.floor(viewport.width)}px`;
      layer.style.height = `${Math.floor(viewport.height)}px`;
      layer.replaceChildren();

      const transform = outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0];
      renderTask = page.render({ canvasContext: context, viewport, transform });
      await renderTask?.promise;
      if (!active) return;

      const textContent = page.streamTextContent({ includeMarkedContent: true });
      if (!active) return;
      const layerTask = new TextLayer({ textContentSource: textContent, container: layer, viewport });
      textLayer = layerTask;
      await layerTask.render();
      if (active) setTextLayerVersion((value) => value + 1);
    };

    render().catch((reason) => {
      if (!active || reason?.name === 'RenderingCancelledException') return;
      setError(reason instanceof Error ? reason.message : String(reason));
    });

    return () => {
      active = false;
      try { renderTask?.cancel(); } catch { /* Already completed. */ }
      try { textLayer?.cancel?.(); } catch { /* Already completed. */ }
    };
  }, [pageNumber, pdf, rotation, scale]);

  useEffect(() => {
    const layer = textLayerRef.current;
    if (!layer) return;
    layer.querySelectorAll('.pdf-search-hit').forEach((span) => span.classList.remove('pdf-search-hit'));
    const query = searchTerm.trim().toLocaleLowerCase();
    if (!query) return;
    layer.querySelectorAll('span').forEach((span) => {
      if ((span.textContent ?? '').toLocaleLowerCase().includes(query)) span.classList.add('pdf-search-hit');
    });
  }, [searchTerm, textLayerVersion]);

  if (error) return <div className="pdf-page-error">PAGE {pageNumber} FAILED · {error}</div>;

  return (
    <div className="pdf-page-shell" aria-label={`PDF page ${pageNumber}`}>
      <canvas ref={canvasRef} className="pdf-page-canvas" />
      <div ref={textLayerRef} className="pdf-text-layer textLayer" />
    </div>
  );
}
