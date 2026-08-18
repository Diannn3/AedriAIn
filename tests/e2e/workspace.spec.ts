import { expect, test } from '@playwright/test';

test('boots the AedriAIn workspace and opens apps', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('AEDRIAIN')).toBeVisible();
  await expect(page.getByText('WEBCAM SPATIAL DESKTOP · CORE V2.1')).toBeVisible();

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
  await page.reload();
  await expect(page.locator('[data-window-id="notes-main"]').getByLabel('Note title')).toHaveValue('Persistent research note');
});
