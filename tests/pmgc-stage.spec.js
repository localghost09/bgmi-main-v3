// @ts-check
// PMGC broadcast stage: the ten-theme × fifteen-scene rundown at /pmgc/<scene>.
// Boots its own isolated server (temp DB + uploads on a free port, same
// isolation contract as link-check.spec.js) and checks the parts that must not
// silently rot: routing, the fifteen scenes, the ten themes, that both countdowns
// actually count, live data wiring, and a clean console on every scene.
import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import net from 'node:net';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

const SCENES = ['opening', 'casters', 'drop', 'map-intro', 'live', 'map-feed', 'live-points',
  'chicken-dinner', 'winner-stats', 'match-standings', 'overall',
  'map-rotation', 'mvp', 'top-players', 'overall-mvp'];

const THEMES = ['bmps-2024', 'bgms-2024', 'bgis-2025', 'bgis-2026',
  'bmsd-2025', 'bmsd-2026', 'bmic-2025', 'pmgc-2025',
  'ewc-2025', 'ewc-2026'];

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

/** @param {import('@playwright/test').Locator} locator @param {number[]} expected */
async function expectBox(locator, expected) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element has no layout box');
  expect([Math.round(box.x), Math.round(box.y),
    Math.round(box.width), Math.round(box.height)]).toEqual(expected);
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
        BGMI_ADMIN_LOGIN_BYPASS: '1',
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

