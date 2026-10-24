/* Overlay producer — the original broadcast scenes, token, URLs + preview. */
(function () {
  'use strict';
  var esc = BC.esc;
  var $ = function (id) { return document.getElementById(id); };

  var cfg = null;            // overlay-settings payload

  var OVERLAY_BLURB = {
    'pre-show': 'Standby slate before the stream opens.',
    'stream-start': 'Stream starting soon screen with the event logo.',
    'countdown': 'Full-screen drop-in countdown clock.',
    'caster': 'Caster name card with photo and tagline.',
    'format': 'Tournament format and schedule panel.',
    'lineup': 'Teams dropping in, squad by squad.',
    'live': 'Live squad status board — rank, FIN, PTS, alive bars.',
    'chicken-dinner': 'Winner panel for the latest result.',
    'frag-leaders': 'Top five frag leaders with damage.',
    'results': 'Match results table with the winner panel.',
    'overall': 'Overall tournament standings.',
    'mvp': 'Player spotlight (match MVP or overall top fragger).',
    'map-feed': 'Tactical map feed frame.',
    'intermission': 'Match break slate.',
    'technical-difficulties': 'Technical difficulties slate.',
    'hidden': 'Blank slate — no graphics (standby).'
  };

  function urlFor(name) {
    return location.origin + '/overlay/' + name + '?token=' +
      encodeURIComponent(cfg.token);
  }

  function programUrl() {
    return location.origin + '/overlay/program?token=' +
      encodeURIComponent(cfg.token);
  }

  /* One OBS source: scene buttons push broadcast_scene; every open program
     page picks the change up over SSE and swaps its layout in place. */
  function renderProgram() {
    $('programUrl').value = programUrl();
    $('programSceneBtns').innerHTML = cfg.overlays.map(function (name) {
      var on = name === (cfg.broadcastScene || 'live');
      return '<button class="bc-btn' + (on ? ' bc-btn--go' : '') +
        '" data-scene="' + esc(name) + '">' + esc(name) +
        (on ? ' &middot; on air' : '') + '</button>';
    }).join('');
    $('programSceneBtns').querySelectorAll('[data-scene]').forEach(
      function (b) {
        b.addEventListener('click', function () {
          var name = b.dataset.scene;
          if (name === (cfg.broadcastScene || 'live')) return;
          BC.post('/api/admin/overlay-settings', { broadcastScene: name })
            .then(function (x) {
              if (x.s === 200 && x.d.ok) {
                cfg.broadcastScene = x.d.broadcastScene || name;
                renderProgram();
                BC.toast('Program scene \u2192 ' + name);
              } else BC.toast(x.d.error || 'Switch failed', true);
            });
        });
      });
  }

  /* ---- cards -------------------------------------------------------------- */

  function render() {
    $('overlayGrid').innerHTML = cfg.overlays.map(function (name) {
      return '<article class="bc-overlay">' +
        '<div class="bc-overlay-name">' + esc(name) + '</div>' +
        '<p class="bc-p" style="margin:0;">' + esc(OVERLAY_BLURB[name] || '') + '</p>' +
        '<div class="bc-overlay-url" id="url-' + esc(name) + '">' +
        esc(urlFor(name)) + '</div>' +
        '<div class="bc-overlay-acts">' +
        '<button class="bc-btn" data-copy="' + esc(name) + '">Copy URL</button>' +
        '<button class="bc-btn" data-preview="' + esc(name) + '">Preview</button>' +
        '</div></article>';
    }).join('');

    $('overlayGrid').querySelectorAll('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var name = b.dataset.copy;
        var url = urlFor(name);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            BC.toast('Copied ' + name + ' URL');
          }, function () { fallbackCopy(url); });
        } else {
          fallbackCopy(url);
        }
      });
    });
    $('overlayGrid').querySelectorAll('[data-preview]').forEach(function (b) {
      b.addEventListener('click', function () {
        $('previewPick').value = b.dataset.preview;
        loadPreview();
      });
    });
  }

  function fallbackCopy(url) {
    var ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); BC.toast('Copied'); }
    catch (e) { BC.toast('Copy failed — select the URL manually', true); }
    document.body.removeChild(ta);
  }

  /* ---- preview ------------------------------------------------------------- */

  function loadPreview() {
    var name = $('previewPick').value;
    var theme = $('themePickField').value;
    var url = '/overlay/' + name + '?token=' + encodeURIComponent(cfg.token) +
      '&theme=' + encodeURIComponent(theme);
    var frame = $('previewFrame');
    frame.src = url;
    scalePreview();
  }

  function scalePreview() {
    var box = $('previewBox');
    var frame = $('previewFrame');
    var scale = box.clientWidth / 1920;
    frame.style.transform = 'scale(' + scale + ')';
  }
  window.addEventListener('resize', scalePreview);
  /* picking a scene from the dropdown must swap the preview too */
  $('previewPick').addEventListener('change', loadPreview);
  $('themePickField').addEventListener('change', function () {
    BC.post('/api/admin/overlay-settings', {
      theme: $('themePickField').value
    }).then(function (x) {
      if (x.s === 200 && x.d.ok) { loadPreview(); BC.toast('Theme → ' + x.d.theme); }
      else BC.toast(x.d.error || 'Theme switch failed', true);
    });
  });

  $('copyProgramBtn').addEventListener('click', function () {
    if (!cfg) { BC.toast('Still loading', true); return; }
    var url = programUrl();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        BC.toast('Copied program URL');
      }, function () { fallbackCopy(url); });
    } else {
      fallbackCopy(url);
    }
  });

  /* ---- settings ------------------------------------------------------------ */

  function load() {
    BC.api('/api/admin/overlay-settings').then(function (x) {
      if (x.s !== 200 || !x.d.ok) return;
      cfg = x.d;
      $('tokenField').value = cfg.token;
      $('logoField').value = cfg.logoPath;
      $('themeField').value = cfg.themeColor || '#b6ff3e';
      $('themePickField').value = cfg.theme || 'krafton-pm';
      $('sponsorField').value = cfg.sponsorText || '';
      $('casterField').value = cfg.casterName || '';
      $('caster2Field').value = cfg.casterName2 || '';
      $('casterTaglineField').value = cfg.casterTagline || '';
      if ($('previewPick').options.length !== cfg.overlays.length) {
        $('previewPick').innerHTML = cfg.overlays.map(function (n) {
          return '<option value="' + esc(n) + '">' + esc(n) + '</option>';
        }).join('');
      }
      if ($('themePickField').options.length !== cfg.themes.length) {
        $('themePickField').innerHTML = cfg.themes.map(function (t) {
          return '<option value="' + esc(t) + '">' + esc(t) + '</option>';
        }).join('');
      }
      render();
      renderProgram();
      loadPreview();
    });
  }

  $('saveThemeBtn').addEventListener('click', function () {
    BC.post('/api/admin/overlay-settings', {
      logoPath: $('logoField').value.trim(),
      themeColor: $('themeField').value,
      theme: $('themePickField').value,
      sponsorText: $('sponsorField').value.trim(),
      casterName: $('casterField').value.trim(),
      casterName2: $('caster2Field').value.trim(),
      casterTagline: $('casterTaglineField').value.trim()
    }).then(function (x) {
      if (x.s === 200 && x.d.ok) {
        BC.toast('Saved');
        load();
      } else BC.toast(x.d.error || 'Save failed', true);
    });
  });

  $('rotateBtn').addEventListener('click', function () {
    if (!window.confirm('Rotate the overlay token? Every existing OBS URL stops working until you paste the new one.')) return;
    BC.post('/api/admin/overlay-settings', { rotateToken: true }).then(function (x) {
      if (x.s === 200 && x.d.ok) {
        BC.toast('Token rotated — re-copy every OBS URL');
        load();
      } else BC.toast(x.d.error || 'Rotate failed', true);
    });
  });

  BC.boot(function () {
    load();
  });
})();

