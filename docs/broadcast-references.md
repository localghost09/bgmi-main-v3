# Event-inspired broadcast package: references and provenance

These are original implementations, not official or pixel-exact packages.
The ten names identify visual references; they do not rename the user's
actual tournament. Do not call them official graphics/files.

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
