import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from './pdfRuntime';

export function PdfThumbnail({ pdf, pageNumber, active, onSelect }: {
  pdf: PDFDocumentProxy;
  pageNumber: number;
  active: boolean;
  onSelect: () => void;
}) {
  const hostRef = useRef<HTMLButtonElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 4);

  useEffect(() => {
    const node = hostRef.current;
    if (!node || visible) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '240px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let activeRender = true;
    let renderTask: any = null;

    (async () => {
      const page = await pdf.getPage(pageNumber);
      if (!activeRender) return;
      const natural = page.getViewport({ scale: 1 });
      const scale = Math.min(0.28, 92 / natural.width);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas?.getContext('2d', { alpha: false });
      if (!canvas || !context) return;
      const outputScale = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
      canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      renderTask = page.render({
        canvasContext: context,
        viewport,
        transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
      });
      await renderTask?.promise;
    })().catch(() => {});

    return () => {
      activeRender = false;
      try { renderTask?.cancel(); } catch { /* complete */ }
    };
  }, [pageNumber, pdf, visible]);

  return (
    <button ref={hostRef} className={active ? 'pdf-thumbnail pdf-thumbnail--active' : 'pdf-thumbnail'} onClick={onSelect}>
      <div className="pdf-thumbnail__preview">{visible ? <canvas ref={canvasRef} /> : <span>···</span>}</div>
      <small>{pageNumber}</small>
    </button>
  );
}
