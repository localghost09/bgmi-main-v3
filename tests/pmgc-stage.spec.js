// @ts-check
// PMGC broadcast stage: the ten-theme × ten-scene rundown at /pmgc/<scene>.
// Boots its own isolated server (temp DB + uploads on a free port, same
// isolation contract as link-check.spec.js) and checks the parts that must not
// silently rot: routing, the ten scenes, the ten themes, that both countdowns
// actually count, live data wiring, and a clean console on every scene.
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import net from 'node:net';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

const SCENES = ['opening', 'casters', 'drop', 'live', 'live-points',
  'chicken-dinner', 'winner-stats', 'match-standings', 'overall',
  'map-rotation'];

const THEMES = ['krafton-gold', 'pmgc-neon', 'red-zone', 'miramar-sand',
  'rondo-jade', 'vikendi-frost', 'livid-magenta', 'blackout-hud',
  'royal-chrome', 'sunset-victory'];

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

test.beforeAll(async () => {
  const port = await freePort();
  tmp = mkdtempSync(path.join(tmpdir(), 'bgmi_pmgc_'));
  server = spawn(process.env.PYTHON || 'python',
    [path.join(ROOT, 'server.py')], {
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(port),
        BGMI_DB: path.join(tmp, 'test.db'),
        BGMI_UPLOADS: path.join(tmp, 'uploads'),
        BGMI_NOTIFY_POLL: '3600',
      },
      cwd: ROOT,
      stdio: 'ignore',
    });
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) break;
    try {
      const r = await fetch(base + '/api/health');
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('isolated test server did not start');
});

test.afterAll(() => {
  if (server && server.exitCode === null) server.kill();
  if (tmp) rmSync(tmp, { recursive: true, force: true });
});

test('gallery lists ten themes and the ten-scene rundown', async ({ page }) => {
  await page.goto(base + '/pmgc');
  await expect(page.locator('.theme-card')).toHaveCount(10);
  await expect(page.locator('.step')).toHaveCount(10);
  await expect(page.locator('.theme-card').first())
    .toHaveAttribute('href', /\/pmgc\/opening\?theme=krafton-gold/);
});

test('every scene routes and activates with a clean console', async ({ page }) => {
  test.setTimeout(180000);
  const problems = [];
  page.on('pageerror', (e) => problems.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text());
  });
  for (const scene of SCENES) {
    await page.goto(`${base}/pmgc/${scene}?ui=0`);
    await expect(page.locator('#pmgc')).toHaveAttribute('data-scene', scene);
    await expect(page.locator(`.pg-scene[data-scene="${scene}"]`))
      .toHaveClass(/is-active/);
    const otherActive = await page.locator(
      '.pg-scene.is-active').count();
    expect(otherActive, `only one active scene on ${scene}`).toBe(1);
  }
  expect(problems, problems.join('\n')).toEqual([]);
});

test('all ten themes apply their own accent tokens', async ({ page }) => {
  const accents = new Map([
    ['krafton-gold', '#e8c15c'], ['pmgc-neon', '#25f4ff'],
    ['red-zone', '#ff2f38'], ['miramar-sand', '#f0a24a'],
    ['rondo-jade', '#35e0a1'], ['vikendi-frost', '#8fd8ff'],
    ['livid-magenta', '#ff3d8b'], ['blackout-hud', '#c6ff3c'],
    ['royal-chrome', '#cdd8ea'], ['sunset-victory', '#ffc247'],
  ]);
  for (const theme of THEMES) {
    await page.goto(`${base}/pmgc/live?theme=${theme}&ui=0`);
    await expect(page.locator('#pmgc')).toHaveAttribute('data-theme', theme);
    const accent = await page.evaluate(() => getComputedStyle(
      /** @type {HTMLElement} */ (document.querySelector('#pmgc')))
      .getPropertyValue('--p-accent').trim().toLowerCase());
    expect(accent, theme).toBe(accents.get(theme));
  }
});

test('the runtime theme picker repaints the stage', async ({ page }) => {
  await page.goto(`${base}/pmgc/overall?theme=krafton-gold&ui=1`);
  await page.selectOption('#pgUiTheme', 'rondo-jade');
  await expect(page.locator('#pmgc')).toHaveAttribute('data-theme', 'rondo-jade');
  const bug = await page.evaluate(() => getComputedStyle(
    /** @type {HTMLElement} */ (document.querySelector('.pg-bug-brand')))
    .backgroundColor);
  expect(bug).toBe('rgb(53, 224, 161)');
  expect(page.url()).toContain('theme=rondo-jade');
});

test('the stream-start countdown and its ring actually run', async ({ page }) => {
  await page.goto(`${base}/pmgc/opening?start=90&ui=0`);
  const clock = page.locator('#openClock');
  await expect(clock).toHaveText(/^0[01]:\d{2}$/);
  const before = await clock.textContent();
  const ringBefore = await page.locator('#openRing')
    .evaluate((el) => (el instanceof SVGElement) ? el.style.strokeDashoffset : '');
  await page.waitForTimeout(2400);
  expect(await clock.textContent()).not.toBe(before);
  expect(await page.locator('#openRing').evaluate(
    (el) => (el instanceof SVGElement) ? el.style.strokeDashoffset : ''))
    .not.toBe(ringBefore);
});