test('gallery lists ten event themes and fifteen scenes', async ({ page }) => {
  await page.goto(base + '/pmgc');
  await expect(page.locator('.theme-card')).toHaveCount(10);
  await expect(page.locator('.step')).toHaveCount(15);
  await expect(page.locator('.theme-card').first())
    .toHaveAttribute('href', /\/pmgc\/casters\?theme=bmps-2024/);
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
  test.setTimeout(180000);
  const accents = new Map([
    ['bmps-2024', '#14db87'], ['bgms-2024', '#ffc153'],
    ['bgis-2025', '#ffcf19'], ['bgis-2026', '#e9dc31'],
    ['bmsd-2025', '#12d8c4'], ['bmsd-2026', '#b8e54b'],
    ['bmic-2025', '#5e9dff'], ['pmgc-2025', '#f1ce65'],
    ['ewc-2025', '#a5e9ff'], ['ewc-2026', '#eac775'],
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

test('scene changes use the WWCD purple wipe and trophy instead of theme green', async ({ page }) => {
  await page.goto(`${base}/pmgc/mvp?theme=bmps-2024&ui=0`);
  await expect(page.locator('#pmgc')).toHaveAttribute('data-theme', 'bmps-2024');
  const transition = await page.evaluate(() => {
    /** @type {any} */ (window).__pmgc.setScene('winner-stats');
    const wipe = /** @type {HTMLElement} */ (document.querySelector('#pgWipe'));
    const trophy = /** @type {HTMLElement} */ (document.querySelector('.pg-wipe-trophy'));
    const animation = trophy.getAnimations()[0];
    if (animation) {
      animation.pause();
      animation.currentTime = 500;
    }
    const w1 = getComputedStyle(/** @type {Element} */ (document.querySelector('#pgWipe .w1')));
    const w2 = getComputedStyle(/** @type {Element} */ (document.querySelector('#pgWipe .w2')));
    const reference = getComputedStyle(/** @type {Element} */ (document.querySelector('.pg-wstats')));
    const trophyStyle = getComputedStyle(trophy);
    return {
      active: wipe.classList.contains('is-on'),
      firstBackground: w1.backgroundImage,
      secondBackground: w2.backgroundImage,
      referenceBackground: reference.backgroundImage,
      trophyAnimation: trophyStyle.animationName,
      trophyOpacity: Number(trophyStyle.opacity),
      trophyColor: trophyStyle.color,
    };
  });
  expect(transition.active).toBe(true);
  expect(transition.firstBackground).toBe(transition.referenceBackground);
  expect(transition.secondBackground).toBe(transition.referenceBackground);
  expect(transition.firstBackground).not.toContain('rgb(20, 219, 135)');
  expect(transition.trophyAnimation).toBe('pgWipeTrophy');
  expect(transition.trophyOpacity).toBeGreaterThan(0.9);
  expect(transition.trophyColor).toBe('rgb(229, 189, 67)');
  await expect(page.locator('#pgWipe')).not.toHaveClass(/is-on/);
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene', 'winner-stats');
});

test('the runtime theme picker repaints the stage', async ({ page }) => {
  await page.goto(`${base}/pmgc/overall?theme=bmps-2024&ui=1`);
  await page.selectOption('#pgUiTheme', 'bmsd-2025');
  await expect(page.locator('#pmgc')).toHaveAttribute('data-theme', 'bmsd-2025');
  const bug = await page.evaluate(() => getComputedStyle(
    /** @type {HTMLElement} */ (document.querySelector('.pg-bug-brand')))
    .backgroundColor);
  expect(bug).toBe('rgb(18, 216, 196)');
  expect(page.url()).toContain('theme=bmsd-2025');
});

test('the stream-start countdown and its ring actually run', async ({ page }) => {
  await page.goto(`${base}/pmgc/opening?start=90&ui=0`);
  const clock = page.locator('#openClock');
  await expect(clock).toHaveText(/^0[01]:\d{2}$/);
  const before = await clock.textContent();
  const ringBefore = await page.locator('#openRing')
    .evaluate((el) => (el instanceof SVGElement) ? el.style.strokeDashoffset : '');
  await expect.poll(() => clock.textContent(), {timeout:15000}).not.toBe(before);
  await expect.poll(() => page.locator('#openRing').evaluate(
    (el) => (el instanceof SVGElement) ? el.style.strokeDashoffset : ''), {timeout:15000})
    .not.toBe(ringBefore);
});

test('the match-drop clock counts 30 seconds down', async ({ page }) => {
  await page.goto(`${base}/pmgc/drop?ui=0`);
  const sec = page.locator('#dropSec');
  await expect(sec).toHaveText(/^\d{2}$/);
  const first = Number(await sec.textContent());
  expect(first).toBeGreaterThan(24);
  await expect.poll(async () => Number(await sec.textContent()), {timeout:15000})
    .toBeLessThan(first);
});

test('rectangular OBS frames place map top-right and gameplay bottom-left without standings', async ({ page }) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await page.goto(`${base}/pmgc/live?obs=1&sponsor=TEST%20PARTNER`);
  await expect(page.locator('.pg-live-standings')).toHaveCount(0);
  await expect(page.locator('#pgFeed')).toBeVisible();
  await expect(page.locator('.pg-slash')).toHaveCount(0);
  await expect(page.locator('#diagonalSponsor')).toHaveText('TEST PARTNER');
  const values = await page.evaluate(() => ({
    game: getComputedStyle(document.querySelector('.pg-live .pg-feed')).backgroundColor,
    map: getComputedStyle(document.querySelector('.pg-mapwin')).backgroundColor,
    clip: getComputedStyle(document.querySelector('.pg-mapwin')).clipPath,
    mapBox: (() => { const r = document.querySelector('.pg-mapwin').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })(),
    gameBox: (() => { const r = document.querySelector('.pg-live .pg-feed').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })(),
    backdrop: getComputedStyle(document.querySelector('.pg-bg')).display
  }));
  expect(values.game).toBe('rgba(0, 0, 0, 0)');
  expect(values.map).toBe('rgba(0, 0, 0, 0)');
  expect(values.clip).toBe('none');
  // Let the scene's entrance transform settle before measuring source bounds.
  await page.evaluate(() => document.getAnimations().forEach(a => { try { a.finish(); } catch { a.pause(); } }));
  const bounds = await page.evaluate(() => ['.pg-mapwin', '.pg-live .pg-feed'].map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; }));
  expect(bounds).toEqual([[1240,80,640,440],[40,428,1088,612]]);
  expect(values.backdrop).toBe('none');
});

test('chicken dinner, winner stats and the map rotation are populated', async ({ page }) => {
  await page.goto(`${base}/pmgc/chicken-dinner?ui=0`);
  await expect(page.locator('#cdTeam')).not.toHaveText('AWAITING WINNER');
  await expect(page.locator('#cdConfetti i')).toHaveCount(78);

  await page.goto(`${base}/pmgc/winner-stats?ui=0`);
  await expect(page.locator('#wsPlayers .pg-wplayer')).toHaveCount(4);
  await expect(page.locator('#wsTeam')).not.toHaveText('');
  await expect(page.locator('#wsPlayers .pg-ref-wplayer-stats b')).toHaveCount(8);
  await expect(page.locator('#wsPlayers .pg-ref-wplayer-stats b').first()).not.toHaveText('');

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

test('all ten themes keep caster cards vertically centered with transparent camera apertures', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`${base}/pmgc/casters?obs=1`);
  const signatures = [];
  for (const theme of THEMES) {
    await page.evaluate((t) => {
      window.__pmgc.setTheme(t);
      document.getAnimations().forEach(a => {try {a.finish();} catch {a.pause();}});
    }, theme);
    const geometry = await page.evaluate(() => {
      const grid = document.querySelector('.pg-caster-grid');
      return {
        columns: getComputedStyle(grid).gridTemplateColumns,
        gridY: Math.round(grid.getBoundingClientRect().y),
        cams: [...document.querySelectorAll('.pg-casters .pg-cam')].map((cam) => {
          const r = cam.getBoundingClientRect();
          return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bg: getComputedStyle(cam).backgroundColor };
        }),
        body: getComputedStyle(document.body).backgroundColor,
        root: getComputedStyle(document.querySelector('#pmgc')).backgroundColor,
        back: getComputedStyle(document.querySelector('.pg-bg')).display,
        card: getComputedStyle(document.querySelector('.pg-caster-card')).backgroundColor,
        cardImage: getComputedStyle(document.querySelector('.pg-caster-card')).backgroundImage
      };
    });
    for (const cam of geometry.cams) {
      expect(cam.bg, theme).toBe('rgba(0, 0, 0, 0)');
      expect(cam.w).toBeGreaterThan(300);
      expect(cam.h).toBeGreaterThan(300);
      expect(cam.x + cam.w).toBeLessThanOrEqual(1920);
      expect(cam.y + cam.h).toBeLessThanOrEqual(1080);
    }
    expect(geometry.root).toBe('rgba(0, 0, 0, 0)');
    expect(geometry.back).toBe('none');
    expect(geometry.card).toBe('rgba(0, 0, 0, 0)');
    expect(geometry.cardImage).toBe('none');
    const centered = await page.locator('.pg-casters .pg-caster-card').evaluateAll(cards => cards.map(card => {
      const r = card.getBoundingClientRect();return r.top + r.height / 2;
    }));
    for (const center of centered) expect(center,theme).toBeCloseTo(540, 0);
    await expect(page.locator('.pg-casters .pg-aperture-hole')).toHaveCount(2);

    signatures.push(JSON.stringify([geometry.columns, geometry.gridY, geometry.cams]));
  }
  expect(new Set(signatures).size).toBe(1);
});

