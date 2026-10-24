# PMGC 2026 broadcast stage

A ten-theme, ten-scene tournament rundown for OBS, built for this platform.
The colour language, panel geometry, type treatment and motion are an original
interpretation of modern battle-royale esports broadcast design (the
KRAFTON India Esports / PMGC school: black-and-gold championship grades,
high-contrast accents, slashed panels, heavy condensed type, diagonal feeds).
No official KRAFTON logo, game artwork or character asset is bundled — the
key art and the three map plates in `public/assets/images/pmgc/` were produced
for this project.

| URL | What it is |
|---|---|
| `/pmgc` | Theme gallery + rundown index (pick a theme, open any scene) |
| `/pmgc/<scene>?theme=<id>` | The 1920×1080 stage on that scene and theme |
| `/admin/overlays` | Producer card: pick theme + scene, live preview, copy the OBS URL |

![Stream starting soon](screenshots/pmgc-stream-start.jpg)

## The rundown

| # | Scene id | On screen |
|---|---|---|
| 01 | `opening` | **Stream starting soon** — event art, ring countdown (`?start=` seconds, default 1200), phase label, squads/maps/matches chips |
| 02 | `casters` | **Caster intro** — two camera plates, names, roles, tags, equaliser, scrolling hype line |
| 03 | `drop` | **Match drop** — 30-second ring clock, `GET READY → STAND BY → DROP NOW`, caster hype lines, flight-path map card |
| 04 | `live` | **Live + map (diagonal)** — gameplay feed above a raked seam, tactical map below, live-points rail, elimination feed, score bug |
| 05 | `live-points` | **Live game feed + live points standings** — feed with the map tucked underneath, 16-row live points table |
| 06 | `chicken-dinner` | **Winner winner chicken dinner** — sunburst, confetti, slam-in type, trophy, winning squad strip |
| 07 | `winner-stats` | **Chicken dinner stats** — team totals plus four player cards (finishes, damage) |
| 08 | `match-standings` | **Match points** — 16-row result table (WWCD, finishes, placement points, total) |
| 09 | `overall` | **Overall standings** — two tables, 01–08 left and 09–16 right; each row carries matches played, wins, finishes, placement points and total, plus the qualification legend |
| 10 | `map-rotation` | **Map rotation** — Erangel · Miramar · Rondo cards with match slots and best squad |

| Live + diagonal map | Live points |
|---|---|
| ![Live feed with diagonal map](screenshots/pmgc-live-diagonal.jpg) | ![Live points standings](screenshots/pmgc-live-points.jpg) |

| Chicken dinner | Winner stats |
|---|---|
| ![Winner winner chicken dinner](screenshots/pmgc-chicken-dinner.jpg) | ![Chicken dinner stats](screenshots/pmgc-winner-stats.jpg) |

| Match points | Overall standings |
|---|---|
| ![Match points standings](screenshots/pmgc-match-points.jpg) | ![Overall standings](screenshots/pmgc-overall.jpg) |

"Play full show" walks the rundown in order (22s → 15s → 12s → 24s → 20s →
15s → 16s → 18s → 20s → 18s) and the drop scene hands over to `live`
automatically once its clock hits zero.

## The ten themes

| id | Identity |
|---|---|
| `krafton-gold` | Championship black + antique gold, gold grid, embers |
| `pmgc-neon` | Cyan/magenta circuit grid, scanlines, chromatic flicker |
| `red-zone` | Crimson alert, hazard stripes, siren vignette pulse |
| `miramar-sand` | Desert ochre, topographic survey rings, heat shimmer |
| `rondo-jade` | Jade + ink, drifting lantern glow |
| `vikendi-frost` | Glacier blue, frosted glass panels, falling snow |
| `livid-magenta` | Hot magenta/violet, brutalist offset shadows, pop blobs |
| `blackout-hud` | Matte black, hairline rules, lime telemetry sweep |
| `royal-chrome` | Navy + polished chrome text, travelling sheen |
| `sunset-victory` | Sunset gradient, sunburst rotation, warm celebration |

