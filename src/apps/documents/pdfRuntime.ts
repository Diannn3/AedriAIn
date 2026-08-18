import {
  GlobalWorkerOptions,
  TextLayer,
  getDocument,
  type PDFDocumentLoadingTask,
  type PDFDocumentProxy,
} from 'pdfjs-dist';

const PDFJS_ROOT = '/pdfjs';

GlobalWorkerOptions.workerSrc = `${PDFJS_ROOT}/pdf.worker.min.mjs`;

export function loadPdfDocument(url: string): PDFDocumentLoadingTask {
  return getDocument({
    url,
    cMapUrl: `${PDFJS_ROOT}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_ROOT}/standard_fonts/`,
    wasmUrl: `${PDFJS_ROOT}/wasm/`,
    iccUrl: `${PDFJS_ROOT}/iccs/`,
    useWorkerFetch: true,
  });
}

export { TextLayer };
export type { PDFDocumentProxy };
