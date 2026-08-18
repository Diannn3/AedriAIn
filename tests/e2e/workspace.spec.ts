import path from 'node:path';
import { expect, test } from '@playwright/test';

test('boots the AedriAIn workspace and opens apps', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('AEDRIAIN')).toBeVisible();
  await expect(page.getByText('SPATIAL DESKTOP · DOCUMENTS V1.1')).toBeVisible();

  await page.getByRole('button', { name: 'Files' }).click();
  await expect(page.locator('[data-window-id="files-main"]')).toBeVisible();
});

test('can spawn an independent note window through the command bus', async ({ page }) => {
  await page.goto('/');
  const command = page.getByLabel('Workspace command');
  await command.fill('new notes');
  await command.press('Enter');
  await expect(page.locator('[data-window-id^="notes-"]')).toHaveCount(2);
});

test('persists note resources across reloads', async ({ page }) => {
  await page.goto('/');
  const firstNote = page.locator('[data-window-id="notes-main"]');
  const title = firstNote.getByLabel('Note title');
  await title.fill('Persistent research note');
  await expect(title).toHaveValue('Persistent research note');
  await page.waitForTimeout(450);
  await page.reload();
  await expect(page.locator('[data-window-id="notes-main"]').getByLabel('Note title')).toHaveValue('Persistent research note');
});

test('opens two selected PDFs as independent persistent spatial document windows', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Files' }).click();
  const filesWindow = page.locator('[data-window-id="files-main"]');
  const input = filesWindow.locator('input[type="file"]');
  await input.setInputFiles([
    path.resolve('tests/fixtures/aedriain-sample.pdf'),
    path.resolve('tests/fixtures/aedriain-sample-2.pdf'),
  ]);

  await filesWindow.getByRole('button', { name: /aedriain-sample\.pdf/i }).click();
  await filesWindow.getByRole('button', { name: /aedriain-sample-2\.pdf/i }).click({ force: true });

  const documentWindows = page.locator('[data-window-id^="document-"]');
  await expect(documentWindows).toHaveCount(2);
  await expect(documentWindows.nth(0).getByLabel('Search PDF')).toBeVisible({ timeout: 20_000 });
  await expect(documentWindows.nth(1).getByLabel('Search PDF')).toBeVisible({ timeout: 20_000 });

  await expect(documentWindows.nth(0).getByText(/INDEX READY/)).toBeVisible({ timeout: 20_000 });
  const search = documentWindows.nth(0).getByLabel('Search PDF');
  await search.fill('holographic workspace');
  await search.press('Enter');
  await expect(documentWindows.nth(0).getByText(/P2 · 1/)).toBeVisible({ timeout: 20_000 });

  await page.reload();
  await expect(page.locator('[data-window-id^="document-"]')).toHaveCount(2);
  await expect(page.locator('[data-window-id^="document-"]').nth(0).getByLabel('Search PDF')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-window-id^="document-"]').nth(1).getByLabel('Search PDF')).toBeVisible({ timeout: 20_000 });
});

test('research workspace guides file selection before a document exists', async ({ page }) => {
  await page.goto('/');
  const command = page.getByLabel('Workspace command');
  await command.fill('research mode');
  await command.press('Enter');
  await expect(page.getByText('research workspace applied.', { exact: false })).toBeVisible();
  await expect(page.locator('[data-window-id="files-main"]')).toBeVisible();
});

test('research workspace arranges a document with Notes and Tasks', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Files' }).click();
  const filesWindow = page.locator('[data-window-id="files-main"]');
  await filesWindow.locator('input[type="file"]').setInputFiles(path.resolve('tests/fixtures/aedriain-sample.pdf'));
  await filesWindow.getByRole('button', { name: /aedriain-sample\.pdf/i }).click();
  await expect(page.locator('[data-window-id^="document-"]').last().getByLabel('Search PDF')).toBeVisible({ timeout: 20_000 });

  const command = page.getByLabel('Workspace command');
  await command.fill('research mode');
  await command.press('Enter');

  await expect(page.locator('[data-window-id^="document-"]:visible')).toHaveCount(1);
  await expect(page.locator('[data-window-id="notes-main"]')).toBeVisible();
  await expect(page.locator('[data-window-id="tasks-main"]')).toBeVisible();
  await expect(page.locator('[data-window-id="files-main"]')).toBeHidden();
});

