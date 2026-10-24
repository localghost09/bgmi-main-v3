# Event-inspired broadcast package: references and provenance

The generic themes are original implementations, not official graphics/files.
The separately labeled operator-supplied reference scenes are traced recreations,
not official source packages. The ten theme names identify visual references;
they do not rename the user's actual tournament.

## Research inspected during implementation

Reference images were visually inspected, not merely their search titles.
Some search images were stage photos or article thumbnails rather than
scoreboards; those were used only for palette and visual language.

| Theme ID | Observed reference language | Published reference |
|---|---|---|
| `bmps-2024` | Green timing blocks, dark arena rails, squared Pro Series typography; stage photograph, not scoreboard specification | https://www.sportskeeda.com/bgmi/news-bmps-2024-grand-finals-day-1-overall-standings-highlights |
| `bgms-2024` | Amber/gold Masters arena, classical bracket framing; stage photograph | https://www.sportskeeda.com/bgmi/news-bgms-season-3-grand-finals-day-2-overall-standings-summary |
| `bgis-2025` | Blue field, yellow editorial tags, condensed headings; official-event thumbnail reproduced in reporting | https://www.indiatodaygaming.com/news/story/bgis-2025-semifinals-week-2-day-1-overall-standings-7953 |
| `bgis-2026` | Yellow/ink The Grind title board; caster-studio still, not a full finals CG spec | https://www.sportskeeda.com/bgmi/news-bgis-2026-the-grind-group-a-day-1-overall-standings-summary |
| `bmsd-2025` | Ivory paper, navy team cells, cyan dividers, paired eight-row tables | https://www.sportskeeda.com/bgmi/news-bgmi-showdown-bmsd-2025-winners-prize-pool-distribution-qualified-teams-bmic-pmgc |
| `bmsd-2026` | Dark telemetry canvas, lime rank tickets, purple blueprint lines, leader-stat ribbon | https://www.sportskeeda.com/bgmi/news-bmsd-2026-grand-finals-winner-prize-pool-distribution-mvp-qualified-teams-pmgc-bmic-2026 |
| `bmic-2025` | Blue/red cargo-container key art and international framing; promotional art, not scoreboard spec | https://insidesport.in/bgmi/bgmi-international-cup-2025-expands-broadcast-to-four-major-languages |
| `pmgc-2025` | Ivory/royal-blue/gold board, single 16-team column and leader spotlight | https://www.sportskeeda.com/esports/news-pmgc-2025-grand-finals-day-2-overall-standings-overview |
| `ewc-2025` | Violet/cyan tournament-panel split; secondary promotional thumbnail, not authoritative full broadcast spec | https://www.sportsdunia.com/gaming/bgmi-esports-world-cup-2025-grand-finals-day-1 |
| `ewc-2026` | Gold/black PMWC board and trophy spotlight; secondary published scoreboard, **not independently verified as the official EWC CG package** | https://joytify.com/blog/en-sg/fps-ewc-pubg-mobile-world-cup-2026 |

Geometry is an original broadcast adaptation. Studio cameras, drop-camera
positions, full-screen result hierarchy, and score-panel framing differ
between themes. Diagonal direction and points-board placement intentionally
remain fixed to satisfy the user's OBS production contract.

## Map provenance

Source: https://github.com/pubg/api-assets/tree/master/Assets/Maps

- `Erangel_Main_Low_Res.png` → `public/assets/images/pmgc/map-erangel.jpg`
- `Miramar_Main_Low_Res.png` → `public/assets/images/pmgc/map-miramar.jpg`
- `Rondo_Main_Low_Res.png` → `public/assets/images/pmgc/map-rondo.jpg`

Fetched via GitHub contents/blob API, decoded and resized to max 1400px,
JPEG quality 88. These are official **PUBG PC** map exports (not invented
maps and not claimed as mobile-specific versions). They replace the prior
generated images. Live tactical-map footage is supplied separately by OBS.
Publisher rights still apply; no claim that these map assets are CC0.

## Audio provenance

`public/assets/audio/deployment-original.wav` is an original 8-second
procedural instrumental sting: minor arpeggio and synthesized kick, no
third-party samples. Reproduce with `python3 scripts/generate_deployment_audio.py`.
Dedicated under CC0 1.0; see `public/assets/audio/LICENSE.txt`. This licence
applies to that original audio, not publisher art or event references.

## OBS integration

See `/broadcast-setup.html`. Camera and gameplay apertures are true alpha,
not black/chroma-key placeholders. Two downloadable masks separate OBS's
independent captures along the diagonal. Browser CSS cannot mask other OBS
sources, and the documentation explicitly says so.