test('drop cameras stay transparent and countdown leads through the correct map intro to gameplay', async ({ page }) => {
  await page.goto(`${base}/pmgc/drop?obs=1&battleground=miramar&audio=0`);
  await expect(page.locator('.pg-drop-cams .pg-cam')).toHaveCount(2);
  expect(await page.locator('.pg-drop-cams .pg-cam').first().evaluate((cam) => getComputedStyle(cam).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  // The actual 30s clock has a separate ticking test. Force its deadline here
  // to exercise expiry without making every suite wait half a minute.
  await page.evaluate(() => { window.__pmgc.state.dropEnds = Date.now() - 1; });
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene', 'map-intro', { timeout: 15000 });
  await expect(page.locator('#introMapName')).toHaveText('MIRAMAR');
  await expect(page.locator('#introMapImg')).toHaveAttribute('src', /map-miramar.jpg/);
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene', 'live', { timeout: 20000 });
});

test('live points have an opaque backing, short team tags, accurate player status and no fake live scoring', async ({ page }) => {
  const payload = {
    tournamentName: 'Test Cup', map: 'Rondo', matchNumber: 3,
    teams: Array.from({ length: 4 }, (_, i) => ({
      id: i + 1, teamName: 'ABCDEFGHIJKLMNOPQRST' + i, teamTag: ['GODL', 'SOUL', 'RNTX', 'TEST'][i],
      kills: 4 - i, matchPoints: 10 - i, overallPoints: 20 - i, overallMatches: 5 + i,
      players: [ { name: 'A', status: 'alive' }, { name: 'B', status: 'knocked' }, { name: 'C', status: 'out' }, { name: 'D', status: 'eliminated' } ]
    }))
  };
  await page.route('**/api/live/state', (route) => route.fulfill({ json: payload }));
  await page.goto(`${base}/pmgc/live-points?obs=1`);
  await expect(page.locator('#livePtsRows .pg-row')).toHaveCount(4);
  const row = page.locator('#livePtsRows .pg-row').first();
  await expect(row.locator('.team')).toHaveText('GODL');
  await expect(page.locator('#livePtsRows .team')).toHaveText(['GODL', 'SOUL', 'RNTX', 'TEST']);
  await expect(page.locator('#livePtsRows .num.matches')).toHaveText(['5', '6', '7', '8']);
  await expect(row.locator('.pg-alive i.alive')).toHaveCount(1);
  await expect(row.locator('.pg-alive i.knocked')).toHaveCount(1);
  await expect(row.locator('.pg-alive i.out')).toHaveCount(2);
  const colors = await row.locator('.pg-alive i').evaluateAll((nodes) => nodes.map((el) => getComputedStyle(el).backgroundColor));
  expect(colors).toEqual(['rgb(255, 255, 255)', 'rgb(255, 48, 62)', 'rgb(116, 120, 128)', 'rgb(116, 120, 128)']);
  const bg = await page.locator('.pg-livepts-board').evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toMatch(/^rgb\(/); // alpha must be 1, not rgba(...,.9)
  const initial = await row.locator('.num.pts').textContent();
  await page.waitForTimeout(4600);
  expect(await row.locator('.num.pts').textContent()).toBe(initial);
});

test('auto-show does not skip the configured stream countdown', async ({ page }) => {
  await page.clock.install();
  await page.goto(`${base}/pmgc/opening?start=90&auto=1&audio=0`);
  await page.clock.fastForward(23000);
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene', 'opening');
  await page.clock.fastForward(68000);
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene', 'casters');
});

test('OBS mask files and original music are served with their media types', async ({ request }) => {
  const game = await request.get(base + '/assets/obs/game-lower-left-mask.png');
  const map = await request.get(base + '/assets/obs/map-upper-right-mask.png');
  expect(game.status()).toBe(200);
  expect(map.status()).toBe(200);
  const audio = await request.get(base + '/assets/audio/deployment-original.wav');
  expect(audio.status()).toBe(200);
  expect(audio.headers()['content-type']).toContain('audio/wav');
});

test('scaled previews stay centered and every event result board fits its sixteen rows', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 540 });
  await page.goto(`${base}/pmgc/overall?ui=0`);
  const frame = await page.locator('#pmgc').boundingBox();
  expect(Math.abs(frame.x)).toBeLessThan(2);
  expect(Math.abs(frame.y)).toBeLessThan(2);
  expect(Math.round(frame.width)).toBe(960);
  for (const theme of THEMES) {
    await page.evaluate((t) => {
      window.__pmgc.setTheme(t);
      document.getAnimations().forEach((animation) => { try { animation.finish(); } catch { animation.pause(); } });
    }, theme);
    const clipped = await page.evaluate(() => [...document.querySelectorAll('.pg-overall-rows .pg-row')].filter((row) => {
      const r = row.getBoundingClientRect();
      const parent = row.closest('.pg-overall-table').getBoundingClientRect();
      return r.bottom > parent.bottom + 1 || r.bottom > 515 || r.right > 960;
    }).length);
    expect(clipped, `${theme}: all sixteen rows must be within the board and above ticker`).toBe(0);
  }
});