test('the match-drop clock counts 30 seconds down', async ({ page }) => {
  await page.goto(`${base}/pmgc/drop?ui=0`);
  const sec = page.locator('#dropSec');
  await expect(sec).toHaveText(/^\d{2}$/);
  const first = Number(await sec.textContent());
  expect(first).toBeGreaterThan(24);
  await page.waitForTimeout(2600);
  const second = Number(await sec.textContent());
  expect(second).toBeLessThan(first);
});

test('live scenes render the standings, kill feed and map seam', async ({ page }) => {
  await page.goto(`${base}/pmgc/live?ui=0`);
  await expect(page.locator('#liveRail .pg-live-row')).toHaveCount(16);
  await expect(page.locator('#killFeed .pg-kill').first()).toBeVisible();
  await expect(page.locator('#pgFeed')).toBeVisible();
  await expect(page.locator('.pg-slash')).toBeVisible();
  // the map window must start below the feed's diagonal bottom edge
  const boxes = await page.evaluate(() => {
    const feed = /** @type {HTMLElement} */ (document.querySelector('.pg-feed'))
      .getBoundingClientRect();
    const map = /** @type {HTMLElement} */ (document.querySelector('.pg-mapwin'))
      .getBoundingClientRect();
    return { feedBottom: feed.bottom, mapTop: map.top };
  });
  expect(boxes.mapTop).toBeGreaterThan(boxes.feedBottom - 140);
});

test('chicken dinner, winner stats and the map rotation are populated', async ({ page }) => {
  await page.goto(`${base}/pmgc/chicken-dinner?ui=0`);
  await expect(page.locator('#cdTeam')).not.toHaveText('AWAITING WINNER');
  await expect(page.locator('#cdConfetti i')).toHaveCount(78);

  await page.goto(`${base}/pmgc/winner-stats?ui=0`);
  await expect(page.locator('#wsPlayers .pg-wplayer')).toHaveCount(4);
  await expect(page.locator('#wsTeam')).not.toHaveText('');
  await expect(page.locator('#wsDmg')).not.toHaveText('');

  await page.goto(`${base}/pmgc/map-rotation?ui=0`);
  await expect(page.locator('.pg-map-card')).toHaveCount(3);
  const names = await page.locator('.pg-map-card-body h2').allTextContents();
  expect(names.map((n) => n.trim())).toEqual(['ERANGEL', 'MIRAMAR', 'RONDO']);
});

test('overall standings split 01–08 / 09–16 across two tables', async ({ page }) => {
  await page.goto(`${base}/pmgc/overall?ui=0`);
  await expect(page.locator('#ovLeft .pg-row')).toHaveCount(8);
  await expect(page.locator('#ovRight .pg-row')).toHaveCount(8);
  await expect(page.locator('#ovLeft .pg-row.is-first .rank')).toHaveText('01');
  await expect(page.locator('#ovRight .pg-row .rank').first()).toHaveText('09');
});

test('overall standings show matches played for every squad', async ({ page }) => {
  await page.goto(`${base}/pmgc/overall?ui=0`);
  // header order: # · team · matches · wins · fin · place pts · total
  const heads = await page.locator('#ovLeft').evaluate((host) =>
    [...host.closest('.pg-overall-table').querySelectorAll('.pg-board-th span')]
      .map((n) => n.textContent?.trim()));
  expect(heads).toEqual(['#', 'TEAM', 'MATCHES', 'WINS', 'FIN', 'PLACE PTS', 'TOTAL']);
  const played = await page.locator('#ovLeft .pg-row .num.played').allTextContents();
  expect(played).toHaveLength(8);
  played.forEach((v) => expect(v).toMatch(/^\d{2}$/));
  expect(await page.locator('#ovRight .pg-row .num.played').count()).toBe(8);
});

test('match points board renders all sixteen squads', async ({ page }) => {
  await page.goto(`${base}/pmgc/match-standings?ui=0`);
  await expect(page.locator('#msRows .pg-row')).toHaveCount(16);
  const totals = await page.locator('#msRows .pg-row .num.pts').allTextContents();
  const numbers = totals.map(Number);
  expect(numbers).toEqual([...numbers].sort((a, b) => b - a));
});

test('keyboard drives the rundown and the auto-show arms itself', async ({ page }) => {
  await page.goto(`${base}/pmgc/opening?ui=1`);
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene', 'casters');
  await page.keyboard.press('Digit9');
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene', 'overall');
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene', 'match-standings');

  await page.locator('#pgUiAuto').click();
  const armed = await page.evaluate(() => Boolean(
    /** @type {any} */ (window).__pmgc.state.sceneTimer));
  expect(armed).toBeTruthy();
});
