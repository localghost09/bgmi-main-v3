// @ts-check
// Event setup E2E: boots an isolated server, edits the single event config in
// /admin/event, then verifies the public site, ticket, schedule and About page
// hydrate from it. Finally closes registration and checks the public form.
// The real registrations.db is never touched.
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import net from 'node:net';
import path from 'node:path';

// package.json is type:commonjs — Playwright transpiles this file to CJS, so
// __dirname exists here and import.meta must not appear anywhere.
const ROOT = path.resolve(__dirname, '..');

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = /** @type {import('node:net').AddressInfo} */ (
        srv.address());
      srv.close(() => resolve(port));
    });
  });
}

/** @type {import('node:child_process').ChildProcess | undefined} */
let server;
/** @type {string} */
let base = '';
/** @type {string} */
let tmp = '';
const ADMIN_USER = 'zz_event_' + Math.random().toString(36).slice(2, 8);
const ADMIN_PW = 'Event!' + Math.random().toString(36).slice(2, 14) + '9a';

test.beforeAll(async () => {
  const port = await freePort();
  tmp = mkdtempSync(path.join(tmpdir(), 'bgmi_event_'));
  const env = {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: String(port),
    BGMI_DB: path.join(tmp, 'test.db'),
    BGMI_UPLOADS: path.join(tmp, 'uploads'),
    BGMI_NOTIFY_POLL: '3600',
    BGMI_ADMIN_USER: ADMIN_USER,
    BGMI_ADMIN_PASSWORD: ADMIN_PW,
  };
  server = spawn(process.env.PYTHON || 'python',
    [path.join(ROOT, 'server.py')],
    { env, cwd: ROOT, stdio: 'ignore' });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) break;
    try {
      const r = await fetch(base + '/api/health');
      if (r.ok) break;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }

  await new Promise((resolve, reject) => {
    const p = spawn(process.env.PYTHON || 'python',
      [path.join(ROOT, 'scripts', 'create_admin.py')],
      { env, cwd: ROOT, stdio: 'ignore' });
    p.on('error', reject);
    p.on('close', (code) => (code === 0
      ? resolve(undefined) : reject(new Error('create_admin exit ' + code))));
  });
});