test('drop clock never occludes either camera in any of the ten layouts', async ({ page }) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await page.goto(`${base}/pmgc/drop?obs=1&audio=0`);
  for (const theme of THEMES) {
    await page.evaluate(t => {
      window.__pmgc.setTheme(t);
      document.getAnimations().forEach(a => {try {a.finish();} catch {a.pause();}});
    }, theme);
    const overlaps = await page.evaluate(() => {
      const timer = document.querySelector('.pg-drop-clockwrap').getBoundingClientRect();
      return [...document.querySelectorAll('.pg-drop-cams .pg-cam')].some(el => {
        const c = el.getBoundingClientRect();
        return c.left < timer.right && c.right > timer.left && c.top < timer.bottom && c.bottom > timer.top;
      });
    });
    expect(overlaps, theme).toBe(false);
  }
});


test('live points displays only the standings panel, with no top HUD or feed decorations', async ({ page }) => {
  await page.goto(`${base}/pmgc/live-points?obs=1`);
  await expect(page.locator('.pg-livepts-board > header')).toHaveCount(0);
  await expect(page.locator('#livePtsMeta')).toHaveCount(0);
  await expect(page.locator('.pg-livepts-board .pg-table-head')).toBeVisible();
  await expect(page.locator('.pg-bug')).toBeHidden();
  await expect(page.locator('.pg-livepts-feed')).toBeHidden();
  await expect(page.locator('.pg-livepts-board')).toBeVisible();
  await expect(page.locator('#livePtsRows .pg-row')).toHaveCount(16);
  // The separate Live + Map scene keeps its requested upper-left event bug.
  await page.goto(`${base}/pmgc/live?obs=1`);
  await expect(page.locator('.pg-bug')).toBeVisible();
});

test('compact standings sit bottom-right across every theme with larger centered status indicators', async ({ page }) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await page.goto(`${base}/pmgc/live-points?obs=1`);
  for (const theme of THEMES) {
    await expect(page.locator('.pg-livepts-rows .name').first()).toHaveCSS('gap', '12px');
    await page.evaluate(t => {
      window.__pmgc.setTheme(t);
      document.getAnimations().forEach(a => { try {a.finish();} catch {a.pause();} });
    }, theme);
    const values = await page.evaluate(() => {
      const rect = s => document.querySelector(s).getBoundingClientRect();
      const board = rect('.pg-livepts-board');
      const cell = rect('#livePtsRows .pg-alive');
      const pips = [...document.querySelectorAll('#livePtsRows .pg-row:first-child .pg-alive i')].map(e => e.getBoundingClientRect());
      return {
        right: 1920-board.right, bottom: 1080-board.bottom, width: board.width,
        pipWidth: pips[0].width, pipHeight: pips[0].height,
        horizontal: Math.abs((pips[0].left+pips[3].right)/2-(cell.left+cell.right)/2),
        vertical: Math.abs((pips[0].top+pips[0].bottom)/2-(cell.top+cell.bottom)/2)
      };
    });
    expect(values.right, theme).toBeCloseTo(24, 0);
    expect(values.bottom, theme).toBeCloseTo(24, 0);
    expect(values.width).toBe(460);
    expect(values.pipWidth).toBe(14);
    expect(values.pipHeight).toBe(22);
    expect(values.horizontal).toBeLessThan(1);
    expect(values.vertical).toBeLessThan(1);
  }
});

test('match points uses the reference two-table geometry, ranks 1–8 and 9–16, without changing Live Points', async ({ page }) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await page.goto(`${base}/pmgc/match-standings?obs=1`);
  await expect(page.locator('#msLeft .pg-row')).toHaveCount(8);
  await expect(page.locator('#msRight .pg-row')).toHaveCount(8);
  await expect(page.locator('#msLeft .rank').first()).toHaveText('01');
  await expect(page.locator('#msRight .rank').first()).toHaveText('09');
  await expect(page.locator('.pg-match-panel .pg-board-th')).toHaveCount(2);
  for (const theme of THEMES) {
    await page.evaluate(t => {
      window.__pmgc.setTheme(t);
      document.getAnimations().forEach(a => {try {a.finish();} catch {a.pause();}});
    }, theme);
    const boxes = await page.evaluate(() => {
      const [left, right] = [...document.querySelectorAll('.pg-match-panel')].map(e => e.getBoundingClientRect());
      const rows = [...document.querySelectorAll('.pg-match-rows .pg-row')];
      return {left: left.left, right: right.right, w1: left.width, w2: right.width,
        clipped: rows.some(row => row.getBoundingClientRect().bottom > row.closest('.pg-match-panel').getBoundingClientRect().bottom + 1)};
    });
    expect(boxes.left, theme).toBe(196);
    expect(boxes.right).toBe(1724);
    expect(boxes.w1).toBe(749);
    expect(boxes.w1).toBe(boxes.w2);
    expect(boxes.clipped).toBe(false);
  }
  await page.goto(`${base}/pmgc/live-points?obs=1`);
  await expect(page.locator('.pg-livepts-board')).toBeVisible();
  await expect(page.locator('.pg-match-grid')).toBeHidden();
});