Themes are pure token blocks: `public/css/pmgc-themes.css` defines
`--p-accent`, `--p-bg`, `--p-panel`, `--p-cut`, `--p-radius`, the three
pre-mixed accents (`--p-accent-12/20/30`) and a motif layer per theme.
`public/css/pmgc-stage.css` only ever reads those tokens, so a new identity is
one copy of a token block plus a motif rule and an entry in the picker lists
(`THEMES` in `public/js/pmgc-stage.js`, the gallery script and the producer
card in `public/js/overlays.js`).

Everything is plain CSS + vanilla JS — no build step, no dependencies.

## OBS setup

1. Add a **Browser source**: `http://<host>/pmgc/<scene>?theme=<id>&ui=0`
   - width **1920**, height **1080**, FPS **30**
   - custom CSS empty, "Shutdown source when not visible" **off**
2. `ui=0` hides the operator bar, `obs=1` also makes the canvas transparent so
   the overlay can sit over a gameplay capture.
3. For the diagonal split scenes, put the real gameplay capture under the
   browser source, or pass `?feed=<image or video-still URL>` to use your own
   feed inside the frame. `?map=<url>` overrides the tactical map plate.
4. One URL per scene is often easiest to switch in OBS. Alternatively keep a
   single tab and use the round keys.

### URL options

| Param | Effect |
|---|---|
| `scene=<id>` | Pin the scene (same as `/pmgc/<id>`) |
| `theme=<id>` | Pin the theme |
| `ui=0` | Hide the operator bar |
| `obs=1` | Transparent body + no UI |
| `auto=1` | Start the full show immediately |
| `start=<seconds>` | Stream-start countdown length (default 1200) |
| `feed=<url>` | Your own gameplay image/still inside the feed window |
| `map=<url>` | Your own tactical map plate |
| `demo=0` | Ignore the built-in showcase roster even when no live data exists |

### Operator keys (stage tab)

`←` / `→` previous / next scene · `1`–`9`, `0` jump to scene ·
`space` play/pause the full show · `R` replay the current scene animation ·
`F` fullscreen · `H` hide the operator bar.

## Data

The stage polls `/api/live/state` on load and then follows `/api/live/stream`
(SSE) — every event triggers one fresh state read. When the tournament
database has at least four squads the real team names, logos, wins, finishes,
placement points and totals replace the built-in showcase roster; otherwise
the showcase roster (and its simulated eliminations between scene entry and
exit) keeps the graphics populated. No player UID, phone or e-mail is ever in
the payload, and the stage renders every string through `textContent`.

| Casters | Match drop |
|---|---|
| ![Caster intro](screenshots/pmgc-casters.jpg) | ![Match drop countdown](screenshots/pmgc-match-drop.jpg) |

![Map rotation](screenshots/pmgc-map-rotation.jpg)

## Files

| Path | Purpose |
|---|---|
| `public/pmgc.html` | Gallery / rundown index |
| `public/pmgc-stage.html` | The ten-scene stage markup |
| `public/js/pmgc-stage.js` | Scene controller, countdowns, live data, theme engine |
| `public/js/pmgc-gallery.js` | Gallery cards + rundown list (external: CSP has no inline scripts) |
| `public/css/pmgc-themes.css` | Ten theme token blocks, motif layers, per-theme component dressing |
| `public/css/pmgc-stage.css` | Stage layout, all scenes, shared broadcast components, animation |
| `public/assets/images/pmgc/` | Original key art, gameplay still and the three map plates |
| `public/js/overlays.js`, `public/admin-overlays.html` | Producer card on `/admin/overlays` |
| `tests/pmgc-stage.spec.js` | Playwright suite (routing, themes, countdowns, tables, keys) |
| `server.py` | `/pmgc` and `/pmgc/<scene>` routes |

## Accessibility & performance

- `prefers-reduced-motion: reduce` stops the motif layers, confetti and scene
  fill animations.
- The 1920×1080 canvas is scaled with a single CSS transform, so the whole
  stage is one composited layer — no per-frame layout work.
- Fonts are self-hosted (`/assets/fonts/`), images are static JPEGs, and the
  only network traffic is one state read plus SSE.