## Player awards research — cutoff 24 October 2026

Scope: the Krafton **India/BGMI** circuit, not every Krafton-owned game or
PUBG PC tournament worldwide. Surveyed accessible 2025–2026 BGIS, BMPS,
BMSD and BMIC coverage. This does **not** establish that every official
broadcast frame from every event was available or inspected.

| Event | Reference / verification | Use / limitation |
| --- | --- | --- |
| BGIS 2025 | [Finals awards coverage, Krafton-credited images](https://gamingonphone.com/esports/battlegrounds-mobile-india-series-bgis-2025-grand-finals/) | MVP vs finals-MVP naming; existing blue/yellow identity. No pixel-exact player-frame claim. |
| BMPS 2025 | [Finals and MVP coverage, Krafton-credited images](https://gamingonphone.com/esports/battlegrounds-mobile-pro-series-bmps-2025-grand-finals/) | Separate individual spotlight from winning-squad statistics. Article inspected; awards images not individually inspected. |
| BMSD 2025 | [Tournament MVP graphic](https://sportsdunia.com/gaming/bgmi-bmsd-2025-grand-finals-day-2-points-table) | **Visually inspected**: ivory/navy/cyan header, large #1 portrait/vertical stats on left, four horizontal chaser rows on right. Main composition reference. |
| BMIC 2025 | [Player stats/awards](https://www.esportsverse.in/tournaments/bgmi/battlegrounds-mobile-india-international-cup-2025/schedule) | Data/category reference only, not verification of an exact broadcast layout. |
| BGIS 2026 | [Finals coverage](https://sportskeeda.com/bgmi/news-battlegrounds-mobile-india-series-bgis-2026-winners-mvp-fmvp-prize-pool-distribution-summary) | Inspected image was a team/studio celebration, not an MVP frame. Retains existing yellow/ink adaptation. |
| BMPS 2026 | [Player stats/awards](https://www.esportsverse.in/tournaments/bgmi/battlegrounds-mobile-india-pro-series-2026/stats) | Survey reference only. Search results conflicted about results; no winning player/result copied into the app. |
| BMSD 2026 | [Coverage and player leaderboard](https://www.talkesport.com/mobile-gaming/bgmi/bmsd-2026-top-fraggers-list-check-bmsd-top-players/) | Player leaderboard reference; uses the existing navy/lime chamfered theme. No exact MVP-frame verification. |
| BMIC 2026 | [Event preview](https://www.gamingamigos.com/post/bmic-2026-bgmi) | Preview/reference only as of cutoff. No final award graphic or winner claimed. |

Implementation is original and event-inspired, not an official package.
Outside explicitly labeled operator-supplied reference fixtures, player faces
and historic event scores are not imported. Neutral monogram/jersey placeholders
avoid misrepresenting another person's photo. The renderer accepts `avatarUrl`
when supplied, but the current public scoring payload does not provide player
portraits. No image-search thumbnails are shipped.

### Operator-supplied BGIS 2026 top-five MVP frame

After the research survey, the operator directly uploaded
`21f3d7ddba76476184c04431a89dbbbb_w1378_h720.png_q1.webp`. This exact frame was
visually inspected and used for the new `/pmgc/overall-mvp` seeded reference
scene: five vertical cards, #1 taller/yellow, four dark-purple stat panels,
clipped upper-left photo corners, gray name bands, purple grid backdrop,
centered TOURNAMENT MVP / BGIS 2026 heading and yellow corner tape.

The visible rows are transcribed into an isolated client-side fixture and the
portraits/event mark are cropped from the supplied image. This does not verify
that the screenshot represents final tournament results; the app labels it a
seeded reference snapshot, not live standings or a calculated official rating.
This supplied MVP frame supersedes the earlier BGIS 2026 limitation for this
specific composition only; it does not verify every 2026 broadcast package.

### Operator-supplied BGIS 2026 current-match frames

The operator separately supplied five native 1920×1080 screens for current-match
MVP, WWCD team stats, current-match Top 5, match-points standings, and map feed
with teams. Those screens were visually inspected and their geometry, player
photos, team marks, event mark and central map crop are used only in the BGIS
reference package under `public/assets/images/bgis-2026/`. The editable values
are isolated in `public/js/pmgc-bgis-reference.js`.

`reference=1` pins that snapshot; `preview=1` permits only its current-match
award fallback when live awards are absent. Neither mode writes to the database.
Normal live overlays do not load these teams or scores, and untracked live
metrics remain placeholders. The map still is limited to the explicit reference
preview; normal OBS keeps a transparent central aperture for its independent
map/video source. These supplied frames do not establish that their depicted
scores are official final results.
