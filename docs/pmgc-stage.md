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

## Event-layout / OBS update

The ten generic names have been replaced by `bmps-2024`, `bgms-2024`,
`bgis-2025`, `bgis-2026`, `bmsd-2025`, `bmsd-2026`, `bmic-2025`,
`pmgc-2025`, `ewc-2025`, `ewc-2026`. The earlier IDs remain URL aliases.
Catalog: `public/js/broadcast-themes.js`; consumers share this single list.
Layouts: `public/css/pmgc-layouts.css`. These are original event-inspired
adaptations, not official CG packages; see `docs/broadcast-references.md`.

The rundown now has eleven scenes: `map-intro` is inserted after `drop`.
The drop clock expires after the real 30 seconds even in manual mode, then
plays the 8-second selected-map bumper and moves to `live`. Auto-show does
not skip either the configured opening clock or the match-drop clock.
Music is original CC0 (`audio=0` to mute; OBS controls browser audio).

New parameters: `battleground=erangel|miramar|rondo`, `sponsor=<text>`,
`event=<text>`, `caster1=<text>`, `caster2=<text>`, `guides=1` (interactive
source-coordinate guide only). Use `obs=1` for production URLs.

Camera scenes, match-drop cameras and gameplay are transparent. Live+map
has no standings, game lower-left / map upper-right, match/event upper-left
and sponsor lower-right. Mask assets in `public/assets/obs/` must be applied
to the independent video sources in OBS; CSS cannot crop other sources.
Live points has a fully opaque right-side board, 15-character names, and
accurate player status pips (white alive/red knocked/grey eliminated).
Showcase simulation is disabled whenever real tournament state is loaded.

Full user-facing instructions are served at `/broadcast-setup.html`.
The original `/overlay` shell remains untouched.

## Rectangular live + map correction

The operator confirmed gameplay **bottom-right**, not bottom-left. `/pmgc/live`
now uses separate transparent rectangular frames with no diagonal cut:
map `(1304,80,576,324)`, gameplay `(792,428,1088,612)` at 1920×1080.
No standings in this scene. Event/match remains upper-left; sponsor is below
gameplay at bottom-right. Remove old OBS diagonal mask filters.
This supersedes the older diagonal instructions above.

## Latest placement correction

Gameplay rectangle is **bottom-left** at `(40,428,1088,612)`. Map remains
**top-right** at `(1304,80,576,324)`. This supersedes the prior bottom-right
gameplay placement. Both are transparent rectangles; no diagonal masks.
Sponsor stays bottom-right; event/match remains upper-left.

Map frame enlarged to `(1240,80,640,440)` (was 576×324). Right edge
stays at 1880. Gameplay remains `(40,428,1088,612)` with no overlap.
The map source may need cropping to fit its taller aspect ratio in OBS.

Live Points is now standings-only: the top event/match/squads/zone/time HUD
and gameplay-frame decorations are hidden in this scene. The standings
board and its player-status legend remain; the Live + Map HUD is unchanged.

Live Points is anchored 24px from the bottom/right. Its narrower team
column uses short tags. MP shows the squad's overall matches played; FIN
and TOTAL remain current-match values. Larger status pips are centered in
the status cell, vertically aligned to each row.

Match Points (`/pmgc/match-standings`) now uses two equal centered tables,
ranks 01–08 / 09–16, with repeated column headers and larger 76px rows.
The compact Live Points overlay and Overall layouts are unchanged.

## Producer Stream Starting timer

In `/admin/overlays`, use **Stream Starting timer (minutes:seconds)** and
**Apply / restart timer**. `5:30` means five minutes and thirty seconds.
Accepts `0:01` through `999:59`; seconds must be two digits from `00` to `59`.
The duration is persisted on the server, not just in the admin browser.
Applying it emits a live update and restarts open opening scenes; if SSE is
interrupted, the 15-second polling fallback catches the change. Other scenes
are not interrupted and use the saved duration next time opening is entered.
The preview and normal producer-generated OBS URLs require no manual editing.
Legacy explicit `start=` links retain their URL override; use the producer's
normal URL if you want the server-saved duration to control that source.