test.afterAll(() => {
  if (server && server.exitCode === null) server.kill();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

test('event setup publishes identity, dates, venue and closed state',
  async ({ page, context }) => {
  test.setTimeout(120000);
  /** @type {string[]} */
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));

  const login = await fetch(base + '/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PW }),
  });
  expect(login.ok).toBeTruthy();
  const setCookie = login.headers.get('set-cookie') || '';
  const pair = setCookie.split(';')[0];
  const eq = pair.indexOf('=');
  expect(eq, 'admin session cookie').toBeGreaterThan(0);
  await context.addCookies([{
    name: pair.slice(0, eq),
    value: pair.slice(eq + 1),
    url: base,
    httpOnly: true,
    sameSite: 'Strict',
  }]);

  await page.goto(base + '/admin/event');
  await expect(page.locator('#siteForm')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#ev-event_name')).toHaveValue('BGMI CUP NOIDA 2026');

  // every schema group is a <details>; open them all before filling
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => { d.open = true; });
  });

  await page.fill('#ev-event_name', 'Hydration Cup 2027');
  // The homepage headline follows the event name until an admin edits the
  // individual hero lines.
  await expect(page.locator('#ev-hero_title_1')).toHaveValue('Hydration Cup');
  await expect(page.locator('#ev-hero_title_2')).toHaveValue('');
  await expect(page.locator('#ev-hero_title_3')).toHaveValue('2027');
  await page.fill('#ev-start_date', '2027-02-05');
  await page.fill('#ev-end_date', '2027-02-06');
  await page.selectOption('#ev-date_format', 'DD MMM YYYY');
  await page.selectOption('#ev-time_format', '24h');
  await page.fill('#ev-start_time', '18:30');
  await page.fill('#ev-checkin_time', '17:00');
  await page.fill('#ev-location_name', 'Pune');
  await page.fill('#ev-venue_name', 'Balewadi');
  await page.fill('#ev-venue_address', 'Balewadi Stadium, Pune');
  await page.fill('#ev-edition_label', 'HC.27');
  await page.fill('#ev-hero_title_2', 'PUNE');
  await page.fill('#ev-registration_closed_message', 'QA closed for now.');
  await page.fill('#ev-about_dossier_status', 'QA Active');
  await page.fill('#ev-about_lineup',
    'QA PLAYER | Coach | #999-01 | Strategy | Clutch |');

  await page.click('#saveBtn');
  await expect(page.locator('#savedAt')).toContainText('Published',
    { timeout: 20000 });
  await expect(page.locator('#siteError')).toHaveClass(/hidden/);

  // ---- public home hydrates from the same document ----------------------
  await page.goto(base + '/');
  await page.waitForFunction(() =>
    window.BGMI_SITE && window.BGMI_SITE.event_name === 'Hydration Cup 2027');
  await expect(page).toHaveTitle('Team registration | Hydration Cup 2027');
  await expect(page.locator('.hero-title-line--acid')).toHaveText('PUNE');
  await expect(page.locator('.hero-date')).toContainText('5-6 FEB 2027');
  await expect(page.locator('.hero-hud--tl .hb-line').first())
    .toHaveText('PUNE');
  await expect(page.locator('.footer-date')).toContainText(
    'Pune // 5-6 Feb 2027');
  await expect(page.locator('.tkt-details')).toContainText('Balewadi');
  await expect(page.locator('.tkt-brand')).toHaveText('Hydration Cup 2027');
  await expect(page.locator('.hero-br-tag')).toContainText('HC.27');
  expect(await page.locator('body').getAttribute('data-event-open')).toBe('1');

  await page.goto(base + '/schedule');
  await page.waitForFunction(() =>
    window.BGMI_SITE && window.BGMI_SITE.location_name === 'Pune');
  await expect(page.locator('main')).toContainText('5-6 Feb 2027');
  await expect(page.locator('main')).toContainText('18:30 IST');
  await expect(page.locator('main')).toContainText('Check-in 17:00 IST');
  await expect(page.locator('main')).toContainText('Balewadi Stadium, Pune');

  await page.goto(base + '/about');
  await page.waitForFunction(() =>
    window.BGMI_SITE && window.BGMI_SITE.about_lineup &&
    window.BGMI_SITE.about_lineup.indexOf('QA PLAYER') !== -1);
  await expect(page.locator('#teamGrid')).toContainText('QA PLAYER');
  await expect(page.locator('#teamGrid')).toContainText('QA Active');

  // ---- close the window from the same admin form ------------------------
  await page.goto(base + '/admin/event');
  await expect(page.locator('#siteForm')).toBeVisible({ timeout: 20000 });
  await page.evaluate(() => {
    document.querySelectorAll('details').forEach((d) => { d.open = true; });
  });
  await page.uncheck('#ev-registration_open');
  await page.click('#saveBtn');
  await expect(page.locator('#savedAt')).toContainText('Published',
    { timeout: 20000 });

  await page.goto(base + '/');
  await page.waitForFunction(() =>
    window.BGMI_SITE && window.BGMI_SITE.registration_open === false);
  await expect(page.locator('.reg-closed-note')).toBeVisible();
  await expect(page.locator('.reg-closed-note')).toContainText(
    'QA closed for now.');
  await expect(page.locator('#regSubmit')).toBeDisabled();
  await expect(page.locator('#regSubmit')).toHaveText('Registration closed');
  await expect(page.locator('.footer-cta').first())
    .toHaveText('Registration closed');
  expect(await page.locator('body').getAttribute('data-event-open')).toBe('0');

  expect(pageErrors).toEqual([]);
});
