/* ============================================================================
   PMGC 2026 — BROADCAST STAGE CONTROLLER
   Sixteen-scene rundown, ten themes, live demo simulation and optional live data.

   URL options (every one is optional):
     ?scene=live            pin a scene (opening … map-rotation)
     ?theme=krafton-gold    pin a theme (see THEMES below)
     ?ui=0                  hide the operator bar (OBS)
     ?obs=1                 transparent body + no UI (OBS browser source)
     ?auto=1                start the full show automatically
     ?feed=<url>            real gameplay capture / video still
     ?map=<url>             override the tactical map imagery
     ?start=1200            stream-start countdown length in seconds
     ?demo=0                ignore the built-in showcase data
   Live tournament data is pulled from /api/live/state when it has squads and
   streamed over Socket.IO; otherwise the built-in showcase roster is used so
   the stage always has something on screen.
   ============================================================================ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var root = $('pmgc');
  if (!root) return;

  var params = new URLSearchParams(location.search);
  var referenceMode = params.get('reference') === '1';
  if (referenceMode) root.setAttribute('data-reference', 'true');
  var programMode = /\/pmgc\/program\/?$/.test(location.pathname);
  var programRevision = null;
  if (programMode) root.style.opacity = '0';
  var flag = function (name, fallback) {
    var v = params.get(name);
    if (v === null) return fallback;
    return !(v === '0' || v === 'false' || v === 'off' || v === 'no');
  };

  /* ------------------------------------------------------------- constants */
  var THEMES = window.BROADCAST_THEMES.map(function (t, i) {
    return Object.assign({}, t, {name: String(i + 1).padStart(2, '0') + ' · ' + t.name});
  });
  function canonicalTheme(id) {
    var t = window.BROADCAST_THEMES.find(function (t) { return t.id === id || t.legacy === id; });
    return t ? t.id : id;
  }
  var THEME_IDS = THEMES.map(function (t) { return t.id; });

  var SCENES = [
    { id: 'opening', label: '01 Stream', ms: 22000, word: 'WE GO LIVE' },
    { id: 'casters', label: '02 Casters', ms: 15000, word: 'CASTERS' },
    { id: 'drop', label: '03 Match Drop', ms: 30000, word: 'DROP IN' },
    { id: 'map-intro', label: 'Map intro', ms: 8000, word: 'DEPLOYMENT' },
    { id: 'bgis-lower-third', label: 'BGIS lower third', ms: 20000, word: 'GRAND FINALS' },
    { id: 'live', label: '04 Live + Map', ms: 24000, word: 'MATCH LIVE' },
    { id: 'map-feed', label: 'Map Feed + Teams', ms: 24000, word: 'TACTICAL MAP' },
    { id: 'live-points', label: '05 Live Points', ms: 20000, word: 'POINTS' },
    { id: 'chicken-dinner', label: '06 Chicken Dinner', ms: 15000, word: 'CHICKEN DINNER' },
    { id: 'winner-stats', label: '07 Winner Stats', ms: 16000, word: 'MATCH STATS' },
    { id: 'match-standings', label: '08 Match Points', ms: 18000, word: 'MATCH POINTS' },
    { id: 'overall', label: '09 Overall', ms: 20000, word: 'OVERALL' },
    { id: 'map-rotation', label: '10 Map Rotation', ms: 18000, word: 'MAP POOL' },
    { id: 'mvp', label: '11 MVP', ms: 16000, word: 'MOST VALUABLE PLAYER' },
    { id: 'top-players', label: '12 Top 5 Players', ms: 18000, word: 'TOP 5 PLAYERS' },
    { id: 'overall-mvp', label: '13 Overall Top 5 MVP', ms: 20000, word: 'TOURNAMENT MVP' }
  ];
  var SCENE_IDS = SCENES.map(function (s) { return s.id; });
  var SCENE_WORDS = {};
  SCENES.forEach(function (s) { SCENE_WORDS[s.id] = s.word; });

  var PLACEMENT_POINTS = [10, 6, 5, 4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0];

  var MAP_ART = {
    erangel: '/assets/images/pmgc/map-erangel.jpg',
    miramar: '/assets/images/pmgc/map-miramar.jpg',
    rondo: '/assets/images/pmgc/map-rondo.jpg',
    sanhok: '/assets/images/pmgc/map-rondo.jpg',
    livik: '/assets/images/pmgc/map-erangel.jpg',
    vikendi: '/assets/images/pmgc/map-erangel.jpg'
  };
  var MAP_NOTES = {
    erangel: 'MILITARY BASE → GEORGOPOL → PRISON',
    miramar: 'HACIENDA → PECADO → EL POZO',
    rondo: 'LAKE CITY → PAGODA RIDGE → DELTA DOCKS'
  };

  /* ----------------------------------------------------- showcase roster */
  var DEMO_ORDER = [
    ['VYRAL ESPORTS', 'VYR', 3, 96, 58, 14],
    ['ORBITAL GAMING', 'ORB', 1, 88, 52, 9],
    ['IRONFANG', 'IRN', 1, 84, 49, 7],
    ['PHANTOM X', 'PHX', 1, 78, 46, 11],
    ['RAVENOUS', 'RVN', 1, 76, 44, 5],
    ['TITAN CORE', 'TTC', 0, 70, 41, 6],
    ['NEON WOLVES', 'NW', 0, 66, 39, 3],
    ['ZENITH ESPORTS', 'ZEN', 0, 62, 37, 4],
    ['CRIMSON EDGE', 'CRE', 1, 60, 36, 8],
    ['HALO SQUAD', 'HAL', 0, 54, 32, 2],
    ['VANTAGE', 'VNT', 0, 50, 30, 5],
    ['AEGIS', 'AEG', 0, 46, 28, 1],
    ['STORM RYDER', 'SRD', 0, 42, 26, 4],
    ['NOCTURNE', 'NOC', 0, 36, 22, 2],
    ['ECLIPSE', 'ECL', 0, 30, 18, 1],
    ['BLAZE UNIT', 'BLZ', 0, 24, 14, 0]
  ];
  var WINNER_ROSTER = [
    ['VOLT', 'ASSAULT', 5, 1120],
    ['KAIRO', 'FLEX', 4, 980],
    ['RIFT', 'SNIPER', 3, 745],
    ['SHADOW', 'SUPPORT', 2, 612]
  ];
  var pathScene = (function () {
    var seg = (location.pathname.split('/').filter(Boolean).pop() || '').toLowerCase();
    return SCENE_IDS.indexOf(seg) >= 0 ? seg : '';
  })();
  var DEMO_KILLS = [
    ['VOLT', 'NEON WOLVES', 'RONIN', 'M416'],
    ['KAIRO', 'TITAN CORE', 'VEX', 'AKM'],
    ['SHADOW', 'ECLIPSE', 'DRIFT', 'M24'],
    ['RIFT', 'HALO SQUAD', 'ORION', 'Beryl'],
    ['VOLT', 'BLAZE UNIT', 'FURY', 'M416'],
    ['KAIRO', 'STORM RYDER', 'GALE', 'UMP45']
  ];

  /* -------------------------------------------------------------- helpers */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function initials(name) {
    return String(name || '?').trim().split(/\s+/).slice(0, 2)
      .map(function (w) { return w[0] || ''; }).join('').toUpperCase() || '?';
  }
  function money(n) { return Number(n || 0).toLocaleString('en-US'); }

  /* --------------------------------------------------------- stage model */
  var state = {
    scene: SCENE_IDS.indexOf(params.get('scene')) >= 0 ? params.get('scene')
      : pathScene || 'opening',
    theme: THEME_IDS.indexOf((params.get('theme') || '').toLowerCase()) >= 0
      ? (params.get('theme') || '').toLowerCase() : 'bmps-2024',
    auto: flag('auto', false),
    ui: flag('ui', true) && !flag('obs', false),
    useDemo: flag('demo', true),
    data: null,
    sceneTimer: null,
    sceneStart: 0,
    secondsLeft: 0,
    openingEnds: 0,
    openingTotal: 0,
    dropLeft: 30,
    alive: 64,
    ticks: { live: null, drop: null, opening: null, sim: null }
  };
  if (!state.ui) document.body.classList.add('is-obs');
  if (flag('obs', false) || params.get('bg') === 'transparent') {
    document.body.classList.add('is-obs');
  }

  /* ------------------------------------------------------------ showcase */
  function buildDemo() {
    if (referenceMode && window.BGIS_MATCH_REFERENCE) {
      return JSON.parse(JSON.stringify(window.BGIS_MATCH_REFERENCE));
    }
    var teams = DEMO_ORDER.map(function (row, i) {
      var name = row[0], tag = row[1], wins = row[2], priorPts = row[3];
      var priorFin = row[4], matchKills = row[5];
      var placePts = PLACEMENT_POINTS[i] || 0;
      return {
        id: i + 1,
        name: name,
        tag: tag,
        group: 'A',
        logo: '',
        wins: wins,
        matches: 4,
        fin: priorFin + matchKills,
        place: priorPts + placePts,
        total: priorPts + placePts + matchKills,
        matchKills: matchKills,
        matchPlace: i + 1,
        matchPlacePts: placePts,
        matchTotal: placePts + matchKills,
        alive: i > 11 ? 0 : i > 8 ? 2 : i > 5 ? 3 : 4
      };
    });
    var winner = teams[0];
    return {
      demo: true,
      event: 'PMGC 2026',
      organizer: 'KRAFTON INDIA ESPORTS',
      stage: 'GROUP STAGE · DAY 02',
      group: 'A',
      match: 4,
      map: 'Erangel',
      matchesTotal: 6,
      squads: teams.length,
      prize: '₹ 10,00,000 PRIZE POOL',
      teams: teams,
      winner: {
        name: winner.name, tag: winner.tag, logo: '',
        kills: winner.matchKills, place: 1, total: winner.matchTotal,
        wwcd: winner.wins, damage: 3457,
        players: WINNER_ROSTER.map(function (p, i) {
          return { name: p[0], role: p[1], kills: p[2], damage: p[3], no: i + 1 };
        })
      },
      killFeed: DEMO_KILLS.map(function (k) {
        return { killer: k[0], team: k[1], victim: k[2], weapon: k[3] };
      })
    };
  }

  /* Map live tournament data (if any) onto the stage model. */
  function fromLive(payload, fallback) {
    if (!payload || !Array.isArray(payload.teams) || payload.teams.length < 4) {
      return fallback;
    }
    var teams = payload.teams.map(function (t, i) {
      var placePts = Number(t.overallPlacementPoints) || 0;
      var fin = Number(t.overallFinishes) || 0;
      var total = Number(t.overallPoints) || (placePts + fin);
      return {
        id: Number(t.id) || i + 1,
        name: String(t.teamName || t.name || 'SQUAD ' + (i + 1)),
        tag: String(t.teamTag || t.tag || '').trim() || initials(t.teamName || t.name),
        broadcastTag: String(t.teamTag || t.tag || '').trim(),
        group: String(t.group || 'A'),
        logo: String(t.logo || ''),
        wins: Number(t.overallWins) || 0,
        matches: Number(t.overallMatches) || 0,
        fin: fin,
        place: placePts,
        total: total,
        matchKills: Number(t.kills) || 0,
        matchPlace: Number(t.placement) || 0,
        matchPlacePts: Math.max(0, (Number(t.matchPoints) || 0) - (Number(t.kills) || 0)),
        matchTotal: Number(t.matchPoints) || 0,
        damage: Number(t.damage) || (t.players || []).reduce(function (sum, p) { return sum + (Number(p.damage) || 0); }, 0),
        heals: t.heals == null ? null : Number(t.heals),
        knocks: t.knocks == null ? null : Number(t.knocks),
        headshots: t.headshots == null ? null : Number(t.headshots),
        alive: (t.players || []).filter(function (p) { return (p.status || 'alive') === 'alive'; }).length,
        players: t.players || []
      };
    }).sort(function (a, b) { return b.total - a.total || b.fin - a.fin; });

    var latest = null;
    var history = payload.matchHistory || [];
    for (var i = history.length - 1; i >= 0; i -= 1) {
      latest = history[i];
      break;
    }
    var winnerRow = teams.filter(function (t) { return t.matchPlace === 1; })[0];
    if (!winnerRow && latest && latest.results) {
      var res = latest.results.filter(function (r) { return Number(r.placement) === 1; })[0];
      if (res) winnerRow = teams.filter(function (t) { return t.name === res.teamName; })[0];
    }
    if (!winnerRow) winnerRow = teams[0];

    var players = (winnerRow.players && winnerRow.players.length
      ? winnerRow.players
      : []).map(function (p, idx) {
      return {
        name: p.name || 'PLAYER ' + (idx + 1),
        role: idx === 0 ? 'ASSAULT' : idx === 1 ? 'FLEX' : idx === 2 ? 'SNIPER' : 'SUPPORT',
        kills: Number(p.kills) || 0,
        damage: Number(p.damage) || 0,
        survival: p.survival || p.survivalTime || '',
        knocks: p.knocks == null ? null : Number(p.knocks),
        no: idx + 1,
        avatarUrl: p.avatarUrl || ''
      };
    }).slice(0, 4);

    return {
      demo: false,
      event: payload.tournamentName || fallback.event,
      organizer: payload.organizer || fallback.organizer,
      stage: fallback.stage,
      group: payload.currentGroup || 'A',
      match: Number(payload.currentMatch) || 1,
      map: payload.currentMap || 'Erangel',
      matchesTotal: 6,
      squads: teams.length,
      prize: fallback.prize,
      teams: teams,
      winner: {
        name: winnerRow.name, tag: winnerRow.tag, logo: winnerRow.logo,
        kills: winnerRow.matchKills, place: 1,
        total: winnerRow.matchTotal || winnerRow.total,
        wwcd: winnerRow.wins,
        damage: winnerRow.damage || players.reduce(function (s, p) { return s + p.damage; }, 0),
        heals: winnerRow.heals,
        knocks: winnerRow.knocks,
        headshots: winnerRow.headshots,
        lineupUrl: winnerRow.lineupUrl || '',
        players: players.length ? players : fallback.winner.players
      },
      killFeed: fallback.killFeed
    };
  }

  var demoData = buildDemo();
  state.data = demoData;

  /* ------------------------------------------------------------- scaling */
  function fitStage() {
    var w = window.innerWidth, h = window.innerHeight;
    var scale = Math.min(w / 1920, h / 1080);
    document.documentElement.style.setProperty('--pg-fit', scale.toFixed(4));
  }
  window.addEventListener('resize', fitStage);
  fitStage();

  /* ---------------------------------------------------------------- theme */
  function setTheme(id, opts) {
    id = canonicalTheme(id);
    if (THEME_IDS.indexOf(id) < 0) return;
    state.theme = id;
    root.setAttribute('data-theme', id);
    updateSourceGuide();
    var theme = THEMES.filter(function (t) { return t.id === id; })[0];
    document.documentElement.style.setProperty('--ui-accent', theme.accent);
    if ($('pgUiTheme')) $('pgUiTheme').value = id;
    if (!opts || opts.persist !== false) {
      try { localStorage.setItem('pmgc.theme', id); } catch (e) { /* private mode */ }
    }
    var url = new URL(location.href);
    if (!programMode && url.searchParams.get('theme') !== id) {
      url.searchParams.set('theme', id);
      history.replaceState(null, '', url.toString());
    }
  }

  /* ---------------------------------------------------------------- scene */
  var activeSceneEl = function () {
    return root.querySelector('.pg-scene[data-scene="' + state.scene + '"]');
  };

  function playWipe(word) {
    var wipe = $('pgWipe');
    var label = $('pgWipeLabel');
    if (!wipe || !label) return;
    label.textContent = word || 'NEXT';
    wipe.classList.remove('is-on');
    void wipe.offsetWidth;
    wipe.classList.add('is-on');
    window.clearTimeout(playWipe.t);
    playWipe.t = window.setTimeout(function () {
      wipe.classList.remove('is-on');
    }, 1000);
  }

  function setScene(id, opts) {
    opts = opts || {};
    if (SCENE_IDS.indexOf(id) < 0) return;
    var same = id === state.scene;
    if (!same) {
      state.scene = id;
      root.setAttribute('data-scene', id);
      var nodes = root.querySelectorAll('.pg-scene');
      for (var i = 0; i < nodes.length; i += 1) {
        nodes[i].classList.toggle('is-active', nodes[i].getAttribute('data-scene') === id);
      }
      if (opts.wipe !== false) playWipe(SCENE_WORDS[id]);
      var url = new URL(location.href);
      if (!programMode && url.searchParams.get('scene') !== id) {
        url.searchParams.set('scene', id);
        history.replaceState(null, '', url.toString());
      }
    } else {
      replayScene();
    }
    syncSceneButtons();
    onSceneEnter(id, same);
    updateSourceGuide();
    if (state.auto) scheduleAuto();
  }

  function replayScene() {
    var node = activeSceneEl();
    if (!node) return;
    node.classList.remove('is-active');
    void node.offsetWidth;
    node.classList.add('is-active');
    onSceneEnter(state.scene, true);
  }

  function syncSceneButtons() {
    if (!state.ui) return;
    var buttons = document.querySelectorAll('#pgUiScenes button');
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].classList.toggle('is-on', buttons[i].getAttribute('data-scene') === state.scene);
    }
  }

  /* ------------------------------------------------------------ countdowns */
  function startOpeningClock() {
    clearInterval(state.ticks.opening);
    var total = params.has('start')
      ? Math.max(1, Number(params.get('start')) || 1200)
      : (state.streamStartSeconds || 1200);
    state.openingTotal = total;
    state.openingEnds = Date.now() + total * 1000;
    tickOpening();
    state.ticks.opening = setInterval(tickOpening, 250);
  }

  function tickOpening() {
    var remain = Math.max(0, Math.round((state.openingEnds - Date.now()) / 1000));
    var clock = $('openClock');
    if (!clock) return;
    var mins = Math.floor(remain / 60);
    var secs = remain % 60;
    clock.textContent = pad(mins) + ':' + pad(secs);
    clock.classList.toggle('is-final', remain <= 60);
    var ring = $('openRing');
    if (ring) {
      var c = 2 * Math.PI * 104;
      ring.style.strokeDasharray = c.toFixed(1);
      ring.style.strokeDashoffset = (c * (1 - remain / state.openingTotal)).toFixed(1);
    }
    var phase = $('openPhase');
    if (phase) phase.textContent = remain > 300 ? 'PRE-SHOW' : remain > 60 ? 'SHOW OPEN' : 'GOING LIVE';
    var ticks = $('openTicks');
    if (ticks) {
      var seg = ticks.children.length || 20;
      var lit = Math.ceil((1 - remain / state.openingTotal) * seg);
      for (var i = 0; i < ticks.children.length; i += 1) {
        ticks.children[i].classList.toggle('on', i < lit);
      }
    }
    if (remain === 0) {
      clearInterval(state.ticks.opening);
      if (state.auto) setScene('casters');
    }
  }

  function startDropClock() {
    clearInterval(state.ticks.drop);
    state.dropLeft = 30;
    var ring = $('dropRing');
    var c = 2 * Math.PI * 160;
    if (ring) {
      ring.style.strokeDasharray = c.toFixed(1);
      ring.style.strokeDashoffset = '0';
    }
    tickDrop();
    state.ticks.drop = setInterval(tickDrop, 250);
  }

  function tickDrop() {
    var secEl = $('dropSec');
    if (!secEl) return;
    var remain = Math.max(0, Math.ceil((state.dropEnds - Date.now()) / 1000));
    if (remain !== state.dropLeft) {
      state.dropLeft = remain;
      secEl.textContent = String(remain).padStart(2, '0');
      secEl.classList.remove('tick');
      void secEl.offsetWidth;
      secEl.classList.add('tick');
    }
    var final = remain <= 5;
    secEl.classList.toggle('is-final', final);
    var ring = $('dropRing');
    if (ring) {
      var c = 2 * Math.PI * 160;
      ring.style.strokeDashoffset = (c * (1 - remain / 30)).toFixed(1);
      ring.classList.toggle('is-final', final);
    }
    var alert = $('dropAlert');
    if (alert) {
      alert.textContent = remain === 0 ? 'DROP NOW' : final ? 'STAND BY' : 'GET READY';
    }
    var hype = $('dropHype');
    if (hype) {
      hype.textContent = remain === 0
        ? 'GO GO GO — THE DROP IS LIVE!'
        : final
          ? 'LOCK IT IN. FIVE SECONDS TO DROP.'
          : 'LOCK IN. DROP IN. DOMINATE.';
    }
    if (remain === 0) {
      clearInterval(state.ticks.drop);
      root.classList.add('is-drop-live');
      window.setTimeout(function () {
        if (state.scene === 'drop') setScene('map-intro');
      }, 900);
    }
  }

  /* ------------------------------------------------------------ tickers */
  function tickerItems() {
    var d = state.data;
    var items = [
      '<b>' + d.event.toUpperCase() + '</b> · ' + d.stage,
      'MATCH ' + pad(d.match) + ' · <b>' + String(d.map).toUpperCase() + '</b> · GROUP ' + d.group,
      d.squads + ' SQUADS · SQUAD TPP',
      '<b>TOP 8</b> QUALIFY FOR THE GRAND FINAL',
      d.prize,
      'NEXT DROP · <b>MIRAMAR</b>',
      'EVERY FINISH COUNTS · EVERY POINT MATTERS',
      'FOLLOW THE SERIES · <b>' + d.event.toUpperCase() + '</b>'
    ];
    return items;
  }

  function renderTickers() {
    var runs = root.querySelectorAll('[data-ticker-run]');
    var items = tickerItems();
    var html = items.concat(items).map(function (item) {
      return '<span>' + item + '</span><i></i>';
    }).join('');
    for (var i = 0; i < runs.length; i += 1) runs[i].innerHTML = html;
  }

  /* ------------------------------------------------------------- tables */
  function teamCell(team, sublabel) {
    var cell = el('span', 'name');
    var logo = el('span', 'logo');
    if (team.logo) {
      var img = document.createElement('img');
      img.src = team.logo;
      img.alt = '';
      img.onerror = function () { logo.textContent = team.tag || initials(team.name); };
      logo.appendChild(img);
    } else {
      logo.textContent = team.tag || initials(team.name);
    }
    var copy = el('span', 'copy');
    copy.appendChild(el('span', 'team', team.name));
    if (sublabel) copy.appendChild(el('small', null, sublabel));
    cell.appendChild(logo);
    cell.appendChild(copy);
    return cell;
  }

  function setLogo(node, logo, name, tag) {
    node.replaceChildren();
    if (logo) {
      var img = document.createElement('img');
      img.src = logo;
      img.alt = name + ' logo';
      img.onerror = function () {
        node.replaceChildren(document.createTextNode(tag || initials(name)));
      };
      node.appendChild(img);
    } else {
      node.textContent = tag || initials(name);
    }
  }

  /* live rail on the diagonal scene */
  function renderLiveRail() {
    var host = $('liveRail');
    if (!host) return;
    host.replaceChildren();
    var teams = state.data.teams.slice().sort(function (a, b) {
      return (b.matchTotal || 0) - (a.matchTotal || 0) || (b.matchKills || 0) - (a.matchKills || 0);
    }).slice(0, 16);
    var max = Math.max.apply(null, teams.map(function (t) { return t.matchTotal || 0; }).concat([1]));
    teams.forEach(function (team, i) {
      var row = el('div', 'pg-live-row');
      row.style.setProperty('--i', i);
      row.setAttribute('data-id', team.id);
      row.classList.toggle('is-first', i === 0);
      if (i < 3) row.classList.add('is-top');
      row.appendChild(el('span', 'rank', pad(i + 1)));
      var logo = el('span', 'logo');
      setLogo(logo, team.logo, team.name, team.tag);
      row.appendChild(logo);
      row.appendChild(el('span', 'name', team.name));
      row.appendChild(el('span', 'fin', team.matchKills));
      var pts = el('span', 'pts', team.matchTotal || 0);
      row.appendChild(pts);
      row.style.setProperty('--w', Math.round(((team.matchTotal || 0) / max) * 100) + '%');
      host.appendChild(row);
    });
    host.classList.remove('is-settled');
    window.clearTimeout(host._settle);
    host._settle = window.setTimeout(function () { host.classList.add('is-settled'); }, 1500);
    var foot = $('liveRailFoot');
    if (foot) foot.textContent = 'MATCH ' + pad(state.data.match);
    var grp = $('liveRailGroup');
    if (grp) grp.textContent = 'GROUP ' + state.data.group;
  }

  function updateLiveRail() {
    var host = $('liveRail');
    if (!host) return;
    var teams = state.data.teams.slice().sort(function (a, b) {
      return (b.matchTotal || 0) - (a.matchTotal || 0) || (b.matchKills || 0) - (a.matchKills || 0);
    });
    teams.forEach(function (team, i) {
      var row = host.querySelector('[data-id="' + team.id + '"]');
      if (!row) return;
      var rank = row.querySelector('.rank');
      var fin = row.querySelector('.fin');
      var pts = row.querySelector('.pts');
      if (rank) rank.textContent = pad(i + 1);
      if (fin) fin.textContent = team.matchKills;
      if (pts) pts.textContent = team.matchTotal;
      row.classList.toggle('is-first', i === 0);
      // flex `order` reorders without detaching the node, so the one-time
      // entrance animation never restarts while the match is running.
      row.style.order = String(i);
    });
  }

  /* live points board (livestream + table scene) */
  function fillPlayerStatus(host, team) {
    host.replaceChildren();
    for (var p = 0; p < 4; p += 1) {
      var player = (team.players || [])[p];
      var status = player ? player.status : (p < (team.alive == null ? 4 : team.alive) ? 'alive' : 'out');
      var pip = el('i', status === 'knocked' ? 'knocked' : status === 'alive' ? 'alive' : 'out');
      pip.title = (player && player.name ? player.name + ': ' : '') + status;
      host.appendChild(pip);
    }
  }

  function teamFullyEliminated(team) {
    var players = Array.isArray(team.players) ? team.players : [];
    if (players.length) return players.every(function (player) {
      var status = String(player.status || '').toLowerCase();
      return status === 'out' || status === 'eliminated' || status === 'dead';
    });
    return Number(team.alive) === 0;
  }

  function renderLivePoints() {
    var host = $('livePtsRows');
    if (!host) return;
    host.replaceChildren();
    var teams = state.data.teams.slice().sort(function (a, b) {
      return (b.matchTotal || 0) - (a.matchTotal || 0) || (b.matchKills || 0) - (a.matchKills || 0);
    });
    teams.forEach(function (team, i) {
      var row = el('div', 'pg-row');
      row.style.setProperty('--i', i);
      row.setAttribute('data-id', team.id);
      row.classList.toggle('is-first', i === 0);
      row.classList.toggle('is-eliminated', teamFullyEliminated(team));
      if (i < 8) row.classList.add('is-top');
      row.appendChild(el('span', 'rank', pad(i + 1)));
      var tag = team.broadcastTag || team.tag || team.name;
      var compact = Object.assign({}, team, {name: Array.from(String(tag).toUpperCase()).slice(0, 6).join('')});
      var label = teamCell(compact, '');
      label.title = team.name || tag;
      row.appendChild(label);
      row.appendChild(el('span', 'num matches', team.matches || 0));
      row.appendChild(el('span', 'num fin', team.matchKills));
      row.appendChild(el('span', 'num pts', team.matchTotal));
      var alive = el('span', 'pg-alive');
      fillPlayerStatus(alive, team);
      row.appendChild(alive);
      host.appendChild(row);
      row.style.order = String(i);
    });
    var foot = $('livePtsFoot');
    if (foot) foot.textContent = teams.length + ' SQUADS';
    var meta = $('livePtsMeta');
    if (meta) {
      meta.textContent = 'MATCH ' + pad(state.data.match) + ' · ' +
        String(state.data.map).toUpperCase() + ' · GROUP ' + state.data.group;
    }
  }

  function updateLivePointsValues() {
    var host = $('livePtsRows');
    if (!host) return;
    var teams = state.data.teams.slice().sort(function (a, b) {
      return (b.matchTotal || 0) - (a.matchTotal || 0) || (b.matchKills || 0) - (a.matchKills || 0);
    });
    teams.forEach(function (team, i) {
      var row = host.querySelector('[data-id="' + team.id + '"]');
      if (!row) return;
      var rank = row.querySelector('.rank');
      var fin = row.querySelector('.num.fin');
      var matches = row.querySelector('.num.matches');
      if (matches) matches.textContent = team.matches || 0;
      var pts = row.querySelector('.num.pts');
      if (rank) rank.textContent = pad(i + 1);
      if (fin) fin.textContent = team.matchKills;
      if (pts) pts.textContent = team.matchTotal;
      row.classList.toggle('is-first', i === 0);
      row.classList.toggle('is-eliminated', teamFullyEliminated(team));
      fillPlayerStatus(row.querySelector('.pg-alive'), team);
      row.style.order = String(i);
    });
  }

  /* Current-match points: two five-column tables and a leader stat banner. */
  function renderMatchStandings() {
    var left = $('msLeft');
    var right = $('msRight');
    if (!left || !right) return;
    left.replaceChildren();
    right.replaceChildren();
    var teams = state.data.teams.slice().sort(function (a, b) {
      return (b.matchTotal || 0) - (a.matchTotal || 0) ||
        (a.matchPlace || 99) - (b.matchPlace || 99) ||
        (b.matchKills || 0) - (a.matchKills || 0);
    });
    teams.slice(0, 16).forEach(function (team, i) {
      var row = el('div', 'pg-row');
      row.style.setProperty('--i', i % 8);
      row.classList.toggle('is-first', i === 0);
      row.appendChild(el('span', 'rank', pad(i + 1)));
      var identity = el('div', 'pg-ref-standing-team');
      var logo = el('span', 'pg-ref-standing-logo');
      setLogo(logo, team.logo, team.shortName || team.name, team.tag);
      identity.appendChild(logo);
      identity.appendChild(el('b', null, team.shortName || team.broadcastTag || team.tag || team.name));
      if (team.matchPlace === 1) {
        var wwcd = el('img', 'pg-ref-wwcd');
        wwcd.src = '/assets/images/bgis-2026/teams/wwcd.png';
        wwcd.alt = 'WWCD';
        identity.appendChild(wwcd);
      }
      row.appendChild(identity);
      row.appendChild(el('span', 'num', team.matchPlacePts));
      row.appendChild(el('span', 'num', team.matchKills));
      row.appendChild(el('span', 'num pts', team.matchTotal));
      (i < 8 ? left : right).appendChild(row);
    });
    var p = state.data;
    var leader = teams[0] || p.winner || {};
    var winner = p.winner || {};
    var dash = function (value) { return value == null || value === '' ? '—' : String(Number(value)); };
    if ($('msMatch')) $('msMatch').textContent = 'MATCH ' + Number(p.match || 1);
    if ($('msLeaderLogo')) setLogo($('msLeaderLogo'), leader.mapLogo || winner.mapLogo || leader.logo || winner.logo, leader.shortName || leader.name || 'WINNER', leader.tag);
    if ($('msLeaderDamage')) $('msLeaderDamage').textContent = dash(winner.damage != null ? winner.damage : leader.damage);
    if ($('msLeaderHeals')) $('msLeaderHeals').textContent = dash(winner.heals != null ? winner.heals : leader.heals);
    if ($('msLeaderKnocks')) $('msLeaderKnocks').textContent = dash(winner.knocks != null ? winner.knocks : leader.knocks);
    if ($('msLeaderHeadshots')) $('msLeaderHeadshots').textContent = dash(winner.headshots != null ? winner.headshots : leader.headshots);
    var lineup = $('msLeaderLineup');
    if (lineup) {
      var lineupUrl = winner.lineupUrl || leader.lineupUrl || '';
      lineup.classList.toggle('hidden', !lineupUrl);
      if (lineupUrl) lineup.src = lineupUrl; else lineup.removeAttribute('src');
    }
  }

  /* overall standings, split 01–08 / 09–16 */
  function renderOverall() {
    var left = $('ovLeft');
    var right = $('ovRight');
    if (!left || !right) return;
    left.replaceChildren();
    right.replaceChildren();
    var teams = state.data.teams.slice().sort(function (a, b) {
      return (b.total || 0) - (a.total || 0) || (b.fin || 0) - (a.fin || 0);
    });
    var max = Math.max.apply(null, teams.map(function (t) { return t.total || 0; }).concat([1]));
    teams.forEach(function (team, i) {
      var host = i < 8 ? left : right;
      var row = el('div', 'pg-row');
      row.style.setProperty('--i', i % 8);
      row.classList.toggle('is-first', i === 0);
      row.classList.toggle('is-qualified', i < 8);
      row.appendChild(el('span', 'rank', pad(i + 1)));
      row.appendChild(teamCell(team, 'GROUP ' + team.group));
      // matches played sits beside the team so a squad on zero matches reads
      // instantly next to its points (0/0/0) instead of being implied.
      var played = Number(team.matches) || 0;
      row.appendChild(el('span', 'num played', pad(played)));
      row.appendChild(el('span', 'num win-count', pad(team.wins || 0)));
      row.appendChild(el('span', 'num', team.fin || 0));
      row.appendChild(el('span', 'num', team.place || 0));
      row.appendChild(el('span', 'num pts', team.total || 0));
      var bar = el('span', 'bar');
      bar.style.setProperty('--w', Math.round(((team.total || 0) / max) * 100) + '%');
      row.appendChild(bar);
      host.appendChild(row);
    });
    var p = state.data;
    // "matches played" in the summary must agree with the per-row column: the
    // deepest squad's played count, not the current match number.
    var playedMax = teams.reduce(function (max, team) {
      return Math.max(max, Number(team.matches) || 0);
    }, 0);
    if ($('ovKicker')) {
      $('ovKicker').textContent = 'AFTER MATCH ' + pad(p.match) + ' · GROUP ' + p.group;
    }
    if ($('ovMatches')) $('ovMatches').textContent = pad(playedMax);
    if ($('ovTeams')) $('ovTeams').textContent = teams.length;
    if ($('ovLeader')) $('ovLeader').textContent = teams.length ? teams[0].name : '—';
  }

  /* chicken dinner */
  function renderChickenDinner() {
    var w = state.data.winner;
    if (!w) return;
    var p = state.data;
    if ($('cdMatchMeta')) {
      $('cdMatchMeta').textContent = 'MATCH ' + pad(p.match) + ' · ' +
        String(p.map).toUpperCase() + ' · GROUP ' + p.group;
    }
    if ($('cdTeam')) $('cdTeam').textContent = w.name;
    if ($('cdFin')) $('cdFin').textContent = w.kills;
    if ($('cdRank')) $('cdRank').textContent = '#' + (w.place || 1);
    if ($('cdPts')) $('cdPts').textContent = w.total;
    if ($('cdTeamMeta')) {
      $('cdTeamMeta').textContent = 'SQUAD VICTORY · CHICKEN DINNER #' + pad(w.wwcd || 1) +
        ' · ' + (w.kills || 0) + ' FINISHES';
    }
    if ($('cdLogo')) setLogo($('cdLogo'), w.logo, w.name, w.tag);
    if ($('cdFootLeft')) $('cdFootLeft').textContent = p.event.toUpperCase() + ' · MATCH WINNER';
    if ($('cdFootRight')) $('cdFootRight').textContent = 'MATCH ' + pad(p.match);
  }

  function buildConfetti() {
    var host = $('cdConfetti');
    if (!host) return;
    host.replaceChildren();
    var theme = THEMES.filter(function (t) { return t.id === state.theme; })[0] || THEMES[0];
    var colors = [theme.accent, '#ffffff', '#ffd66b', theme.accent, '#ff8fb4'];
    for (var i = 0; i < 78; i += 1) {
      var piece = document.createElement('i');
      piece.style.setProperty('--x', (Math.random() * 100).toFixed(2) + '%');
      piece.style.setProperty('--w', (5 + Math.random() * 7).toFixed(0) + 'px');
      piece.style.setProperty('--h', (10 + Math.random() * 16).toFixed(0) + 'px');
      piece.style.setProperty('--r', (Math.random() * 180).toFixed(0) + 'deg');
      piece.style.setProperty('--drift', (Math.random() * 220 - 110).toFixed(0) + 'px');
      piece.style.setProperty('--spin', (Math.random() * 900 + 360).toFixed(0) + 'deg');
      piece.style.setProperty('--t', (3.2 + Math.random() * 3.4).toFixed(2) + 's');
      piece.style.setProperty('--delay', (Math.random() * 4).toFixed(2) + 's');
      piece.style.setProperty('--c', colors[i % colors.length]);
      host.appendChild(piece);
    }
  }

  /* winner match stats */
  /* Player awards use only the public scoring payload, never showcase teams.
     No invented MVP rating, survival or knock statistics. */
  function awardMetric(label, value) {
    var box = el('div', 'pg-award-metric');
    box.appendChild(el('small', null, label));
    box.appendChild(el('b', null, value));
    return box;
  }
  function awardProfile(player, rank) {
    var card = el('article', 'pg-award-profile');
    card.appendChild(el('span', 'pg-award-rank', '#' + pad(rank)));
    var portrait = el('div', 'pg-award-portrait');
    if (player.avatarUrl) {
      var img = el('img'); img.src = player.avatarUrl; img.alt = player.player;
      portrait.appendChild(img);
    } else {
      portrait.appendChild(el('span', 'pg-award-initials', initials(player.player)));
      portrait.appendChild(el('span', 'pg-award-jersey', player.teamTag || initials(player.teamName)));
    }
    card.appendChild(portrait);
    var name = el('div', 'pg-award-identity');
    var logo = el('div', 'pg-award-logo');
    setLogo(logo, player.logo, player.teamName, player.teamTag);
    name.appendChild(logo);
    var copy = el('div');
    copy.appendChild(el('small', null, player.teamName || 'TEAM'));
    copy.appendChild(el('h2', null, player.player || 'PLAYER'));
    name.appendChild(copy); card.appendChild(name);
    return card;
  }
  function renderOverallMvpReference() {
    var host = $('overallMvpCards');
    var seed = window.PMGC_MVP_REFERENCE;
    if (!host || host.childElementCount || !seed) return;
    $('overallMvpEvent').textContent = seed.event;
    $('overallMvpSeedLabel').textContent = seed.label;
    fillMvpReferenceCards(host, seed);
  }
  function fillMvpReferenceCards(host, seed) {
    seed.players.slice().sort(function (a, b) { return b.rating - a.rating; }).slice(0, 5).forEach(function (player, index) {
      var card = el('article', 'pg-reference-card' + (index === 0 ? ' is-leader' : ''));
      card.setAttribute('aria-label', 'Rank ' + (index + 1) + ': ' + player.name);
      var portrait = el('div', 'pg-reference-portrait');
      var img = el('img');
      img.src = '/assets/images/mvp-reference/' + player.photo;
      img.alt = player.name + ' — portrait cropped from supplied reference';
      img.width = index === 0 ? 328 : 225; img.height = index === 0 ? 254 : 214;
      portrait.appendChild(img);
      card.appendChild(portrait);
      var name = el('h2', 'pg-reference-name', player.name);
      name.title = player.name; card.appendChild(name);
      var metrics = el('dl', 'pg-reference-stats');
      [['MVP RATING', player.rating.toFixed(2)], ['FINISHES', player.finishes],
        ['DAMAGE', player.damage], ['AVG. SURV.', player.survival], ['KNOCKS', player.knocks]].forEach(function (pair) {
        var row = el('div', 'pg-reference-stat');
        row.appendChild(el('dt', null, pair[0]));
        row.appendChild(el('dd', null, String(pair[1])));
        metrics.appendChild(row);
      });
      card.appendChild(metrics); host.appendChild(card);
    });
  }

  function currentMatchStat(label, value, className) {
    var row = el('div', 'pg-reference-stat' + (className ? ' ' + className : ''));
    row.appendChild(el('dt', null, label));
    row.appendChild(el('dd', null, value == null || value === '' ? '—' : String(value)));
    return row;
  }

  function fillCurrentMatchCards(host, leaders) {
    for (var i = 0; i < 5; i += 1) {
      var player = leaders[i];
      var card = el('article', 'pg-reference-card' + (i === 0 ? ' is-leader' : ''));
      card.setAttribute('aria-label', 'Rank ' + (i + 1) + (player ? ': ' + player.player : ': awaiting player data'));
      var portrait = el('div', 'pg-reference-portrait');
      var photo = player && (player.avatarUrl || player.photoUrl);
      if (photo) {
        var image = el('img'); image.src = photo; image.alt = player.player;
        portrait.appendChild(image);
      } else {
        portrait.classList.add('pg-reference-live-placeholder');
        if (player && player.logo) {
          var logo = el('img'); logo.src = player.logo; logo.alt = player.teamName || 'Team logo';
          logo.className = 'pg-reference-team-logo'; portrait.appendChild(logo);
        } else {
          portrait.appendChild(el('span', 'pg-reference-monogram', player ? initials(player.player) : '#' + (i + 1)));
        }
        portrait.appendChild(el('small', 'pg-reference-photo-note', player ? 'PLAYER PHOTO NOT SET' : 'AWAITING PLAYER DATA'));
      }
      if (player && !photo) portrait.appendChild(el('span', 'pg-reference-team-tag', player.teamTag || player.teamName || ''));
      card.appendChild(portrait);
      var name = el('h2', 'pg-reference-name', player ? player.player : 'PENDING');
      name.title = player ? player.player : 'Awaiting player data';
      card.appendChild(name);
      var metrics = el('dl', 'pg-reference-stats');
      // Rating stays in the DOM as an explicitly untracked metric for backwards
      // compatibility, but the current-match reference shows these four rows.
      metrics.appendChild(currentMatchStat('MVP RATING', '—', 'pg-ref-stat-rating'));
      metrics.appendChild(currentMatchStat('FINISHES', player ? money(player.kills) : '—', 'pg-ref-stat-finishes'));
      metrics.appendChild(currentMatchStat('DAMAGE', player ? String(Number(player.damage) || 0) : '—', 'pg-ref-stat-damage'));
      metrics.appendChild(currentMatchStat('SURV. TIME', player && (player.survival || player.survivalTime), 'pg-ref-stat-survival'));
      metrics.appendChild(currentMatchStat('KNOCKS', player && player.knocks != null ? player.knocks : '—', 'pg-ref-stat-knocks'));
      card.appendChild(metrics);
      host.appendChild(card);
    }
  }

  function renderPlayerAwards() {
    var seed = window.BGIS_MATCH_REFERENCE;
    var awards = referenceMode && seed ? seed.playerAwards : (state.playerAwards || {});
    var mvp = awards.matchMvp;
    var leaders = (awards.matchTopPlayers || []).slice();
    var referencePreview = referenceMode && seed;
    if (flag('preview', false) && seed && !mvp && !leaders.length) {
      // Preview fallback is a single snapshot, never a blend of seeded and
      // live awards. Any real current-match award keeps the whole view live.
      mvp = seed.playerAwards.matchMvp;
      leaders = seed.playerAwards.matchTopPlayers.slice();
      referencePreview = true;
    }
    leaders.sort(function (a, b) {
      return b.kills - a.kills || b.damage - a.damage || String(a.player).localeCompare(String(b.player));
    });
    leaders = leaders.slice(0, 5);
    var host = $('mvpContent'); var top = $('topPlayersContent');
    if (!host || !top) return;
    host.replaceChildren(); top.replaceChildren();
    var awardMatch = referencePreview && seed ? seed.match : state.data.match;
    if ($('mvpMatch')) $('mvpMatch').textContent = 'MATCH ' + Number(awardMatch || 1);
    if ($('topPlayersMatch')) $('topPlayersMatch').textContent = 'MATCH ' + Number(awardMatch || 1);
    if (mvp && mvp.kills > 0) {
      var card = el('article', 'pg-ref-mvp-card');
      var person = el('div', 'pg-ref-mvp-person');
      var portrait = mvp.cutoutUrl || mvp.avatarUrl || mvp.photoUrl;
      if (portrait) {
        var photo = el('img', mvp.cutoutUrl ? 'cutout' : 'portrait');
        photo.src = portrait; photo.alt = mvp.player; person.appendChild(photo);
      } else {
        person.appendChild(el('span', 'pg-ref-mvp-initials', initials(mvp.player)));
        person.appendChild(el('span', 'pg-ref-mvp-jersey', mvp.teamTag || initials(mvp.teamName)));
      }
      card.appendChild(person);
      var team = el('div', 'pg-ref-mvp-team');
      var teamLogo = el('span', 'pg-ref-mvp-team-logo');
      setLogo(teamLogo, mvp.logo, mvp.teamName, mvp.teamTag);
      team.appendChild(teamLogo);
      team.appendChild(el('b', null, mvp.teamTag || mvp.teamName || 'TEAM'));
      card.appendChild(team);
      var knocks = el('div', 'pg-ref-mvp-knocks');
      knocks.appendChild(el('small', null, 'KNOCKS'));
      knocks.appendChild(el('b', null, mvp.knocks == null ? '—' : mvp.knocks));
      card.appendChild(knocks);
      card.appendChild(el('h2', 'pg-ref-mvp-name', mvp.player));
      var finishes = awardMetric('FINISHES', money(mvp.kills));
      finishes.classList.add('pg-ref-mvp-finishes'); card.appendChild(finishes);
      var damage = awardMetric('DAMAGE', String(Number(mvp.damage) || 0));
      damage.classList.add('pg-ref-mvp-damage'); card.appendChild(damage);
      var survival = awardMetric('SURV. TIME', mvp.survival || mvp.survivalTime || '—');
      survival.classList.add('pg-ref-mvp-survival'); card.appendChild(survival);
      host.appendChild(card);
    } else {
      host.appendChild(el('div', 'pg-award-empty', 'MVP AWAITING MATCH DATA'));
    }
    fillCurrentMatchCards(top, leaders);
    var topFooter = $('topPlayersMode');
    topFooter.textContent = referencePreview
      ? 'SEEDED REFERENCE PREVIEW · NOT LIVE RESULTS'
      : leaders.length
        ? 'LIVE SCORING · CURRENT MATCH · FINISHES FIRST · DAMAGE TIEBREAK · — = NOT TRACKED'
        : 'AWAITING CURRENT-MATCH PLAYER DATA · LIVE SOURCE · — = NOT TRACKED';
  }

  function renderWinnerStats() {
    var w = state.data.winner;
    var p = state.data;
    if (!w) return;
    if ($('wsTeam')) $('wsTeam').textContent = w.name;
    if ($('wsMeta')) $('wsMeta').textContent = 'MATCH ' + Number(p.match || 1);
    if ($('wsLogo')) setLogo($('wsLogo'), w.mapLogo || w.logo, w.name, w.tag);

    var host = $('wsPlayers');
    if (!host) return;
    host.replaceChildren();
    for (var i = 0; i < 4; i += 1) {
      var player = w.players[i] || { name: 'PENDING', kills: null, damage: null };
      var card = el('article', 'pg-wplayer');
      card.style.setProperty('--i', i);
      var photo = el('div', 'pg-wplayer-photo');
      if (player.avatarUrl) {
        var img = document.createElement('img');
        img.src = player.avatarUrl;
        img.alt = player.name;
        photo.appendChild(img);
      } else {
        photo.appendChild(el('span', 'pg-ref-wplayer-initials', initials(player.name)));
      }
      var body = el('div', 'pg-wplayer-body');
      body.appendChild(el('h3', null, player.name));
      var stats = el('div', 'pg-ref-wplayer-stats');
      var finishes = el('div');
      finishes.appendChild(el('small', null, 'FINISHES'));
      finishes.appendChild(el('b', null, player.kills == null ? '—' : player.kills));
      var damage = el('div');
      damage.appendChild(el('small', null, 'DAMAGE'));
      damage.appendChild(el('b', null, player.damage == null ? '—' : money(player.damage)));
      stats.appendChild(finishes); stats.appendChild(damage);
      body.appendChild(stats);
      card.appendChild(photo);
      card.appendChild(body);
      host.appendChild(card);
    }
  }

  /* Tactical map feed with eight team marks on each side. */
  function renderMapFeed() {
    var left = $('mapFeedLeft'); var right = $('mapFeedRight');
    if (!left || !right) return;
    left.replaceChildren(); right.replaceChildren();
    var teams = state.data.teams.slice();
    var byTag = {};
    teams.forEach(function (team) { byTag[String(team.tag || team.shortName || team.name).toUpperCase()] = team; });
    var order = state.data.mapOrder || teams.map(function (team) { return team.tag || team.shortName || team.name; });
    var used = {};
    var ordered = order.map(function (tag) {
      var team = byTag[String(tag).toUpperCase()];
      if (team) used[String(tag).toUpperCase()] = true;
      return team;
    }).filter(Boolean);
    teams.forEach(function (team) {
      var tag = String(team.tag || team.shortName || team.name).toUpperCase();
      if (!used[tag]) ordered.push(team);
    });
    ordered.slice(0, 16).forEach(function (team, index) {
      var tag = team.shortName || team.broadcastTag || team.tag || team.name;
      var card = el('article', 'pg-ref-map-team');
      card.style.setProperty('--i', index % 8);
      var logo = el('div', 'pg-ref-map-team-logo');
      setLogo(logo, team.mapLogo || team.logo, tag, tag);
      card.appendChild(logo);
      card.appendChild(el('b', 'pg-ref-map-team-name', tag));
      (index < 8 ? left : right).appendChild(card);
    });
    var match = state.data.mapFeedMatch || state.data.match || 1;
    var stage = String(state.data.stage || 'GRAND FINALS').split('·')[0].trim().toUpperCase();
    if ($('mapFeedTitle')) $('mapFeedTitle').textContent = stage + ' - M' + match;
    var image = $('mapFeedImage');
    if (image) {
      var art = params.get('map') || (state.data.reference
        ? '/assets/images/bgis-2026/map-erangel.jpg'
        : MAP_ART[String(state.data.map).toLowerCase()] || MAP_ART.erangel);
      if (image.getAttribute('src') !== art) image.src = art;
    }
  }

  /* map rotation */
  function renderMaps() {
    var teams = state.data.teams;
    var best = { erangel: null, miramar: null, rondo: null };
    ['erangel', 'miramar', 'rondo'].forEach(function (key, idx) {
      var team = teams[idx % teams.length];
      var el2 = $('mapBest' + key.charAt(0).toUpperCase() + key.slice(1));
      if (el2 && team) el2.textContent = team.tag || initials(team.name);
    });
    if ($('mapsFootMeta')) {
      $('mapsFootMeta').textContent = 'MATCH ' + pad(state.data.match) + ' OF ' +
        pad(state.data.matchesTotal || 6) + ' · NEXT: MIRAMAR';
    }
  }

  /* ---------------------------------------------------------- kills + HUD */
  function killRow(kill) {
    var row = el('div', 'pg-kill');
    row.appendChild(el('span', 'killer', kill.killer));
    row.appendChild(el('span', 'ico', '⚔'));
    row.appendChild(el('span', 'victim', kill.victim + ' · ' + kill.team));
    row.appendChild(el('span', 'tag', kill.weapon));
    return row;
  }

  /* Rebuilds the feed on scene entry; afterwards only the newest elimination
     is prepended so older rows keep their settled state (no re-animation). */
  function renderKillFeed(rebuild) {
    var data = state.data;
    [{ host: $('killFeed'), max: 4 }, { host: $('killFeed2'), max: 3 }]
      .forEach(function (target) {
        var host = target.host;
        if (!host) return;
        if (rebuild || !host.children.length) {
          host.replaceChildren();
          data.killFeed.slice(0, target.max).forEach(function (kill) {
            host.appendChild(killRow(kill));
          });
          host._rendered = data.killFeed.length;
          return;
        }
        if (host._rendered === data.killFeed.length) return;
        host._rendered = data.killFeed.length;
        var fresh = killRow(data.killFeed[0]);
        fresh.classList.add('is-new');
        host.prepend(fresh);
        while (host.children.length > target.max) host.lastElementChild.remove();
      });
  }

  function renderHud() {
    var d = state.data;
    var selectedMap = String(params.get('battleground') || '').toLowerCase();
    if (['erangel', 'miramar', 'rondo'].indexOf(selectedMap) !== -1) d.map = selectedMap;
    if (params.get('event')) d.event = params.get('event').slice(0, 80);
    var set = function (id, text) { var n = $(id); if (n) n.textContent = text; };
    var leader = d.teams.slice().sort(function (a, b) { return b.total - a.total || b.fin - a.fin; })[0];
    if (leader) {
      set('leaderSpotName', leader.name);
      set('leaderSpotPoints', leader.total || 0);
      setLogo($('leaderSpotLogo'), leader.logo, leader.name, leader.tag);
    }
    set('bugEvent', d.event);
    set('diagonalSponsor', (params.get('sponsor') || d.sponsor || 'PARTNER SLOT').slice(0, 60));
    var program = state.program || {};
    set('casterName1', program.caster1 == null ? (params.get('caster1') || 'NOVA') : program.caster1);
    set('casterName2', program.caster2 == null ? (params.get('caster2') || 'ARC') : program.caster2);
    set('casterLine1', program.tagline1 == null ? 'Calls every rotation, every fight, every clutch.' : program.tagline1);
    set('casterLine2', program.tagline2 == null ? 'Reads the zone, breaks down the endgame maths.' : program.tagline2);
    set('dropCaster1', program.caster1 == null ? (params.get('caster1') || 'CASTER 01 · LIVE') : program.caster1);
    set('dropCaster2', program.caster2 == null ? (params.get('caster2') || 'CASTER 02 · LIVE') : program.caster2);
    set('bugStage', d.stage);
    set('bugMatch', pad(d.match));
    set('bugMap', String(d.map).toUpperCase());
    set('bgisLowerStage', (params.get('lowerstage') || 'GRAND FINALS').slice(0, 40).toUpperCase());
    set('bgisLowerMatch', 'M' + pad(d.match));
    set('bgisLowerMap', String(d.map).toUpperCase());
    set('bugGroup', d.group);
    set('bugAlive', d.squads);
    set('bugAlive', state.aliveTeams);
    set('feedAlive', state.alive);
    set('feedTeams', state.aliveTeams);
    set('liveAlive', state.alive);
    set('liveAlive2', state.alive);
    set('liveZone', state.zone);
    set('liveZone2', state.zone);
    set('mapZone', state.zone);
    set('bugZone', state.zone);
    set('liveShrink', state.shrink);
    set('liveMapName', String(d.map).toUpperCase());
    set('liveMapName2', String(d.map).toUpperCase());
    set('livePtsCounter', state.alive);
    set('livePhase2', state.zone >= 5 ? 'FINAL CIRCLE' : 'MID GAME');
    set('bugClock', state.matchClock);
    set('casterEventName', d.event);
    set('openStage', d.stage);
    set('openMap', String(d.map).toUpperCase());
    set('openSquads', d.squads);
    set('openMatches', pad(d.matchesTotal || 6).replace(/^0/, ''));
    set('openPrize', d.prize);
    set('dropMatch', pad(d.match));
    set('dropGroup', 'GROUP ' + d.group);
    set('dropMap', String(d.map).toUpperCase());
    set('dropSquads', d.squads);
    set('dropMapName', String(d.map).toUpperCase());
    set('dropMapNote', MAP_NOTES[String(d.map).toLowerCase()] || 'HOT DROP → ROTATION → ENDGAME');
    set('dropTickerMatch', 'MATCH ' + pad(d.match) + ' · ' + String(d.map).toUpperCase());
    set('cdFootLeft', d.event.toUpperCase() + ' · MATCH WINNER');
    set('cdFootRight', 'MATCH ' + pad(d.match));
    set('bugMark', initials(d.event));

    var art = MAP_ART[String(d.map).toLowerCase()] || MAP_ART.erangel;
    if (state.scene === 'map-intro') {
      $('introMapName').textContent = String(d.map).toUpperCase();
      $('introMapImg').src = art;
    }
    var mapOverride = params.get('map');
    if (mapOverride) art = mapOverride;
    ['mapImg', 'mapImg2', 'dropMapImg'].forEach(function (id) {
      var img = $(id);
      if (img && img.getAttribute('src') !== art) img.src = art;
    });
    var feedOverride = params.get('feed');
    ['feedImg', 'feedImg2'].forEach(function (id) {
      var img = $(id);
      if (!img) return;
      var host = img.parentElement;
      if (feedOverride) {
        if (img.getAttribute('src') !== feedOverride) img.src = feedOverride;
        if (host) host.classList.add('has-img');
      }
    });
  }

  /* ------------------------------------------------------------- sparks */
  function buildSparks() {
    var host = $('pgSparks');
    if (!host) return;
    host.replaceChildren();
    for (var i = 0; i < 26; i += 1) {
      var spark = el('span', 'pg-spark' + (i % 5 === 0 ? ' soft' : i % 3 === 0 ? ' sq' : ''));
      spark.style.left = (Math.random() * 100).toFixed(2) + '%';
      spark.style.top = (55 + Math.random() * 45).toFixed(2) + '%';
      spark.style.setProperty('--dur', (7 + Math.random() * 9).toFixed(1) + 's');
      spark.style.setProperty('--delay', (Math.random() * 9).toFixed(1) + 's');
      spark.style.setProperty('--dx', (Math.random() * 140 - 70).toFixed(0) + 'px');
      spark.style.setProperty('--op', (0.25 + Math.random() * 0.6).toFixed(2));
      host.appendChild(spark);
    }
  }

  /* --------------------------------------------------- state / animation */
  state.alive = 64;
  state.aliveTeams = 16;
  state.zone = 3;
  state.shrink = '04:12';
  state.matchClock = '12:48';

  var introMusic = new Audio('/assets/audio/deployment-original.wav');
  introMusic.volume = 0.4;
  var introExit;
  function onSceneEnter(id, replay) {
    clearTimeout(introExit);
    introMusic.pause();
    introMusic.currentTime = 0;
    document.body.classList.toggle('pg-capture', ['casters', 'drop', 'live', 'live-points', 'map-feed'].indexOf(id) !== -1 && !(referenceMode && id === 'map-feed'));
    if (id === 'map-intro') {
      var mapKey = String(state.data.map || 'erangel').toLowerCase();
      $('introMapName').textContent = mapKey.toUpperCase();
      $('introMapImg').src = MAP_ART[mapKey] || MAP_ART.erangel;
      $('introAudioBtn').hidden = flag('audio', true);
      if (flag('audio', true)) introMusic.play().catch(function () { $('introAudioBtn').hidden = false; });
      introExit = setTimeout(function () { if (state.scene === 'map-intro') setScene('live'); }, 8000);
    }

    clearInterval(state.ticks.opening);
    clearInterval(state.ticks.drop);
    clearInterval(state.ticks.live);
    clearInterval(state.ticks.sim);

    if (id === 'opening') {
      startOpeningClock();
      if (!replay) buildSparks();
    }
    if (id === 'drop') {
      state.dropEnds = Date.now() + 30000;
      root.classList.remove('is-drop-live');
      startDropClock();
    }
    if (id === 'live' || id === 'live-points') {
      state.alive = state.data.teams.reduce(function (sum, t) {
        return sum + (t.alive == null ? 4 : t.alive);
      }, 0);
      state.aliveTeams = state.data.teams.filter(function (t) {
        return (t.alive == null ? 4 : t.alive) > 0 || (t.players || []).some(function (p) { return p.status === 'knocked'; });
      }).length;
      renderHud();
      renderKillFeed(true);
      clearInterval(state.ticks.live);
      state.ticks.live = setInterval(function () {
        state.matchClock = bumpClock(state.matchClock);
        var n = $('bugClock');
        if (n) n.textContent = state.matchClock;
      }, 1000);
      clearInterval(state.ticks.sim);
      state.ticks.sim = setInterval(simulateMatch, 4200);
    }
    if (id === 'chicken-dinner') {
      buildConfetti();
      renderChickenDinner();
    }
    if (id === 'winner-stats') renderWinnerStats();
    if (id === 'match-standings') renderMatchStandings();
    if (id === 'map-feed') renderMapFeed();
    if (id === 'overall') renderOverall();
    if (id === 'map-rotation') renderMaps();
  }

  $('introAudioBtn').addEventListener('click', function () { introMusic.play().then(function () { $('introAudioBtn').hidden = true; }).catch(function () {}); });

  function bumpClock(value) {
    var parts = String(value).split(':').map(Number);
    var total = (parts[0] || 0) * 60 + (parts[1] || 0) + 1;
    return pad(Math.floor(total / 60)) + ':' + pad(total % 60);
  }

  function simulateMatch() {
    if (!state.data.demo || !state.useDemo) return;
    if (state.scene !== 'live' && state.scene !== 'live-points') return;
    if (state.alive > 8) {
      var drop = Math.random() > 0.55 ? 2 : 1;
      state.alive = Math.max(6, state.alive - drop);
      if (Math.random() > 0.72) state.aliveTeams = Math.max(2, state.aliveTeams - 1);
      if (state.zone < 6) state.zone = Math.min(6, state.zone + 1);
    }
    var pool = state.data.teams;
    var killer = pool[Math.floor(Math.random() * Math.min(6, pool.length))];
    var victim = pool[Math.floor(Math.random() * pool.length)];
    if (killer && victim && killer !== victim) {
      state.data.killFeed.unshift({
        killer: (killer.players && killer.players[0] && killer.players[0].name) || killer.tag,
        team: victim.name,
        victim: victim.tag + ' ' + (Math.floor(Math.random() * 90) + 10),
        weapon: ['M416', 'AKM', 'M24', 'UMP45', 'Beryl', 'DMR'][Math.floor(Math.random() * 6)]
      });
      state.data.killFeed = state.data.killFeed.slice(0, 6);
      killer.matchKills = (killer.matchKills || 0) + 1;
      killer.matchTotal = (killer.matchTotal || 0) + 1;
      killer.fin = (killer.fin || 0) + 1;
      killer.total = (killer.total || 0) + 1;
    }
    renderHud();
    renderKillFeed(false);
    updateLiveRail();
    if (state.scene === 'live-points') updateLivePointsValues();
  }

  /* --------------------------------------------------------------- render */
  function renderAll() {
    renderHud();
    renderTickers();
    renderLiveRail();
    renderLivePoints();
    renderMatchStandings();
    renderOverall();
    renderChickenDinner();
    renderWinnerStats();
    renderPlayerAwards();
    renderMapFeed();
    renderOverallMvpReference();
    renderMaps();
    renderKillFeed(true);
  }

  /* ------------------------------------------------------------ live data */
  function applyLiveState(payload) {
    if (referenceMode) return;
    if (!state.useDemo && (!payload || !payload.teams || payload.teams.length < 4)) return;
    state.data = fromLive(payload, demoData);
    state.alive = state.data.teams.reduce(function (sum, t) { return sum + (t.players || []).filter(function (p) { return p.status === 'alive' || p.status === 'knocked'; }).length; }, 0);
    state.aliveTeams = state.data.teams.filter(function (t) { return (t.players || []).some(function (p) { return p.status === 'alive' || p.status === 'knocked'; }); }).length;
    renderAll();
    if (state.scene === 'live-points') renderLivePoints();
  }

  function applyAdminOverlayLayout(payload) {
    var layout = payload && payload.overlayLayout;
    if (!layout) return;
    Object.keys(layout).forEach(function (id) {
      var item = layout[id], node = document.getElementById(id);
      if (!node || !item) return;
      node.style.display = item.enabled === false ? 'none' : '';
      if (item.enabled === false) return;
      node.style.position = 'absolute';
      node.style.left = Math.max(0, Number(item.x) || 0) + 'px';
      node.style.top = Math.max(0, Number(item.y) || 0) + 'px';
      node.style.width = Math.max(0, Number(item.w) || 0) + 'px';
      if (id === 'livePointsBoard') node.style.setProperty('height', Math.max(0, Number(item.h) || 0) + 'px', 'important');
      else node.style.height = Math.max(0, Number(item.h) || 0) + 'px';
      if (id === 'pgFeed' || id === 'liveMapWindow') {
        var aperture = document.getElementById(id === 'pgFeed' ? 'liveFeedCutout' : 'liveMapCutout');
        if (aperture) { aperture.setAttribute('x', item.x); aperture.setAttribute('y', item.y); aperture.setAttribute('width', item.w); aperture.setAttribute('height', item.h); }
      }
      if (id === 'casterGrid') {
        node.style.right = 'auto'; node.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
        var gap = 80, col = Math.max(0, (Number(item.w) - gap) / 2);
        var cutoutHeight = Math.max(0, Number(item.h) * (461.25 / 581.25));
        [['casterCutout1', Number(item.x)], ['casterCutout2', Number(item.x) + col + gap]].forEach(function (pair) {
          var hole = document.getElementById(pair[0]);
          if (hole) { hole.setAttribute('x', pair[1]); hole.setAttribute('y', item.y); hole.setAttribute('width', col); hole.setAttribute('height', cutoutHeight); }
        });
      }
    });
  }

  function pullLiveState() {
    if (!window.fetch) return;
    fetch('/api/live/state', { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (payload) {
        if (programMode && payload && payload.pmgcProgram) {
          var program = payload.pmgcProgram;
          var changed = programRevision !== program.revision;
          state.program = program;
          if (state.theme !== program.theme) setTheme(program.theme, {persist: false});
          if (program.map) params.set('battleground', program.map); else params.delete('battleground');
          if (program.sponsor) params.set('sponsor', program.sponsor); else params.delete('sponsor');
          params.set('audio', program.audio ? '1' : '0');
          if (!program.audio) introMusic.pause();
          renderHud();
          if (changed) {
            state.auto = false;
            clearTimeout(state.sceneTimer);
            setScene(program.scene, {wipe: programRevision !== null});
            programRevision = program.revision;
          }
          root.style.opacity = '1';
        }
        if (payload && payload.playerAwards) {
          state.playerAwards = payload.playerAwards;
          renderPlayerAwards();
        }
        if (payload && Number.isInteger(payload.streamStartSeconds) && payload.streamStartSeconds > 0) {
          var changed = state.streamStartSeconds !== payload.streamStartSeconds ||
            state.streamStartRevision !== payload.streamStartRevision;
          state.streamStartSeconds = payload.streamStartSeconds;
          state.streamStartRevision = payload.streamStartRevision;
          if (changed && state.scene === 'opening' && !params.has('start')) startOpeningClock();
        }
        if (payload && payload.teams && payload.teams.length >= 4) applyLiveState(payload);
        applyAdminOverlayLayout(payload);
      })
      .catch(function () { /* showcase data stays on screen */ });
  }

  /* Public, token-free live channel: the server's SSE endpoint only carries a
     change signal, so every event triggers a fresh /api/live/state read. A
     slow poll covers browsers where EventSource is unavailable. */
  function connectStream() {
    setInterval(pullLiveState, programMode ? 2000 : 15000);
    if (!window.EventSource) return;
    try {
      var source = new EventSource('/api/live/stream');
      source.onmessage = function () { pullLiveState(); };
      source.addEventListener('hb', function () {});
      source.onerror = function () { /* the browser reconnects on its own */ };
    } catch (e) { /* polling above remains active */ }
  }

  /* -------------------------------------------------------------- controls */
  function buildUi() {
    var host = $('pgUiScenes');
    if (host && !host.children.length) {
      SCENES.forEach(function (scene) {
        var button = el('button', null, scene.label);
        button.type = 'button';
        button.setAttribute('data-scene', scene.id);
        button.addEventListener('click', function () {
          state.auto = false;
          setAutoUi(false);
          setScene(scene.id);
        });
        host.appendChild(button);
      });
    }
    var select = $('pgUiTheme');
    if (select && !select.children.length) {
      THEMES.forEach(function (theme) {
        var option = document.createElement('option');
        option.value = theme.id;
        option.textContent = theme.name;
        select.appendChild(option);
      });
      select.addEventListener('change', function () {
        setTheme(select.value);
        renderMaps();
      });
    }
    if (!state.ui) {
      var ui = $('pgUi');
      if (ui) ui.classList.add('is-off');
      var flagNode = $('pgFlag');
      if (flagNode) flagNode.classList.add('is-hidden');
    }
    // the theme came from ?theme/localStorage before the picker existed
    setTheme(state.theme, { persist: false });
    syncSceneButtons();
    setAutoUi(state.auto);
  }

  function setAutoUi(on) {
    var button = $('pgUiAuto');
    if (button) {
      button.classList.toggle('is-on', !!on);
      button.textContent = on ? '❚❚ Pause show' : '▶ Play full show';
    }
    var note = $('pgUiState');
    if (note) note.textContent = on ? 'AUTO RUNDOWN' : 'MANUAL';
  }

  function scheduleAuto() {
    clearTimeout(state.sceneTimer);
    if (['opening', 'drop', 'map-intro'].indexOf(state.scene) !== -1) return;
    var scene = SCENES.filter(function (s) { return s.id === state.scene; })[0] || SCENES[0];
    state.sceneStart = Date.now();
    state.sceneEnd = Date.now() + scene.ms;
    state.sceneDuration = scene.ms;
    clearInterval(state.tick_progress);
    state.tick_progress = setInterval(function () {
      var pct = clamp(((Date.now() - state.sceneStart) / state.sceneDuration) * 100, 0, 100);
      var bar = $('pgUiProgress');
      if (bar) bar.style.width = pct.toFixed(1) + '%';
    }, 120);
    state.sceneTimer = setTimeout(function () {
      var idx = SCENE_IDS.indexOf(state.scene);
      var next = SCENE_IDS[(idx + 1) % SCENE_IDS.length];
      setScene(next);
    }, scene.ms);
  }

  function stopAuto() {
    state.auto = false;
    clearTimeout(state.sceneTimer);
    clearInterval(state.tick_progress);
    setAutoUi(false);
    var bar = $('pgUiProgress');
    if (bar) bar.style.width = '0%';
  }

  function toggleAuto() {
    if (state.auto) {
      stopAuto();
      return;
    }
    state.auto = true;
    setAutoUi(true);
    scheduleAuto();
  }

  function step(delta) {
    var idx = SCENE_IDS.indexOf(state.scene);
    var next = (idx + delta + SCENE_IDS.length) % SCENE_IDS.length;
    stopAuto();
    setScene(SCENE_IDS[next]);
  }

  function bindControls() {
    var auto = $('pgUiAuto');
    if (auto) auto.addEventListener('click', toggleAuto);
    var prev = $('pgUiPrev');
    if (prev) prev.addEventListener('click', function () { step(-1); });
    var next = $('pgUiNext');
    if (next) next.addEventListener('click', function () { step(1); });
    var repeat = $('pgUiRepeat');
    if (repeat) repeat.addEventListener('click', replayScene);
    var hide = $('pgUiHide');
    if (hide) hide.addEventListener('click', function () {
      var ui = $('pgUi');
      ui.classList.toggle('is-off');
      var flagNode = $('pgFlag');
      if (flagNode) flagNode.classList.toggle('is-hidden', ui.classList.contains('is-off') === false);
      hide.textContent = ui.classList.contains('is-off') ? 'Show UI' : 'Hide UI';
    });
    var full = $('pgUiFull');
    if (full) full.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(function () {});
        }
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(function () {});
      }
    });

    document.addEventListener('keydown', function (event) {
      var tag = (event.target && event.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') { event.preventDefault(); step(1); }
      else if (event.key === 'ArrowLeft' || event.key === 'PageUp') { event.preventDefault(); step(-1); }
      else if (event.key === ' ') { event.preventDefault(); toggleAuto(); }
      else if (event.key === 'r' || event.key === 'R') { replayScene(); }
      else if (event.key === 'h' || event.key === 'H') {
        var ui = $('pgUi');
        if (ui) ui.classList.toggle('is-off');
      } else if (event.key === 'f' || event.key === 'F') {
        var btn = $('pgUiFull');
        if (btn) btn.click();
      } else if (/^[0-9]$/.test(event.key)) {
        var shortcuts = ['opening', 'casters', 'drop', 'live', 'live-points', 'chicken-dinner', 'winner-stats', 'match-standings', 'overall', 'map-rotation'];
        var index = event.key === '0' ? 9 : Number(event.key) - 1;
        if (shortcuts[index]) { stopAuto(); setScene(shortcuts[index]); }
      }
    });
  }

  function updateSourceGuide() {
    var host = $('sourceGuide');
    if (!host || !params.has('guides') || params.get('obs') === '1') return;
    host.hidden = false;
    requestAnimationFrame(function () {
      var active = activeSceneEl();
      if (!active) return;
      var canvas = root.getBoundingClientRect();
      var scale = canvas.width / 1920;
      var rects = Array.from(active.querySelectorAll('.pg-cam')).map(function (cam, i) {
        var r = cam.getBoundingClientRect();
        return 'CAM ' + (i + 1) + ': x ' + Math.round((r.x - canvas.x) / scale) +
          ', y ' + Math.round((r.y - canvas.y) / scale) + ', ' +
          Math.round(r.width / scale) + ' × ' + Math.round(r.height / scale);
      });
      host.textContent = rects.length ? rects.join(' | ') : state.scene === 'live'
        ? 'RECTANGLES: MAP x 1240, y 80, 640 × 440 | GAME x 40, y 428, 1088 × 612. Fit OBS captures below these frames; no diagonal masks.'
        : 'GAMEPLAY: full 1920×1080 capture below this browser source. Scoreboard on the right.';
    });
  }

  /* ----------------------------------------------------------------- boot */
  function boot() {
    var stored = null;
    try { stored = localStorage.getItem('pmgc.theme'); } catch (e) { /* ignore */ }
    stored = canonicalTheme(stored);
    var urlTheme = canonicalTheme((params.get('theme') || '').toLowerCase());
    var theme = THEME_IDS.indexOf(urlTheme) >= 0 ? urlTheme
      : THEME_IDS.indexOf(stored) >= 0 ? stored : state.theme;
    setTheme(theme, { persist: false });

    buildUi();
    bindControls();
    buildConfetti();
    buildSparks();
    renderAll();

    var startScene = SCENE_IDS.indexOf(params.get('scene')) >= 0
      ? params.get('scene')
      : pathScene || state.scene;
    state.scene = startScene;
    root.setAttribute('data-scene', startScene);
    var nodes = root.querySelectorAll('.pg-scene');
    for (var i = 0; i < nodes.length; i += 1) {
      nodes[i].classList.toggle('is-active', nodes[i].getAttribute('data-scene') === startScene);
    }
    onSceneEnter(startScene, false);
    updateSourceGuide();
    syncSceneButtons();

    var preview = flag('preview', true) && !flag('obs', false);
    var flagNode = $('pgFlag');
    if (flagNode) {
      if (!preview) flagNode.classList.add('is-hidden');
      else {
        flagNode.textContent = 'PREVIEW · ' + startScene.toUpperCase() + ' · ' + theme.toUpperCase();
      }
    }

    pullLiveState();
    connectStream();

    if (state.auto) {
      state.auto = false;
      toggleAuto();
    }
    window.__pmgc = {
      setScene: setScene,
      setTheme: setTheme,
      replay: replayScene,
      state: state
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
