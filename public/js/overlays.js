/* Overlay producer — the original broadcast scenes, token, URLs + preview. */
(function () {
  'use strict';
  var esc = BC.esc;
  var $ = function (id) { return document.getElementById(id); };

  var cfg = null;            // overlay-settings payload

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
    return location.origin + '/pmgc/program?obs=1';
  }

  var programReady = false;
  var programBusy = false;
  function programControls(disabled) {
    ['pmgcTheme','pmgcScene','pmgcMap','pmgcSponsor','pmgcAudio','pmgcSaveCasters'].forEach(function (id) {
      document.getElementById(id).disabled = disabled;
    });
    document.querySelectorAll('#pmgcSceneButtons button').forEach(function (b) {b.disabled = disabled;});
  }
  function markProgram(scene) {
    document.querySelectorAll('#pmgcSceneButtons button').forEach(function (b) {
      var active = b.dataset.scene === scene;
      b.classList.toggle('bc-btn--go', active);
      b.setAttribute('aria-pressed', String(active));
    });
  }
  function saveProgram(patch) {
    if (!programReady || programBusy) return;
    programBusy = true;
    programControls(true);
    var status = document.getElementById('pmgcProgramStatus');
    status.textContent = 'Sending to OBS…';
    BC.post('/api/admin/overlay-settings', {pmgcProgram: patch}).then(function (x) {
      if (x.s !== 200 || !x.d.ok) throw new Error(x.d.error || 'Could not update program.');
      markProgram(document.getElementById('pmgcScene').value);
      status.textContent = 'Saved — OBS Program follows these controls automatically.';
    }).catch(function (e) { status.textContent = 'Not applied: ' + e.message + ' Try again.'; })
      .finally(function () {programBusy = false; programControls(false);});
  }
  function syncPmgc(changed) {
    var url = pmgcUrl();
    document.getElementById('pmgcUrl').value = url;
    document.getElementById('pmgcOpenBtn').href = url;
    var theme = document.getElementById('pmgcTheme').value || 'bmps-2024';
    var scene = document.getElementById('pmgcScene').value || 'opening';
    document.getElementById('pmgcGuides').href = location.origin + '/pmgc/' + scene + '?theme=' + encodeURIComponent(theme) + '&ui=1&guides=1';
    var frame = document.getElementById('pmgcPreviewFrame');
    if (changed && frame && !frame.getAttribute('src')) frame.src = url + '&preview=1';
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
    programControls(true);
    var sceneButtons = document.getElementById('pmgcSceneButtons');
    PMGC_SCENES.forEach(function (row) {
      var button = document.createElement('button');
      button.type = 'button'; button.disabled = true; button.className = 'bc-btn'; button.textContent = row[1]; button.dataset.scene = row[0];
      button.addEventListener('click', function () {sceneSel.value = row[0]; syncPmgc(false); saveProgram({scene: row[0]});});
      sceneButtons.appendChild(button);
    });
    document.getElementById('pmgcSaveCasters').addEventListener('click', function () {
      saveProgram({caster1: document.getElementById('pmgcCaster1').value,
        caster2: document.getElementById('pmgcCaster2').value,
        tagline1: document.getElementById('pmgcTagline1').value,
        tagline2: document.getElementById('pmgcTagline2').value});
    });
    var timerField = document.getElementById('pmgcStartDuration');
    var timerButton = document.getElementById('pmgcApplyTimer');
    var timerStatus = document.getElementById('pmgcTimerStatus');
    BC.api('/api/admin/overlay-settings').then(function (x) {
      if (x.s !== 200 || !x.d.ok) throw new Error('Could not load timer settings.');
      var total = Number(x.d.streamStartSeconds) || 1200;
      timerField.value = Math.floor(total / 60) + ':' + String(total % 60).padStart(2, '0');
      timerButton.disabled = false;
      var program = x.d.pmgcProgram || {};
      themeSel.value = program.theme || 'bmps-2024'; sceneSel.value = program.scene || 'opening';
      document.getElementById('pmgcCaster1').value = program.caster1 == null ? 'NOVA' : program.caster1;
      document.getElementById('pmgcCaster2').value = program.caster2 == null ? 'ARC' : program.caster2;
      document.getElementById('pmgcTagline1').value = program.tagline1 || '';
      document.getElementById('pmgcTagline2').value = program.tagline2 || '';
      document.getElementById('pmgcMap').value = program.map || '';
      document.getElementById('pmgcSponsor').value = program.sponsor || '';
      document.getElementById('pmgcAudio').checked = program.audio !== false;
      programReady = true; programControls(false); markProgram(sceneSel.value); syncPmgc(true);
      document.getElementById('pmgcProgramStatus').textContent = 'Connected — copy the Program URL once, then click a scene below.';
    }).catch(function () { timerStatus.textContent = 'Could not load timer settings. Reload to retry.'; document.getElementById('pmgcProgramStatus').textContent = 'Could not load Program settings. Reload to retry.'; });
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
    [['pmgcMap','map'],['pmgcSponsor','sponsor'],['pmgcAudio','audio']].forEach(function (pair) {
      document.getElementById(pair[0]).addEventListener('change', function () {
        var patch = {}; patch[pair[1]] = pair[1] === 'audio' ? this.checked : this.value;
        saveProgram(patch);
      });
    });
    themeSel.addEventListener('change', function () {syncPmgc(false); saveProgram({theme: this.value});});
    sceneSel.addEventListener('change', function () {syncPmgc(false); saveProgram({scene: this.value});});
    document.getElementById('pmgcCopyBtn').addEventListener('click', function () {
      var url = pmgcUrl();
      var field = document.getElementById('pmgcUrl');
      field.value = url;
      function fallback() {
        field.focus();
        field.select();
        field.setSelectionRange(0, url.length);
        var copied = false;
        try { copied = document.execCommand('copy'); } catch (e) { /* manual copy below */ }
        if (copied) BC.toast('Copied common PMGC Program URL');
        else BC.toast('Automatic copy is blocked. URL selected — press Ctrl+C or Cmd+C, or long-press to copy.', true);
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          Promise.resolve(navigator.clipboard.writeText(url)).then(function () {
            BC.toast('Copied common PMGC Program URL');
          }, fallback);
        } else { fallback(); }
      } catch (e) { fallback(); }
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
