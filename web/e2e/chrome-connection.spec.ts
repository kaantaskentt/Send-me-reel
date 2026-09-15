import { test, expect } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:3127', headless: true });

test('local settings make Chrome selection explicit without claiming a verified connection', async ({ page }) => {
  let selected = false;
  const setupUrl = `http://127.0.0.1:43187/browser/pair/${'c'.repeat(43)}`;
  await page.route('**/api/local/health', route => route.fulfill({ json: {
    version: 1, status: 'ready', readers: { gemini: true, frames: true, pages: true }, chat: { configured: true },
    companion: { connected: true, terminal: true, browser: true, browserConnection: selected ? 'selected' : 'not_connected', harnesses: { codex: true, claude: false }, execution: 'streaming-terminal' }, issues: [],
  } }));
  await page.route('**/api/local/browser/connect', route => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toBeUndefined();
    return route.fulfill({ json: { setupUrl } });
  });
  await page.goto('/replicate/local');
  await page.getByRole('button', { name: 'Mac connected', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Your Mac connection', exact: true });
  await expect(dialog.getByText('Connect first', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Connect Chrome', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Copy Chrome link', exact: true })).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Open connection page', exact: true })).toHaveAttribute('href', setupUrl);
  await expect(dialog.getByText(/If you are in another browser/)).toBeVisible();
  selected = true;
  await dialog.getByRole('button', { name: 'Check again', exact: true }).click();
  await expect(dialog.getByText('Selected', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/We check the connection when a task starts/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await page.evaluate(() => Object.values(sessionStorage).concat(Object.values(localStorage)).some(value => String(value).includes('/browser/pair/')))).toBe(false);
});