test('MVP and top-five use real player awards, escape names, and fit all themes', async ({page}) => {
  await page.setViewportSize({width:1920, height:1080});
  const player = (name, kills, damage) => ({player:name, kills, damage, teamName:'A Long Registered Team Name', teamTag:'GODL', matches:6});
  const awards = {matchMvp:player('MATCH ACE', 9, 1825), matchTopPlayers:[
    player('FIFTH', 11, 1500), player('THIRD', 16, 2500), player('FIRST <img>', 25, 3900),
    player('SECOND', 20, 3000), player('FOURTH', 11, 1600)],
    topPlayers:[player('TOURNAMENT ONLY', 99, 9999)]};
  await page.route('**/api/live/state', route => route.fulfill({json:{ok:true, teams:[], playerAwards:awards}}));
  await page.goto(`${base}/pmgc/mvp?obs=1`);
  await expect(page.locator('#mvpContent h2').first()).toHaveText('MATCH ACE');
  await expect(page.locator('#mvpContent .pg-award-metric b').first()).toHaveText('9');
  await page.goto(`${base}/pmgc/top-players?obs=1`);
  await expect(page.locator('#topPlayersContent .is-leader h2')).toHaveText('FIRST <img>');
  await expect(page.locator('#topPlayersContent .pg-reference-card:not(.is-leader) h2')).toHaveText(['SECOND', 'THIRD', 'FOURTH', 'FIFTH']);
  await expect(page.locator('#topPlayersContent img')).toHaveCount(0);
  await expect(page.locator('#topPlayersContent .pg-reference-card')).toHaveCount(5);
  await expect(page.locator('#topPlayersContent .is-leader dd')).toHaveText(['—', '25', '3900', '—', '—']);
  await expect(page.locator('#topPlayersContent')).not.toContainText('TOURNAMENT ONLY');
  await expect(page.locator('#topPlayersContent .is-leader dt:visible')).toHaveText(['FINISHES', 'DAMAGE', 'SURV. TIME', 'KNOCKS']);
  await expect(page.locator('.pg-topplayers .pg-reference-disclaimer')).toContainText('LIVE SCORING');
  for (const theme of THEMES) {
    await page.evaluate(t => {
      window.__pmgc.setTheme(t);
      document.getAnimations().forEach(a => {try {a.finish();} catch {a.pause();}});
    }, theme);
    const bounds = await page.evaluate(() => [...document.querySelectorAll('#topPlayersContent article')].map(e => {
      const b=e.getBoundingClientRect();return {bottom:b.bottom,left:b.left,right:b.right,overflow:e.scrollWidth>e.clientWidth+1};
    }));
    for (const box of bounds) {
      expect(box.bottom,theme).toBeLessThanOrEqual(1009);
      expect(box.left).toBeGreaterThanOrEqual(56);
      expect(box.right).toBeLessThanOrEqual(1865);
      expect(box.overflow, theme).toBe(false);
    }
  }
});

test('player awards show waiting states rather than fictional showcase winners', async ({page}) => {
  await page.goto(`${base}/pmgc/mvp?obs=1`);
  await expect(page.locator('#mvpContent')).toHaveText('MVP AWAITING MATCH DATA');
  await page.goto(`${base}/pmgc/top-players?obs=1`);
  await expect(page.locator('#topPlayersContent .pg-reference-card')).toHaveCount(5);
  await expect(page.locator('#topPlayersContent h2')).toHaveText(['PENDING','PENDING','PENDING','PENDING','PENDING']);
  await expect(page.locator('#topPlayersMode')).toContainText('AWAITING CURRENT-MATCH PLAYER DATA');
});

