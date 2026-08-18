import path from 'node:path';
import { expect, test } from '@playwright/test';

test('captures a Documents V1.1 browser performance snapshot', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Files' }).click();
  const filesWindow = page.locator('[data-window-id="files-main"]');
  await filesWindow.locator('input[type="file"]').first().setInputFiles(path.resolve('tests/fixtures/aedriain-many-pages.pdf'));
  await filesWindow.getByRole('button', { name: /aedriain-many-pages\.pdf/i }).click();
  const documentWindow = page.locator('[data-window-id^="document-"]').last();
  await expect(documentWindow.getByLabel('Search PDF')).toBeVisible({ timeout: 20_000 });
  await documentWindow.getByRole('button', { name: 'SCROLL' }).click();
  await expect(documentWindow.locator('.virtual-document-row').first()).toBeVisible();
  await page.waitForTimeout(1200);

  const snapshot = await page.evaluate(() => {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    return {
      capturedAt: new Date().toISOString(),
      domNodes: document.getElementsByTagName('*').length,
      mountedVirtualPages: document.querySelectorAll('.virtual-document-row').length,
      mountedThumbnails: document.querySelectorAll('.virtual-thumbnail-row').length,
      usedJSHeapSize: memory?.usedJSHeapSize ?? null,
      totalJSHeapSize: memory?.totalJSHeapSize ?? null,
      statusHud: document.querySelector('.status-hud')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    };
  });

  console.log('AEDRIAIN_PERFORMANCE_BASELINE', JSON.stringify(snapshot));
  await testInfo.attach('documents-performance-baseline.json', {
    body: Buffer.from(JSON.stringify(snapshot, null, 2)),
    contentType: 'application/json',
  });
  expect(snapshot.mountedVirtualPages).toBeGreaterThan(0);
  expect(snapshot.mountedVirtualPages).toBeLessThan(20);
});