test('window layout resize changes geometry without changing hologram scale controls', async ({ page }) => {
  await page.goto('/');
  const notes = page.locator('[data-window-id="notes-main"]');
  const handle = notes.getByRole('button', { name: 'Resize window' });
  const before = await notes.evaluate((element) => ({ width: parseFloat((element as HTMLElement).style.width), height: parseFloat((element as HTMLElement).style.height) }));
  const box = await handle.boundingBox();
  if (!box) throw new Error('Resize handle was not measurable.');

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 55, box.y + box.height / 2 + 35, { steps: 6 });
  await page.mouse.up();

  await expect.poll(async () => notes.evaluate((element) => parseFloat((element as HTMLElement).style.width))).toBeGreaterThan(before.width);
  const afterHeight = await notes.evaluate((element) => parseFloat((element as HTMLElement).style.height));
  expect(afterHeight).toBeGreaterThan(before.height);
});


test('Settings persists UI scale and opens as a singleton app', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const settings = page.locator('[data-window-id="settings-main"]');
  await expect(settings).toBeVisible();
  const scale = settings.getByLabel('UI text scale');
  await scale.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = '1.15';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(async () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim())).toBe('1.15');
  await page.reload();
  await expect(page.locator('[data-window-id="settings-main"]').getByLabel('UI text scale')).toHaveValue('1.15');
});

test('continuous reading virtualizes a long PDF instead of mounting every page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Files' }).click();
  const filesWindow = page.locator('[data-window-id="files-main"]');
  await filesWindow.locator('input[type="file"]').first().setInputFiles(path.resolve('tests/fixtures/aedriain-many-pages.pdf'));
  await filesWindow.getByRole('button', { name: /aedriain-many-pages\.pdf/i }).click();
  const documentWindow = page.locator('[data-window-id^="document-"]').last();
  await expect(documentWindow.getByLabel('Search PDF')).toBeVisible({ timeout: 20_000 });
  await documentWindow.getByRole('button', { name: 'SCROLL' }).click();
  await expect(documentWindow.locator('.virtual-document-row').first()).toBeVisible();
  const mounted = await documentWindow.locator('.virtual-document-row').count();
  expect(mounted).toBeGreaterThan(0);
  expect(mounted).toBeLessThan(20);
  await documentWindow.getByLabel('Current page').fill('65');
  await expect.poll(async () => Number(await documentWindow.getByLabel('Current page').inputValue())).toBeGreaterThanOrEqual(60);
});

test('removing a recent browser document closes its window without deleting the original fixture', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Files' }).click();
  const filesWindow = page.locator('[data-window-id="files-main"]');
  await filesWindow.locator('input[type="file"]').first().setInputFiles(path.resolve('tests/fixtures/aedriain-sample.pdf'));
  await filesWindow.getByRole('button', { name: /aedriain-sample\.pdf/i }).click();
  await expect(page.locator('[data-window-id^="document-"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Files' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  const recentRow = filesWindow.locator('.recent-document-row').filter({ hasText: 'aedriain-sample.pdf' });
  await recentRow.getByTitle('Remove from AedriAIn').click();
  await expect(page.locator('[data-window-id^="document-"]')).toHaveCount(0);
  await expect(filesWindow.locator('.recent-document-row').filter({ hasText: 'aedriain-sample.pdf' })).toHaveCount(0);
});

test('relinks a browser PDF into the same document resource instead of duplicating it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Files' }).click();
  const filesWindow = page.locator('[data-window-id="files-main"]');
  await filesWindow.locator('input[type="file"]').first().setInputFiles(path.resolve('tests/fixtures/aedriain-sample.pdf'));
  await filesWindow.getByRole('button', { name: /aedriain-sample\.pdf/i }).click();
  await expect(page.locator('[data-window-id^="document-"]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Files' }).click();
  const recentRow = filesWindow.locator('.recent-document-row').filter({ hasText: 'aedriain-sample.pdf' });
  const chooserPromise = page.waitForEvent('filechooser');
  await recentRow.getByTitle('Relink document').click();
  const chooser = await chooserPromise;
  page.once('dialog', (dialog) => dialog.accept());
  await chooser.setFiles(path.resolve('tests/fixtures/aedriain-sample-2.pdf'));

  await expect(filesWindow.locator('.recent-document-row')).toHaveCount(1);
  await expect(filesWindow.locator('.recent-document-row')).toContainText('aedriain-sample-2.pdf');
  await expect(page.locator('[data-window-id^="document-"]')).toHaveCount(1);
  await expect(page.locator('[data-window-id^="document-"]').first()).toContainText('aedriain-sample-2.pdf');
});