/* ---- PMGC broadcast stage -------------------------------------------------
   Ten themes x ten scenes live on /pmgc/<scene>?theme=<id>. The lists mirror
   public/css/pmgc-themes.css and the SCENES table in public/js/pmgc-stage.js;
   keep them in step when a theme or scene is added. */
(function () {
  'use strict';
  var PMGC_THEMES = window.BROADCAST_THEMES.map(function (t, i) {
    return [t.id, String(i + 1).padStart(2, '0') + ' · ' + t.name];
  });
  var PMGC_SCENES = [
    ['opening', '01 · Stream starting'],
    ['casters', '02 · Casters'],
    ['drop', '03 · Match drop (30s)'],
    ['map-intro', 'Map deployment intro'],
    ['live', '04 · Live + map feed'],
    ['live-points', '05 · Live points'],
    ['chicken-dinner', '06 · Chicken dinner'],
    ['winner-stats', '07 · Winner stats'],
    ['match-standings', '08 · Match points'],
    ['overall', '09 · Overall standings'],
    ['map-rotation', '10 · Map rotation'],
    ['mvp', '11 · Match MVP'],
    ['top-players', '12 · Top 5 players'],
    ['overall-mvp', '13 · Overall Top 5 MVP (seeded reference)']
  ];

  function pmgcUrl() {
    var theme = document.getElementById('pmgcTheme').value || 'bmps-2024';
    var scene = document.getElementById('pmgcScene').value || 'opening';
    return location.origin + '/pmgc/' + scene +
      '?theme=' + encodeURIComponent(theme) + '&obs=1' +
      (document.getElementById('pmgcMap').value ? '&battleground=' + document.getElementById('pmgcMap').value : '') +
      '&sponsor=' + encodeURIComponent(document.getElementById('pmgcSponsor').value) +
      (document.getElementById('pmgcAudio').checked ? '&audio=1' : '&audio=0');
  }

  function syncPmgc(changed) {
    var url = pmgcUrl();
    document.getElementById('pmgcUrl').value = url;
    document.getElementById('pmgcOpenBtn').href = url.replace('&obs=1', '&ui=1');
    document.getElementById('pmgcGuides').href = url.replace('&obs=1', '&ui=1&guides=1');
    if (changed) {
      var frame = document.getElementById('pmgcPreviewFrame');
      if (frame) frame.src = url + '&preview=1';
    }
  }

  function scalePmgc() {
    var box = document.getElementById('pmgcPreviewBox');
    var frame = document.getElementById('pmgcPreviewFrame');
    if (!box || !frame) return;
    var scale = box.clientWidth / 1920;
    frame.style.width = '1920px';
    frame.style.height = '1080px';
    frame.style.transformOrigin = 'top left';
    frame.style.transform = 'scale(' + scale + ')';
    frame.style.border = '0';
    box.style.height = Math.round(1080 * scale) + 'px';
  }

  function initPmgc() {
    var themeSel = document.getElementById('pmgcTheme');
    var sceneSel = document.getElementById('pmgcScene');
    if (!themeSel || !sceneSel) return;
    themeSel.innerHTML = PMGC_THEMES.map(function (row) {
      return '<option value="' + row[0] + '">' + row[1] + '</option>';
    }).join('');
    sceneSel.innerHTML = PMGC_SCENES.map(function (row) {
      return '<option value="' + row[0] + '">' + row[1] + '</option>';
    }).join('');
    var timerField = document.getElementById('pmgcStartDuration');
    var timerButton = document.getElementById('pmgcApplyTimer');
    var timerStatus = document.getElementById('pmgcTimerStatus');
    BC.api('/api/admin/overlay-settings').then(function (x) {
      if (x.s !== 200 || !x.d.ok) throw new Error('Could not load timer settings.');
      var total = Number(x.d.streamStartSeconds) || 1200;
      timerField.value = Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
      timerButton.disabled = false;
    }).catch(function () { timerStatus.textContent = 'Could not load timer settings. Reload to retry.'; });
    function applyTimer() {
      if (timerButton.disabled) return;
      var match = /^(\d{1,3}):([0-5]\d)$/.exec(timerField.value.trim());
      if (!match || Number(match[1]) * 60 + Number(match[2]) < 1) {
        timerField.setAttribute('aria-invalid', 'true');
        timerStatus.textContent = 'Use minutes:seconds, e.g. 5:30. Seconds must be 00–59; minimum 0:01, maximum 999:59.';
        timerField.focus();
        return;
      }
      timerField.removeAttribute('aria-invalid');
      timerButton.disabled = true;
      timerStatus.textContent = 'Saving timer…';
      BC.post('/api/admin/overlay-settings', {streamStartDuration: timerField.value.trim()}).then(function (x) {
        if (x.s !== 200 || !x.d.ok) throw new Error(x.d.error || 'Could not save timer.');
        timerField.value = Number(match[1]) + ':' + match[2];
        timerStatus.textContent = 'Saved ' + timerField.value + '. Stream Starting overlays will restart automatically.';
      }).catch(function (e) { timerStatus.textContent = e.message || 'Could not save timer. Try again.'; })
        .finally(function () { timerButton.disabled = false; });
    }
    timerButton.addEventListener('click', applyTimer);
    timerField.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') { event.preventDefault(); applyTimer(); }
    });
    ['pmgcMap', 'pmgcSponsor', 'pmgcAudio'].forEach(function (id) { document.getElementById(id).addEventListener('change', function () { syncPmgc(true); }); });
    themeSel.addEventListener('change', function () { syncPmgc(true); });
    sceneSel.addEventListener('change', function () { syncPmgc(true); });
    document.getElementById('pmgcCopyBtn').addEventListener('click', function () {
      var url = pmgcUrl();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          BC.toast('Copied PMGC scene URL');
        }, function () { BC.toast('Copy failed — select the URL manually', true); });
      } else {
        BC.toast('Copy failed — select the URL manually', true);
      }
    });
    window.addEventListener('resize', scalePmgc);
    syncPmgc(true);
    scalePmgc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPmgc);
  } else {
    initPmgc();
  }
})();
