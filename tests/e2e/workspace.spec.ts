import path from 'node:path';
import { expect, test } from '@playwright/test';

test('boots the AedriAIn workspace and opens apps', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('AEDRIAIN')).toBeVisible();
  await expect(page.getByText('SPATIAL DESKTOP · DOCUMENTS V1')).toBeVisible();

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