test('all five BGIS current-match references keep their values, geometry and OBS map aperture', async ({page}) => {
  test.setTimeout(180000);
  await page.setViewportSize({width:1920,height:1080});
  await page.emulateMedia({reducedMotion:'reduce'});
  const problems = [];
  page.on('pageerror', error => problems.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') problems.push(message.text()); });
  const openReference = async scene => {
    await page.goto(`${base}/pmgc/${scene}?obs=1&reference=1`);
    await expect(page.locator(`.pg-scene[data-scene="${scene}"]`)).toHaveClass(/is-active/);
    await expect.poll(() => page.locator('.pg-scene.is-active img:visible').evaluateAll(images =>
      images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
    await page.evaluate(() => document.getAnimations().forEach(animation => {
      try { animation.finish(); } catch { animation.pause(); }
    }));
  };

  await openReference('mvp');
  await expect(page.locator('.pg-mvp .pg-ref-heading h1')).toHaveText('MVP OF THE MATCH');
  await expect(page.locator('#mvpMatch')).toHaveText('MATCH 13');
  await expect(page.locator('.pg-ref-mvp-name')).toHaveText('NINZAJAVIN');
  await expect(page.locator('.pg-ref-mvp-knocks b')).toHaveText('11');
  await expect(page.locator('.pg-ref-mvp-finishes b')).toHaveText('8');
  await expect(page.locator('.pg-ref-mvp-damage b')).toHaveText('1554');
  await expect(page.locator('.pg-ref-mvp-survival b')).toHaveText('26:06');
  await expectBox(page.locator('.pg-ref-mvp-team'), [573,409,302,290]);
  await expectBox(page.locator('.pg-ref-mvp-name'), [573,699,605,140]);
  await expectBox(page.locator('.pg-ref-mvp-finishes'), [1218,409,300,430]);
  await expectBox(page.locator('.pg-ref-mvp-damage'), [1518,409,340,215]);

  await openReference('winner-stats');
  await expect(page.locator('.pg-wstats .pg-ref-heading h1')).toHaveText('WWCD TEAM STATS');
  await expect(page.locator('#wsMeta')).toHaveText('MATCH 13');
  await expect(page.locator('#wsTeam')).toHaveText('IQOO ORANGUTAN');
  await expect(page.locator('#wsPlayers .pg-wplayer')).toHaveCount(4);
  await expect(page.locator('#wsPlayers h3')).toHaveText(
    ['IQOOXOGAKOP','IQOOXOGWIZGOD','IQOOXOGATTANKI','IQOOXOGAARU']);
  await expect(page.locator('#wsPlayers .pg-ref-wplayer-stats b')).toHaveText(
    ['7','803','5','752','3','503','1','270']);
  await expectBox(page.locator('#wsPlayers .pg-wplayer').first(), [184,300,340,552]);
  await expectBox(page.locator('#wsPlayers .pg-wplayer').last(), [1398,300,340,552]);

  await openReference('top-players');
  await expect(page.locator('.pg-topplayers .pg-ref-heading h1')).toHaveText('TOP PLAYERS');
  await expect(page.locator('#topPlayersMatch')).toHaveText('MATCH 13');
  await expect(page.locator('#topPlayersContent h2')).toHaveText(
    ['NINZAJAVIN','IQOOXOGAKOP','MYTHDETROX','IQOOXOGWIZGOD','GODLSPOWERR1']);
  await expect(page.locator('#topPlayersContent .is-leader dd')).toHaveText(
    ['—','8','1554','26:06','11']);
  const visualStatOrder = await page.locator('#topPlayersContent .is-leader .pg-reference-stat:not(.pg-ref-stat-rating)')
    .evaluateAll(rows => rows.map(row => ({label:row.querySelector('dt').textContent,
      top:row.getBoundingClientRect().top})).sort((a,b) => a.top-b.top).map(row => row.label));
  expect(visualStatOrder).toEqual(['FINISHES','SURV. TIME','DAMAGE','KNOCKS']);
  await expectBox(page.locator('#topPlayersContent .pg-reference-card').first(), [80,207,441,764]);
  await expectBox(page.locator('#topPlayersContent .pg-reference-card').nth(1), [560,345,290,626]);

  await openReference('match-standings');
  await expect(page.locator('#msMatch')).toHaveText('MATCH 13');
  await expect(page.locator('#msLeaderDamage')).toHaveText('2328');
  await expect(page.locator('#msLeaderHeals')).toHaveText('1172');
  await expect(page.locator('#msLeaderKnocks')).toHaveText('12');
  await expect(page.locator('#msLeaderHeadshots')).toHaveText('1');
  await expect(page.locator('#msRows .pg-ref-standing-team > b')).toHaveText(
    ['OG','NINZ','SOUL','K9','NBE','RNTX','GODL','MYTH',
      'GENS','VE','WF','LEFP','RGE','WELT','TT','VS']);
  await expect(page.locator('#msRows .num.pts')).toHaveText(
    ['26','17','15','12','11','11','9','7','6','5','4','3','3','1','1','1']);
  await expectBox(page.locator('.pg-ref-leader-banner'), [196,266,1528,169]);
  await expectBox(page.locator('.pg-match-panel').first(), [196,452,749,550]);
  await expectBox(page.locator('.pg-match-panel').last(), [975,452,749,550]);

  await openReference('map-feed');
  await expect(page.locator('#mapFeedTitle')).toHaveText('GRAND FINALS - M14');
  await expect(page.locator('.pg-ref-map-team')).toHaveCount(16);
  await expect(page.locator('.pg-ref-map-team-name')).toHaveText(
    ['VE','LEFP','MYTH','NBE','WELT','WF','OG','SOUL',
      'GODL','K9','RNTX','TT','NINZ','VS','RGE','GENS']);
  await expect(page.locator('#mapFeedImage')).toBeVisible();
  await expectBox(page.locator('.pg-ref-map-aperture'), [419,0,1084,1080]);
  await expectBox(page.locator('#mapFeedLeft .pg-ref-map-team').first(), [37,236,152,186]);
  await expectBox(page.locator('#mapFeedRight .pg-ref-map-team').first(), [1536,236,152,186]);

  await page.goto(`${base}/pmgc/map-feed?obs=1`);
  await expect(page.locator('#mapFeedImage')).toBeHidden();
  expect(await page.locator('.pg-ref-map-aperture').evaluate(
    element => getComputedStyle(element).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
  expect(problems, problems.join('\n')).toEqual([]);
});

test('overall MVP reference has five seeded portraits, rating order and all five stat rows', async ({page}) => {
  await page.setViewportSize({width:1920,height:1080});
  // A real scoring response must never replace the explicitly seeded snapshot.
  await page.route('**/api/live/state', route => route.fulfill({json:{ok:true, teams:[],
    playerAwards:{matchMvp:{player:'LIVE PLAYER',kills:99,damage:10000},topPlayers:[]}}}));
  await page.goto(`${base}/pmgc/overall-mvp?theme=bgis-2026&obs=1`);
  const cards = page.locator('#overallMvpCards .pg-reference-card');
  await expect(cards).toHaveCount(5);
  await expect(cards.locator('h2')).toHaveText(['GENSHUNTERRZ','IQOOSOULJOKER9','IQOOSOULLEGITT','IQOOXOGAKOP','IQOOSOULGOBLIN']);
  await expect(cards.first().locator('dd')).toHaveText(['1.32','54','10487','22:11','46']);
  await expect(cards.nth(1).locator('dd')).toHaveText(['1.27','47','11131','22:03','50']);
  await expect(cards.nth(2).locator('dd')).toHaveText(['1.25','48','10660','21:24','48']);
  await expect(cards.locator('dt')).toHaveCount(25);
  await expect(page.locator('#overallMvpSeedLabel')).toContainText('NOT LIVE RESULTS');
  await expect(page.locator('#pgBug')).toBeHidden();
  await expect.poll(async () => page.locator('#overallMvpCards img').evaluateAll(images =>
    images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  await expect(cards.first()).toHaveClass(/is-leader/);
  // Seeded portraits and metrics are reference data even after live updates.
  await expect(page.locator('#mvpContent h2').first()).toHaveText('LIVE PLAYER');
  await expect(cards.first().locator('h2')).toHaveText('GENSHUNTERRZ');
  for (const theme of THEMES) {
    await page.evaluate(t => {
      window.__pmgc.setTheme(t);
      document.getAnimations().forEach(a => {try {a.finish();} catch {a.pause();}});
    }, theme);
    const geometry = await cards.evaluateAll(els => els.map(e => {
      const rect=e.getBoundingClientRect();
      return {top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right,
        color:getComputedStyle(e).backgroundColor,
        overflow:[...e.querySelectorAll('.pg-reference-stat')].some(row => row.scrollWidth > row.clientWidth + 1)};
    }));
    expect(geometry[0].top).toBeLessThan(geometry[1].top);
    expect(geometry[0].color).toBe('rgb(237, 196, 13)');
    for (const box of geometry) {
      expect(box.bottom, theme).toBeLessThanOrEqual(1009);
      expect(box.left).toBeGreaterThanOrEqual(56);
      expect(box.right).toBeLessThanOrEqual(1865);
      expect(box.overflow,theme).toBe(false);
    }
  }
});

test('live reference cards refresh rankings and keep missing players and stats honest', async ({page}) => {
  await page.clock.install();
  let players = [{player:'ALPHA',teamTag:'A',kills:3,damage:900}, {player:'BETA',teamTag:'B',kills:2,damage:800}];
  await page.route('**/api/live/state', route => route.fulfill({json:{ok:true,teams:[],playerAwards:{matchTopPlayers:players, topPlayers:[{player:'TOURNAMENT ONLY',kills:99,damage:9999}]}}}));
  await page.goto(`${base}/pmgc/top-players?obs=1`);
  const cards = page.locator('#topPlayersContent .pg-reference-card');
  await expect(cards).toHaveCount(5);
  await expect(cards.first().locator('h2')).toHaveText('ALPHA');
  await expect(cards.nth(2).locator('h2')).toHaveText('PENDING');
  await expect(cards.nth(2).locator('dd')).toHaveText(['—','—','—','—','—']);
  await expect(page.locator('#topPlayersContent img')).toHaveCount(0);
  players = [{player:'ALPHA',teamTag:'A',kills:3,damage:900}, {player:'BETA',teamTag:'B',kills:7,damage:1800}];
  await page.clock.fastForward(16000);
  await expect(cards.first().locator('h2')).toHaveText('BETA');
  await expect(cards.first().locator('dd')).toHaveText(['—','7','1800','—','—']);
  await expect(page.locator('#topPlayersContent')).not.toContainText('TOURNAMENT ONLY');
  await expect(page.locator('#topPlayersContent img[src*="mvp-reference"]')).toHaveCount(0);
});


test('current-match reference preview is explicit, labeled, and never leaks into live OBS', async ({page}) => {
  await page.route('**/api/live/state', route => route.fulfill({json:{ok:true,teams:[],
    playerAwards:{matchTopPlayers:[],topPlayers:[{player:'TOURNAMENT ONLY',kills:99,damage:9999}]}}}));
  await page.goto(`${base}/pmgc/top-players?obs=1&reference=1`);
  await expect(page.locator('.pg-topplayers .pg-ref-heading h1')).toHaveText('TOP PLAYERS');
  await expect(page.locator('#topPlayersMatch')).toHaveText('MATCH 13');
  await expect(page.locator('.pg-topplayers .pg-ref-event-mark')).toBeVisible();
  await expect(page.locator('#topPlayersContent .pg-reference-card')).toHaveCount(5);
  await expect(page.locator('#topPlayersContent .is-leader h2')).toHaveText('NINZAJAVIN');
  await expect(page.locator('#topPlayersMode')).toContainText('NOT LIVE RESULTS');
  await page.goto(`${base}/pmgc/top-players?obs=1&preview=1`);
  await expect(page.locator('#topPlayersContent .is-leader h2')).toHaveText('NINZAJAVIN');
  await expect(page.locator('#topPlayersMatch')).toHaveText('MATCH 13');
  await expect(page.locator('#topPlayersMode')).toContainText('NOT LIVE RESULTS');
  await page.goto(`${base}/pmgc/top-players?obs=1`);
  await expect(page.locator('#topPlayersContent .is-leader h2')).toHaveText('PENDING');
  await expect(page.locator('#topPlayersContent')).not.toContainText('TOURNAMENT ONLY');
  await expect(page.locator('#topPlayersContent img[src*="bgis-2026"]')).toHaveCount(0);
  await page.goto(`${base}/pmgc/winner-stats?obs=1`);
  await expect(page.locator('#wsTeam')).not.toHaveText('IQOO ORANGUTAN');
  await expect(page.locator('#wsPlayers img[src*="bgis-2026"]')).toHaveCount(0);
});


test('preview never blends reference awards with a partial live award payload', async ({page}) => {
  await page.route('**/api/live/state', route => route.fulfill({json:{ok:true,teams:[],
    playerAwards:{matchMvp:null,matchTopPlayers:[{player:'LIVE LEADER',teamTag:'LIVE',kills:6,damage:1200}],topPlayers:[]}}}));
  await page.goto(`${base}/pmgc/mvp?obs=1&preview=1`);
  await expect(page.locator('#mvpContent .pg-award-empty')).toHaveText('MVP AWAITING MATCH DATA');
  await expect(page.locator('#mvpContent')).not.toContainText('NINZAJAVIN');
  await page.goto(`${base}/pmgc/top-players?obs=1&preview=1`);
  await expect(page.locator('#topPlayersContent .is-leader h2')).toHaveText('LIVE LEADER');
  await expect(page.locator('#topPlayersContent')).not.toContainText('NINZAJAVIN');
  await expect(page.locator('#topPlayersMatch')).not.toHaveText('MATCH 13');
  await expect(page.locator('#topPlayersMode')).toContainText('LIVE SCORING');
});

test('common Program URL follows producer scene, theme and caster edits without reloading OBS', async ({page, context}) => {
  await page.goto(`${base}/pmgc/program?obs=1`);
  const originalUrl = page.url();
  const admin = await context.newPage();
  await admin.goto(`${base}/admin/overlays`);
  await expect(admin.locator('#pmgcProgramStatus')).toContainText('Connected');
  await expect(admin.getByRole('heading', {name: 'Browser sources', exact: true})).toHaveCount(0);
  await expect(admin.locator('#overlayGrid')).toHaveCount(0);
  await expect(admin.getByRole('heading', {name: 'Access & branding', exact: true})).toHaveCount(0);
  await expect(admin.getByRole('heading', {name: 'Preview', exact: true})).toHaveCount(0);
  await expect(admin.locator('#programUrl, #programSceneBtns, #tokenField, #previewFrame')).toHaveCount(0);
  await expect(admin.locator('#pmgcUrl')).toHaveValue(`${base}/pmgc/program?obs=1`);
  await expect(admin.locator('#pmgcSceneButtons button')).toHaveCount(15);
  const preview = admin.frameLocator('#pmgcPreviewFrame');
  await admin.locator('#pmgcSceneButtons button[data-scene="casters"]').click();
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene','casters');
  await expect(preview.locator('#pmgc')).toHaveAttribute('data-scene','casters');
  await expect(admin.locator('#pmgcProgramStatus')).toContainText('Saved');
  await admin.locator('#pmgcTheme').selectOption('bgis-2026');
  await expect(page.locator('#pmgc')).toHaveAttribute('data-theme','bgis-2026');
  await expect(admin.locator('#pmgcProgramStatus')).toContainText('Saved');
  await admin.locator('#pmgcCaster1').fill('HOST <img>');
  await admin.locator('#pmgcCaster2').fill('ANALYST');
  await admin.locator('#pmgcTagline1').fill('Every rotation, every fight');
  await admin.locator('#pmgcTagline2').fill('Breaking down the endgame');
  await admin.locator('#pmgcSaveCasters').click();
  await expect(page.locator('#casterName1')).toHaveText('HOST <img>');
  await expect(page.locator('#casterLine1')).toHaveText('Every rotation, every fight');
  await expect(page.locator('#casterLine1')).toBeVisible();
  await expect(page.locator('#casterName1 img')).toHaveCount(0);
  expect(page.url()).toBe(originalUrl);
  await page.reload();
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene','casters');
  await expect(page.locator('#casterName2')).toHaveText('ANALYST');
  await admin.reload();
  await expect(admin.locator('#pmgcCaster1')).toHaveValue('HOST <img>');
  await expect(admin.locator('#pmgcTheme')).toHaveValue('bgis-2026');
  const pinned = await context.newPage();
  await pinned.goto(`${base}/pmgc/live?theme=bmps-2024&obs=1`);
  await admin.locator('#pmgcSceneButtons button[data-scene="overall"]').click();
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene','overall');
  await expect(pinned.locator('#pmgc')).toHaveAttribute('data-scene','live');
  await expect(pinned.locator('#pmgc')).toHaveAttribute('data-theme','bmps-2024');
  await expect(admin.locator('#pmgcUrl')).toHaveValue(`${base}/pmgc/program?obs=1`);
  await admin.locator('#pmgcSceneButtons button[data-scene="map-feed"]').click();
  await expect(page.locator('#pmgc')).toHaveAttribute('data-scene','map-feed');
  await expect(pinned.locator('#pmgc')).toHaveAttribute('data-scene','live');
  await admin.close(); await pinned.close();
});

test('Program copy handles clipboard permission denial and exposes manual selection when blocked', async ({page}) => {
  await page.goto(`${base}/admin/overlays`);
  await expect(page.locator('#pmgcProgramStatus')).toContainText('Connected');
  await page.evaluate(() => {
    window.__copyToasts = [];
    window.BC.toast = message => window.__copyToasts.push(message);
    Object.defineProperty(navigator, 'clipboard', {configurable:true, value:{writeText: () => Promise.reject(new Error('Permission denied'))}});
    document.execCommand = command => {
      window.__copiedText = document.querySelector('#pmgcUrl').value;
      return command === 'copy';
    };
  });
  await page.locator('#pmgcCopyBtn').click();
  await expect.poll(() => page.evaluate(() => window.__copyToasts.at(-1))).toContain('Copied common');
  expect(await page.evaluate(() => window.__copiedText)).toBe(`${base}/pmgc/program?obs=1`);
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {configurable:true, value:undefined});
    document.execCommand = () => false;
  });
  await page.locator('#pmgcCopyBtn').click();
  await expect.poll(() => page.evaluate(() => window.__copyToasts.at(-1))).toContain('URL selected');
  const selected = await page.locator('#pmgcUrl').evaluate(el => el.value.slice(el.selectionStart,el.selectionEnd));
  expect(selected).toBe(`${base}/pmgc/program?obs=1`);
});
