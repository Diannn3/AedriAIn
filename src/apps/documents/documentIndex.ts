import type { DocumentPageRecord } from '../../core/types';
import { db } from '../../storage/db';
import { bulkPutDocumentPageIndex, getDocumentPageIndex } from '../../storage/resources';
import type { PDFDocumentProxy } from './pdfRuntime';

export interface DocumentSearchResult {
  page: number;
  count: number;
  preview: string;
}

export interface IndexProgress {
  indexed: number;
  total: number;
  complete: boolean;
}

export function normalizeSearchText(value: string) {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function pageTextFromContent(content: any) {
  return content.items
    .map((item: any) => typeof item?.str === 'string' ? item.str : '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function indexPdfDocument(
  pdf: PDFDocumentProxy,
  documentId: string,
  signal: AbortSignal,
  onProgress?: (progress: IndexProgress) => void,
  concurrency = 3,
) {
  const existing = await getDocumentPageIndex(documentId);
  const indexedPages = new Set(existing.map((row) => row.pageNumber));
  let indexed = Math.min(indexedPages.size, pdf.numPages);
  onProgress?.({ indexed, total: pdf.numPages, complete: indexed >= pdf.numPages });
  if (indexed >= pdf.numPages) return;

  const queue = Array.from({ length: pdf.numPages }, (_, index) => index + 1).filter((page) => !indexedPages.has(page));
  let cursor = 0;
  const worker = async () => {
    const batch: DocumentPageRecord[] = [];
    const flush = async () => {
      if (!batch.length) return;
      const records = batch.splice(0, batch.length);
      await bulkPutDocumentPageIndex(records);
      indexed += records.length;
      onProgress?.({ indexed, total: pdf.numPages, complete: indexed >= pdf.numPages });
    };

    while (cursor < queue.length && !signal.aborted) {
      const pageNumber = queue[cursor++];
      const page = await pdf.getPage(pageNumber);
      if (signal.aborted) return;
      const content = await page.getTextContent();
      if (signal.aborted) return;
      const text = pageTextFromContent(content);
      batch.push({
        documentId,
        pageNumber,
        text,
        normalizedText: normalizeSearchText(text),
        indexedAt: Date.now(),
      });
      if (batch.length >= 8) await flush();
    }
    if (!signal.aborted) await flush();
  };

  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, 4)) }, () => worker()));
}

export async function searchDocumentIndex(documentId: string, rawQuery: string, limit = 80): Promise<DocumentSearchResult[]> {
  const query = normalizeSearchText(rawQuery);
  if (!query) return [];
  const rows = await db.documentPages.where('documentId').equals(documentId).sortBy('pageNumber');
  const results: DocumentSearchResult[] = [];
  for (const row of rows) {
    let count = 0;
    let cursor = 0;
    let first = -1;
    while ((cursor = row.normalizedText.indexOf(query, cursor)) !== -1) {
      if (first < 0) first = cursor;
      count += 1;
      cursor += Math.max(query.length, 1);
    }

    // PDF text is often split into spans at positions that do not correspond to
    // semantic word boundaries. Fall back to a whitespace-insensitive match so
    // a phrase is still discoverable when PDF.js yields e.g. `holo` + `graphic`.
    if (!count) {
      const compactQuery = query.replace(/\s+/g, '');
      const compactPage = row.normalizedText.replace(/\s+/g, '');
      if (compactQuery.length >= 3) {
        let compactCursor = 0;
        while ((compactCursor = compactPage.indexOf(compactQuery, compactCursor)) !== -1) {
          count += 1;
          compactCursor += compactQuery.length;
        }
      }
    }
    if (!count) continue;

    const previewAnchor = first >= 0 ? first : Math.max(0, row.normalizedText.indexOf(query.split(' ')[0] ?? ''));
    const previewStart = Math.max(0, previewAnchor - 45);
    results.push({
      page: row.pageNumber,
      count,
      preview: row.text.slice(previewStart, Math.min(row.text.length, previewAnchor + query.length + 90)),
    });
    if (results.length >= limit) break;
  }
  return results;
}
