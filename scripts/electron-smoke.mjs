import assert from 'node:assert/strict';
import { _electron as electron } from 'playwright';

const app = await electron.launch({ args: ['.'], cwd: process.cwd(), env: { ...process.env, VITE_DEV_SERVER_URL: '' } });
try {
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  assert.match(await page.title(), /AedriAIn/i);
  const body = await page.locator('body').innerText();
  assert.match(body, /AEDRIAIN/);
  console.log('electron-production-smoke: PASS');
} finally {
  await app.close();
}
