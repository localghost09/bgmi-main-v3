/* PMGC stage gallery: builds the theme cards and the rundown list.
   Kept external because the platform serves pages under a strict
   Content-Security-Policy (script-src 'self', no inline scripts). */
(function () {
  'use strict';
  var THEMES = [
    ['krafton-gold', 'Krafton Gold', 'Championship black, antique gold, dust and laurels', '#e8c15c', '#050505'],
    ['pmgc-neon', 'PMGC Neon', 'Circuit grid, cyan and magenta, chromatic flicker', '#25f4ff', '#03040a'],
    ['red-zone', 'Red Zone', 'Crimson alert, hazard stripes, siren vignette', '#ff2f38', '#070203'],
    ['miramar-sand', 'Miramar Sand', 'Desert ochre, survey contours, heat shimmer', '#f0a24a', '#0d0906'],
    ['rondo-jade', 'Rondo Jade', 'Jade and ink, brush strokes, lantern glow', '#35e0a1', '#04100d'],
    ['vikendi-frost', 'Vikendi Frost', 'Glacier blue, frosted glass, snowfall crystals', '#8fd8ff', '#050b16'],
    ['livid-magenta', 'Livid Magenta', 'Hot magenta, brutalist offsets, pop blobs', '#ff3d8b', '#0a030d'],
    ['blackout-hud', 'Blackout HUD', 'Matte black, hairline rules, lime telemetry', '#c6ff3c', '#050606'],
    ['royal-chrome', 'Royal Chrome', 'Navy and chrome, polished sheen, crest lines', '#cdd8ea', '#04060f'],
    ['sunset-victory', 'Sunset Victory', 'Sunset gradient, sunburst, celebration confetti', '#ffc247', '#12040c']
  ];
  var SCENES = [
    ['opening', 'Stream starting soon', 'Ring countdown · 20:00'],
    ['casters', 'Caster intro', 'Two cams · hype line'],
    ['drop', 'Match drop', '30-second countdown'],
    ['live', 'Live + map', 'Diagonal split feeds'],
    ['live-points', 'Live points', 'Feed + points table'],
    ['chicken-dinner', 'Winner winner', 'Full-screen celebration'],
    ['winner-stats', 'Chicken dinner stats', 'Squad player cards'],
    ['match-standings', 'Match points', '16-row result table'],
    ['overall', 'Overall standings', 'Two tables · 01–16'],
    ['map-rotation', 'Map rotation', 'Erangel · Miramar · Rondo']
  ];
  var themesHost = document.getElementById('themes');
  THEMES.forEach(function (t) {
    var card = document.createElement('a');
    card.className = 'theme-card';
    card.href = '/pmgc/opening?theme=' + t[0] + '&ui=1';
    card.style.setProperty('--accent', t[3]);
    card.style.setProperty('--bg', t[4]);
    card.innerHTML =
      '<div class="swatch"><b>' + t[1].split(' ')[0] + '</b></div>' +
      '<div class="theme-body"><h3>' + t[1] + '</h3><p>' + t[2] + '</p>' +
      '<div class="theme-acts"><span>' + t[0] + '</span><span>Open stage →</span></div></div>';
    themesHost.appendChild(card);
  });
  var rundownHost = document.getElementById('rundown');
  SCENES.forEach(function (s, i) {
    var a = document.createElement('a');
    a.className = 'step';
    a.href = '/pmgc/' + s[0] + '?theme=krafton-gold&ui=1';
    a.innerHTML = '<b>' + String(i + 1).padStart(2, '0') + '</b><strong>' + s[1] + '</strong><small>' + s[2] + '</small>';
    rundownHost.appendChild(a);
  });
})();