## MVP and top-five player scenes

The rundown now has **13 scenes**. In the producer's Scene picker choose
**11 · Match MVP** (`/pmgc/mvp`) or **12 · Top 5 players**
(`/pmgc/top-players`). Both support all ten selected event themes.

`/api/live/state.playerAwards.matchMvp` is the current match scoring leader
(finishes, then damage); `.topPlayers` is the tournament top five, including
live results. The latter uses UID-based server aggregation without exposing
UIDs publicly. This is **not** Krafton's proprietary MVP rating formula.
Displayed metrics: MVP finishes/damage; top five finishes/damage/matches.
Untracked knocks, survival, contribution and official MVP ratings are omitted.
Missing MVP data produces a waiting slate; fewer than five players produce
pending rows, never fake players. New scenes do not depend on the four-team
minimum used by the old showcase adapter. Updates arrive through the existing
public SSE/refetch flow plus 15-second polling fallback.

Design: hero spotlight with a stat panel for MVP; one featured leader and four
chaser rows for top five. Team logo/name, player IGN and neutral jersey/
monogram placeholder are supported. Player photo upload is not added here;
current scoring has no player portrait field. Reference survey and limits are
recorded in `docs/broadcast-references.md`.

## Supplied-image Overall Top 5 MVP reference

The rundown has **14 scenes**. Choose **13 · Overall Top 5 MVP (seeded
reference)** in `/admin/overlays`, or open `/pmgc/overall-mvp?obs=1`.

This is a separate reference-preview scene, not a replacement for the live
Match MVP or Top 5 Players scenes. It recreates the operator-supplied BGIS 2026
composition: purple background, caution-tape corner, centered title/event,
five side-by-side portrait cards, taller #1 card and yellow leader statistics.
All cards have MVP rating, finishes, damage, average survival and knocks.
The fixed purple/yellow palette intentionally follows this reference rather
than changing with the theme selector.

Portraits and event mark are cropped from the supplied screenshot. The
editable seed fixture is `public/js/pmgc-mvp-reference.js`; images are in
`public/assets/images/mvp-reference/`. Rank follows the supplied MVP rating,
not finishes (47 finishes ranks above 48 in the reference). A persistent
**SEEDED REFERENCE PREVIEW · NOT LIVE RESULTS** footer identifies the snapshot,
including in OBS mode. No user/tournament records, APIs or database scores are
changed, and live SSE updates cannot replace these seed values. Seeded ratings,
survival and knocks are copied reference values, not calculated official stats.

## Approved reference theme applied to live Top 5 Players

`/pmgc/top-players` now uses the approved purple five-column card design with
an enlarged yellow #1 card. Select **12 · Top 5 players** in the producer;
existing OBS links continue to work. The background/palette stay fixed to the
approved design regardless of the theme selector. The heading reads TOP 5
PLAYERS / OVERALL · LIVE TOURNAMENT, without a misleading BGIS event badge.

Names, team tags, finishes and damage come from the public player-awards
payload, sorted by finishes and damage. SSE/refetch and fallback polling update
rank order automatically. Missing slots show PENDING. Official MVP rating,
average survival and knocks remain `—` because this app does not track them;
no reference snapshot values are assigned to live participants. Player portrait
URLs are rendered if supplied; otherwise use a team logo or player monogram
with PLAYER PHOTO NOT SET. Current scoring still has no portrait-upload field.

The separate `/pmgc/overall-mvp` seeded reference is retained unchanged and
clearly labeled as a snapshot, not live results. Match MVP is unchanged.

### Top-five reference correction

