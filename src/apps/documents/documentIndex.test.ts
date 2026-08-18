import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../../storage/db';
import { indexPdfDocument, normalizeSearchText, searchDocumentIndex } from './documentIndex';

beforeEach(async () => {
  db.close();
  await db.delete();
  await db.open();
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe('document text index', () => {
  it('normalizes Unicode and whitespace for deterministic phrase search', () => {
    expect(normalizeSearchText('  Spatial\n\tWorkspace  ')).toBe('spatial workspace');
  });

  it('persists a complete bounded-concurrency index', async () => {
    const pdf = {
      numPages: 18,
      getPage: async (pageNumber: number) => ({
        getTextContent: async () => ({ items: [{ str: `Page ${pageNumber} holographic workspace` }] }),
      }),
    } as any;
    const progress: Array<{ indexed: number; total: number; complete: boolean }> = [];

    await indexPdfDocument(pdf, 'indexed-doc', new AbortController().signal, (value) => progress.push(value), 3);

    expect(await db.documentPages.where('documentId').equals('indexed-doc').count()).toBe(18);
    expect(progress.at(-1)).toEqual({ indexed: 18, total: 18, complete: true });
  });

  it('returns page matches without re-reading the PDF', async () => {
    await db.documentPages.bulkPut([
      { documentId: 'doc', pageNumber: 1, text: 'A spatial workspace for research.', normalizedText: 'a spatial workspace for research.', indexedAt: 1 },
      { documentId: 'doc', pageNumber: 2, text: 'Workspace workspace notes.', normalizedText: 'workspace workspace notes.', indexedAt: 1 },
      { documentId: 'other', pageNumber: 1, text: 'workspace', normalizedText: 'workspace', indexedAt: 1 },
    ]);

    const results = await searchDocumentIndex('doc', 'WORKSPACE');
    expect(results.map((result) => [result.page, result.count])).toEqual([[1, 1], [2, 2]]);
  });

  it('finds phrases when PDF text spans insert whitespace inside a word', async () => {
    await db.documentPages.put({
      documentId: 'split-doc',
      pageNumber: 4,
      text: 'A holo graphic workspace for research.',
      normalizedText: 'a holo graphic workspace for research.',
      indexedAt: 1,
    });

    const results = await searchDocumentIndex('split-doc', 'holographic workspace');
    expect(results).toHaveLength(1);
    expect(results[0].page).toBe(4);
  });
});
