/* PMGC stage gallery: builds the theme cards and the rundown list.
   Kept external because the platform serves pages under a strict
   Content-Security-Policy (script-src 'self', no inline scripts). */
(function () {
  'use strict';
  var THEMES = window.BROADCAST_THEMES.map(function (t) {
    return [t.id, t.name, t.description, t.accent, t.bg];
  });
  var SCENES = [
    ['opening', 'Stream starting soon', 'Ring countdown · 20:00'],
    ['casters', 'Caster intro', 'Two cams · hype line'],
    ['drop', 'Match drop', '30-second countdown'],
    ['map-intro', 'Map deployment', '8-second animated map intro · optional original audio'],
    ['live', 'Live + map', 'Staggered rectangular OBS frames'],
    ['live-points', 'Live points', 'Feed + points table'],
    ['chicken-dinner', 'Winner winner', 'Full-screen celebration'],
    ['winner-stats', 'Chicken dinner stats', 'Squad player cards'],
    ['match-standings', 'Match points', '16-row result table'],
    ['overall', 'Overall standings', 'Two tables · 01–16'],
    ['map-rotation', 'Map rotation', 'Erangel · Miramar · Rondo'],
    ['mvp', 'Match MVP', 'Hero spotlight · finishes and damage'],
    ['top-players', 'Top 5 players', 'Tournament eliminators · includes live match'],
    ['overall-mvp', 'Overall Top 5 MVP', 'BGIS reference · seeded stats and portraits']
  ];
  var themesHost = document.getElementById('themes');
  THEMES.forEach(function (t) {
    var card = document.createElement('a');
    card.className = 'theme-card';
    card.href = '/pmgc/casters?theme=' + t[0] + '&ui=1&guides=1';
    card.style.setProperty('--accent', t[3]);
    card.style.setProperty('--bg', t[4]);
    card.innerHTML =
      '<div class="swatch"><img src="/assets/images/broadcast-previews/' + t[0] + '.jpg" alt="' + t[1] + ' caster layout; checkerboard indicates OBS transparency" loading="lazy"></div>' +
      '<div class="theme-body"><h3>' + t[1] + '</h3><p>' + t[2] + '</p>' +
      '<div class="theme-acts"><span>' + t[0] + '</span><span>Open stage →</span></div></div>';
    themesHost.appendChild(card);
  });
  var rundownHost = document.getElementById('rundown');
  SCENES.forEach(function (s, i) {
    var a = document.createElement('a');
    a.className = 'step';
    a.href = '/pmgc/' + s[0] + '?theme=bmps-2024&ui=1';
    a.innerHTML = '<b>' + String(i + 1).padStart(2, '0') + '</b><strong>' + s[1] + '</strong><small>' + s[2] + '</small>';
    rundownHost.appendChild(a);
  });
})();