Preserve the approved reference chrome on `/pmgc/top-players`: TOURNAMENT MVP /
BGIS 2026 theme heading, source event mark, BREAKING BARRIERS tape, white photo
surfaces, gray name bands, and the original five-card geometry. BGIS 2026 here
identifies the requested reference theme, not the user's tournament identity.
The previous alternate TOP 5 header/badge and dark photo placeholders are
superseded. Missing scores never collapse the design into a generic waiting
panel: live OBS keeps five PENDING cards until scores exist. The producer's
`preview=1` iframe may show the reference seed only while no live leaders exist,
always labeled NOT LIVE RESULTS. OBS copy links omit `preview=1`, so they never
silently show seed players. As soon as leaders arrive, the preview uses them.

## Common PMGC Program source and producer controls

Copy **Common OBS Program URL (copy once)** from the PMGC section in
`/admin/overlays`. It is `/pmgc/program?obs=1` on the current server origin.
Add that URL once as a 1920×1080 OBS Browser Source. Use the fourteen scene
buttons (or Scene picker) and Theme picker to switch what that source renders.
Selecting the current scene again replays it. Changing names, taglines, theme,
map, sponsor or audio does not replay the current scene.

The PMGC panel now includes separate **Caster 1/2 name** and **Caster 1/2
tagline** inputs. Click **Save caster details**; both caster cards and drop
caster labels update without reloading OBS. Taglines remain visible in the
opaque nameplates; camera windows remain transparent. Fields accept plain text
only (60 characters for names, 120 for taglines), and are rendered with
`textContent`, not HTML.

Program settings are persisted in the existing SQLite `overlay_settings`
table under a separate `pmgc_program` key. Authenticated, CSRF-protected
`POST /api/admin/overlay-settings` accepts a validated partial `pmgcProgram`
object. The read-only public `/api/live/state.pmgcProgram` payload lets OBS
follow it without an admin session or credentials in the URL. Changes use the
existing live SSE channel, with a two-second polling fallback for Program.
Other scenes retain their 15-second fallback. The Program URL never changes as
scenes/themes change, and the producer iframe stays loaded rather than being
replaced on every edit. Reloading either OBS or the panel restores saved state.

Existing `/pmgc/<scene>?theme=...` links stay pinned and independent. Legacy
`/overlay/program` controls and layout settings are not altered. Approved
Top 5 purple/yellow reference styling remains fixed by design even when a
program theme changes. Timer duration continues to use the existing MM:SS
producer field. Automatic scene transitions (drop → map intro → live) retain
their existing behavior; a new producer scene click explicitly takes control.

## Centered caster studio and opaque video surrounds

Latest operator correction: **Casters** and **Live + Map** are no longer
transparent everywhere outside their UI. Each now has an opaque dark studio
backdrop with theme-accent lighting, subtle grid/angular dressing and original
BG broadcast branding. Inline SVG luminance masks punch true-alpha rectangular
holes in the surround, allowing OBS captures below the browser to show only
inside the designated windows. Nameplates, surrounding space and branding stay
opaque. Live Points and Match Drop retain their previous transparency behavior.

Caster cards share one vertically centered layout across all ten themes:
- Card 1: x100 / y249.375, 820×581.25 including its 120px nameplate.
- Card 2: x1000 / y249.375, same size; both card centers are y540.
- Camera frames are 820×461.25 (16:9), with a 2px border; their interiors are
  transparent. Frame geometry is fixed so the backdrop cutouts always align.
- Caster-card sliding/offset animations and per-theme asymmetric placements are
  superseded to prevent video holes drifting away from their masks.

Live + Map retains gameplay `(40,428,1088,612)` and map
`(1240,80,640,440)`. The empty upper-left area now carries original BG /
BATTLEGROUND LIVE COVERAGE branding. Live Points logo-to-team text spacing is
12px, with logos prevented from shrinking; the compact panel's placement,
columns and status indicators are unchanged.

Verification: 29 browser tests passed. Additionally sampled screenshot PNG
alpha at ten points per theme across both scenes: 100 checks confirmed alpha
0 in video interiors and alpha 255 in surrounding regions. Reposition existing
caster OBS captures to the new source-guide coordinates after refreshing the
browser source; Live + Map capture positions do not change.
