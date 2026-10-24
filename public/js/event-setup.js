/* Event setup — one admin form for every public event value.
   The field schema is data, so adding a field here and to siteconfig.py is
   all that is needed; no public page has to be edited. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    site: null, computed: null, formats: null, dirty: false,
    heroSynced: false
  };

  /* Split an event name into the three hand-lettered hero lines. The default
     name "BGMI CUP NOIDA 2026" becomes "BGMI CUP" / "NOIDA" / "2026". */
  function splitHeroTitle(name) {
    var words = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!words.length) return ['', '', ''];
    if (words.length === 1) return [words[0], '', ''];
    if (words.length === 2) return [words[0], '', words[1]];
    return [words.slice(0, 2).join(' '),
      words.slice(2, -1).join(' '),
      words[words.length - 1]];
  }

  function heroIsSynced(site) {
    var parts = splitHeroTitle(site.event_name);
    return ['hero_title_1', 'hero_title_2', 'hero_title_3'].every(
      function (key, i) { return (site[key] || '') === parts[i]; });
  }

  var GROUPS = [
    {
      id: 'identity', title: 'Identity', hint: 'Name, edition and organizer shown everywhere.',
      open: true,
      fields: [
        ['event_name', 'Event name', 'text', 'Used in browser titles, the squad pass and overlays. The big homepage headline is under Home hero.'],
        ['brand_prefix', 'Brand prefix', 'text', 'Word before the nav slash, e.g. BGMI.'],
        ['brand_name', 'Brand word', 'text', 'Main nav word, e.g. CUP.'],
        ['brand_suffix', 'Brand suffix', 'text', 'Small edition mark in the nav, e.g. .26.'],
        ['edition_label', 'Edition label', 'text', 'Short edition code used on tickets and overlays.'],
        ['organizer_name', 'Organizer', 'text', 'Shown on the stream-start overlay.']
      ]
    },
    {
      id: 'when', title: 'Date, time & format', hint: 'One place for every date, clock and registration window.',
      open: true,
      fields: [
        ['start_date', 'Event start date', 'date', 'Real date used by countdowns and tickets.'],
        ['end_date', 'Event end date', 'date', 'Same as start for a one-day cup.'],
        ['date_format', 'Date format', 'select', 'How dates are written across the public site.', 'dateFormats'],
        ['start_time', 'Event start time', 'time', 'Local time in the timezone below.'],
        ['end_time', 'Event end time', 'time', 'Optional; used for metadata.'],
        ['checkin_time', 'Check-in time', 'time', 'Shown on schedule and staff notes.'],
        ['time_format', 'Clock format', 'select', '12-hour or 24-hour display.', 'timeFormats'],
        ['timezone', 'Timezone', 'text', 'IANA label, e.g. Asia/Kolkata.'],
        ['timezone_short', 'Timezone abbreviation', 'text', 'Short label after times, e.g. IST.'],
        ['timezone_offset', 'UTC offset', 'text', 'Used for countdowns, e.g. +05:30.'],
        ['registration_deadline', 'Registration deadline', 'datetime-local', 'Leave blank for no deadline. The server enforces it.'],
        ['registration_open', 'Registration open', 'checkbox', 'Turn off to close the public form immediately.'],
        ['registration_closed_message', 'Closed message', 'textarea', 'Shown on the form when registration is closed.'],
        ['slot_limit', 'Approved team slots', 'number', 'Approvals stop here unless an admin overrides.', { min: 1, max: 256 }]
      ]
    },
    {
      id: 'venue', title: 'Venue & location', hint: 'The place people search for, not a code constant.',
      fields: [
        ['location_name', 'City / short location', 'text', 'Used in the footer, hero HUD and page copy.'],
        ['venue_name', 'Venue name', 'text', 'Full venue or "Online".'],
        ['venue_address', 'Venue address', 'textarea', 'Street, city, state, country.'],
        ['coordinates', 'Map coordinates', 'text', 'Optional HUD line, e.g. 28.5355° N, 77.3910° E.']
      ]
    },
    {
      id: 'hero', title: 'Home hero', hint: 'Every line and stat above the fold.',
      fields: [
        ['hero_kicker', 'Hero kicker', 'text', 'Small eyebrow above the title.'],
        ['hero_title_1', 'Title line 1', 'text', 'Cream line.'],
        ['hero_title_2', 'Title line 2', 'text', 'Acid line.'],
        ['hero_title_3', 'Title line 3', 'text', 'Blood-red line.'],
        ['hero_note_1', 'Side note line 1', 'text', 'Small note beside the title.'],
        ['hero_note_2', 'Side note line 2', 'text', 'Before the underlined word.'],
        ['hero_note_2_accent', 'Side note accent', 'text', 'The underlined word.'],
        ['hero_date_override', 'Hero date override', 'text', 'Optional. Leave blank to use the formatted event date.'],
        ['hero_tagline_1', 'Hero tagline line 1', 'text', 'Bold line above the countdown.'],
        ['hero_tagline_2', 'Hero tagline line 2', 'text', 'Second line.'],
        ['hero_cta_primary', 'Primary button label', 'text', 'Scrolls to the form.'],
        ['hero_cta_secondary', 'Secondary button label', 'text', 'Scrolls to the format section.'],
        ['hero_hud_location', 'HUD location', 'text', 'Top-left call box.'],
        ['hero_hud_date', 'HUD date', 'text', 'Top-left date line.'],
        ['hero_hud_tag', 'HUD tag line', 'text', 'Top-left third line.'],
        ['stat_1_value', 'Stat 1 value', 'text', 'First hero stat.'],
        ['stat_1_label', 'Stat 1 label', 'text', 'First hero stat label.'],
        ['stat_2_value', 'Stat 2 value', 'text', 'Second hero stat.'],
        ['stat_2_label', 'Stat 2 label', 'text', 'Second hero stat label.'],
        ['stat_3_value', 'Stat 3 value', 'text', 'Third hero stat.'],
        ['stat_3_label', 'Stat 3 label', 'text', 'Third hero stat label.']
      ]
    },
    {
      id: 'sections', title: 'Home sections', hint: 'The Meta, Format and Register headings.',
      fields: [
        ['meta_label', 'Meta label', 'text', 'Small label above the heading.'],
        ['meta_title_1', 'Meta heading line 1', 'text', 'First line.'],
        ['meta_title_2', 'Meta heading line 2', 'text', 'Highlighted line.'],
        ['meta_desc', 'Meta description', 'textarea', 'Paragraph under the heading.'],
        ['meta_card_1_value', 'Meta card 1 value', 'text', 'Big number, e.g. 04.'],
        ['meta_card_1_label', 'Meta card 1 label', 'text', 'Card label.'],
        ['meta_card_1_desc', 'Meta card 1 description', 'textarea', 'Card description.'],
        ['meta_card_2_value', 'Meta card 2 value', 'text', 'Big number, e.g. 02.'],
        ['meta_card_2_label', 'Meta card 2 label', 'text', 'Card label.'],
        ['meta_card_2_desc', 'Meta card 2 description', 'textarea', 'Card description.'],
        ['meta_card_3_value', 'Meta card 3 value', 'text', 'Big number or symbol.'],
        ['meta_card_3_label', 'Meta card 3 label', 'text', 'Card label.'],
        ['meta_card_3_desc', 'Meta card 3 description', 'textarea', 'Card description.'],
        ['format_label', 'Format label', 'text', 'Small label above the heading.'],
        ['format_title_1', 'Format heading line 1', 'text', 'First line.'],
        ['format_title_2', 'Format heading line 2', 'text', 'Highlighted line.'],
        ['format_desc', 'Format description', 'textarea', 'Paragraph under the heading.'],
        ['format_card_1_value', 'Format card 1 value', 'text', 'Big label, e.g. I.'],
        ['format_card_1_label', 'Format card 1 label', 'text', 'Card label.'],
        ['format_card_1_desc', 'Format card 1 description', 'textarea', 'Card description.'],
        ['format_card_2_value', 'Format card 2 value', 'text', 'Big label, e.g. II.'],
        ['format_card_2_label', 'Format card 2 label', 'text', 'Card label.'],
        ['format_card_2_desc', 'Format card 2 description', 'textarea', 'Card description.'],
        ['format_card_3_value', 'Format card 3 value', 'text', 'Big label, e.g. III.'],
        ['format_card_3_label', 'Format card 3 label', 'text', 'Card label.'],
        ['format_card_3_desc', 'Format card 3 description', 'textarea', 'Card description.'],
        ['register_label', 'Register label', 'text', 'Small label above the registration form.'],
        ['register_title_1', 'Register heading line 1', 'text', 'First line.'],
        ['register_title_2', 'Register heading line 2', 'text', 'Highlighted line.'],
        ['register_desc', 'Register description', 'textarea', 'Paragraph under the heading.']
      ]
    },
    {
      id: 'copy', title: 'Page copy', hint: 'The ledes on Schedule, Teams, Status, Live, Results and About.',
      fields: [
        ['schedule_page_lede', 'Schedule lede', 'textarea', 'Intro under the Schedule heading.'],
        ['teams_page_lede', 'Teams lede', 'textarea', 'Intro under the approved teams heading.'],
        ['status_page_lede', 'Status lede', 'textarea', 'Intro under the status lookup heading.'],
        ['live_page_lede', 'Live lede', 'textarea', 'Intro under the live heading.'],
        ['results_page_lede', 'Results lede', 'textarea', 'Intro under the results heading.'],
        ['about_page_badge', 'About badge', 'text', 'Organizer badge.'],
        ['about_page_lede', 'About lede', 'textarea', 'Intro under the About heading.'],
        ['about_page_story', 'About story', 'textarea', 'Longer paragraph about the organizers.'],
        ['about_dossier_status', 'Line-up status row', 'text', 'Dossier card status, e.g. Active.'],
        ['about_dossier_threat', 'Line-up threat row', 'text', 'Dossier card threat, e.g. Elite.'],
        ['about_dossier_loyalty', 'Line-up loyalty row', 'text', 'Dossier card loyalty, e.g. Unquestioned.'],
        ['about_lineup', 'About line-up', 'textarea', 'One member per line: name | role | file ref | skills (comma separated) | dossier (comma separated) | optional image path.']
      ]
    },
    {
      id: 'registration', title: 'Registration & tickets', hint: 'Form note, schedule note and squad pass details.',
      fields: [
        ['registration_privacy_note', 'Privacy note under the form', 'textarea', 'Short storage/consent sentence.'],
        ['schedule_note', 'Public schedule note', 'textarea', 'Plain-text day-of schedule. Also used by /schedule.'],
        ['ticket_mode', 'Squad pass mode', 'text', 'e.g. Squad • TPP • 6 rounds.'],
        ['ticket_entry', 'Squad pass entry', 'text', 'e.g. Free • Non-transferable.']
      ]
    },
    {
      id: 'contact', title: 'Contact & footer', hint: 'The links and legal line at the bottom of every page.',
      fields: [
        ['contact_email', 'Contact email', 'email', 'Used by the Contact organizers link.'],
        ['contact_phone', 'Contact phone', 'text', 'Optional public phone.'],
        ['discord_url', 'Discord URL', 'url', 'Optional.'],
        ['instagram_url', 'Instagram URL', 'url', 'Optional.'],
        ['youtube_url', 'YouTube URL', 'url', 'Optional.'],
        ['x_url', 'X / Twitter URL', 'url', 'Optional.'],
        ['website_url', 'Website URL', 'url', 'Optional.'],
        ['footer_tagline', 'Footer tagline', 'text', 'Short line under the footer brand.'],
        ['footer_copyright', 'Copyright / disclaimer', 'textarea', 'Bottom legal line.'],
        ['footer_credit', 'Credit line', 'text', 'Small credit line.'],
        ['footer_watermark', 'Footer watermark', 'text', 'Large background word.']
      ]
    },
    {
      id: 'seo', title: 'Search & social', hint: 'Browser tab text and link previews.',
      fields: [
        ['seo_description', 'Meta description', 'textarea', 'Used on public pages that do not define their own description.'],
        ['social_image', 'Social image URL', 'url', 'Optional absolute image or /uploads path.']
      ]
    },
    {
      id: 'overlay', title: 'Broadcast & overlays', hint: 'Event identity used by the OBS scenes. Logo and colour live in Overlays.',
      fields: [
        ['overlay_format_label', 'Overlay format label', 'text', 'Shown on the format and stream-start scenes.'],
        ['overlay_semi_slots', 'Semifinal slots', 'number', 'Qualification panel number.', { min: 1, max: 128 }],
        ['overlay_final_slots', 'Final slots', 'number', 'Qualification panel number.', { min: 1, max: 128 }],
        ['overlay_countdown_label', 'Countdown caption', 'text', 'Bottom line of the countdown scene.']
      ]
    }
  ];

  var MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul',
    'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday',
    'Friday', 'Saturday'];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function parseDate(value) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!m) return null;
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  function fmtDate(value, pattern) {
    var d = parseDate(value);
    if (!d) return '';
    var map = {
      dddd: DAYS_FULL[d.getDay()],
      MMMM: MONTHS_FULL[d.getMonth()],
      MMM: MONTHS_SHORT[d.getMonth()],
      YYYY: String(d.getFullYear()),
      MM: ('0' + (d.getMonth() + 1)).slice(-2),
      DD: ('0' + d.getDate()).slice(-2),
      D: String(d.getDate())
    };
    return String(pattern || 'DD MMMM YYYY')
      .replace(/dddd|MMMM|YYYY|MMM|DD|D|MM/g, function (token) {
        return map[token];
      });
  }

  function fmtRange(start, end, pattern) {
    if (!start) return '';
    if (!end || end === start) return fmtDate(start, pattern);
    var a = parseDate(start), b = parseDate(end);
    if (a && b && a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() && pattern.indexOf('dddd') === -1 &&
        (pattern.indexOf('MMMM') !== -1 || pattern.indexOf('MMM') !== -1)) {
      var month = pattern.indexOf('MMMM') !== -1 ? MONTHS_FULL[a.getMonth()]
        : MONTHS_SHORT[a.getMonth()];
      return a.getDate() + '-' + b.getDate() + ' ' + month + ' ' +
        a.getFullYear();
    }
    return fmtDate(start, pattern) + ' \u2013 ' + fmtDate(end, pattern);
  }

  function fmtTime(value, format) {
    var m = /^(\d{2}):(\d{2})/.exec(String(value || ''));
    if (!m) return '';
    var h = Number(m[1]), min = m[2];
    if (format === '24h') return m[1] + ':' + min;
    var suffix = h < 12 ? 'AM' : 'PM';
    return (h % 12 || 12) + ':' + min + ' ' + suffix;
  }

  function fieldValue(key) {
    var el = document.getElementsByName(key)[0];
    if (!el) return '';
    if (el.type === 'checkbox') return !!el.checked;
    if (el.type === 'number') return el.value === '' ? 0 : Number(el.value);
    return el.value;
  }

  function updatePreview() {
    var name = fieldValue('event_name') || 'Untitled event';
    var date = fmtRange(fieldValue('start_date'), fieldValue('end_date'),
      fieldValue('date_format'));
    var time = fmtTime(fieldValue('start_time'), fieldValue('time_format'));
    var tz = String(fieldValue('timezone_short') || '').trim();
    var venue = fieldValue('venue_name') || fieldValue('location_name');
    var open = !!fieldValue('registration_open');
    var deadline = String(fieldValue('registration_deadline') || '');
    var closedMessage = fieldValue('registration_closed_message') || '';
    var note = '';
    if (open && deadline) {
      var dl = new Date(deadline);
      if (!isNaN(dl) && dl.getTime() < Date.now()) {
        open = false;
        note = 'Deadline passed: ' + fmtDate(deadline.slice(0, 10),
          fieldValue('date_format')) + ' ' +
          fmtTime(deadline.slice(11, 16), fieldValue('time_format'));
      }
    }
    if (!open) note = note || closedMessage;
    $('pvName').textContent = name;
    $('pvDate').textContent = date || 'Date not set';
    $('pvTime').textContent = (time ? time + (tz ? ' ' + tz : '') : 'Time not set');
    $('pvVenue').textContent = [venue, fieldValue('venue_address')]
      .filter(Boolean).join(', ');
    $('pvStatus').textContent = open ? 'Registration open' : 'Registration closed';
    $('pvStatus').setAttribute('data-closed', open ? '0' : '1');
    $('pvNote').textContent = note;
    $('pvEyebrow').textContent = fieldValue('edition_label') || 'Event preview';
  }

  function inputHtml(field, value, formats) {
    var key = field[0], label = field[1], type = field[2], help = field[3];
    var opts = field[4] || {};
    var id = 'ev-' + key;
    var wide = (type === 'textarea' || key === 'event_name' ||
      key === 'registration_closed_message' || key === 'registration_privacy_note' ||
      key === 'schedule_note' || key === 'footer_copyright' ||
      key === 'seo_description' || key === 'about_page_story' ||
      key === 'venue_address') ? ' ev-field--wide' : '';
    var control;

    if (type === 'checkbox') {
      control = '<label class="ev-check"><input type="checkbox" id="' + id +
        '" name="' + key + '"' + (value ? ' checked' : '') + '> ' +
        '<span>' + esc(help || label) + '</span></label>';
      return '<div class="ev-field' + wide + '"><span class="ev-label">' +
        esc(label) + '</span>' + control + '</div>';
    }
    if (type === 'select') {
      var options = formats[opts] || [];
      control = '<select class="ev-select" id="' + id + '" name="' + key + '">' +
        options.map(function (o) {
          var labelText = o;
          if (opts === 'dateFormats') {
            labelText = o + ' \u2014 ' + fmtDate('2026-11-14', o);
          } else if (o === '12h') {
            labelText = '12-hour (4:00 PM)';
          } else if (o === '24h') {
            labelText = '24-hour (16:00)';
          }
          return '<option value="' + esc(o) + '"' +
            (String(value) === String(o) ? ' selected' : '') + '>' +
            esc(labelText) + '</option>';
        }).join('') + '</select>';
    } else if (type === 'textarea') {
      control = '<textarea class="ev-textarea" id="' + id + '" name="' + key +
        '" rows="3">' + esc(value) + '</textarea>';
    } else {
      var attrs = '';
      if (type === 'number') {
        attrs = ' min="' + (opts.min || 0) + '" max="' + (opts.max || 999) +
          '" step="1"';
      }
      control = '<input class="ev-input" type="' + esc(type) + '" id="' + id +
        '" name="' + key + '" value="' + esc(value) + '"' + attrs + '>';
    }
    return '<div class="ev-field' + wide + '"><label class="ev-label" for="' + id +
      '">' + esc(label) + '</label>' + control +
      (help ? '<span class="ev-help">' + esc(help) + '</span>' : '') + '</div>';
  }

  function render(site, formats) {
    var fields = $('setupFields');
    var nav = $('sectionNav');
    fields.innerHTML = '';
    nav.innerHTML = '';
    GROUPS.forEach(function (group, index) {
      var section = document.createElement('details');
      section.className = 'ev-section';
      section.id = 'ev-section-' + group.id;
      if (group.open) section.open = true;
      section.innerHTML = '<summary><span class="ev-section-title">' +
        esc(group.title) + '</span><span class="ev-section-hint">' +
        esc(group.hint) + '</span></summary><div class="ev-grid">' +
        group.fields.map(function (field) {
          return inputHtml(field, site[field[0]], formats);
        }).join('') + '</div>';
      fields.appendChild(section);

      var link = document.createElement('a');
      link.href = '#ev-section-' + group.id;
      link.textContent = group.title;
      link.addEventListener('click', function () { section.open = true; });
      nav.appendChild(link);
    });
  }

  function collect() {
    var data = {};
    GROUPS.forEach(function (group) {
      group.fields.forEach(function (field) {
        data[field[0]] = fieldValue(field[0]);
      });
    });
    return data;
  }

  function setDirty(dirty) {
    state.dirty = dirty;
    $('saveBar').classList.toggle('is-dirty', dirty);
    $('dirtyLabel').textContent = dirty ? 'Unsaved changes' :
      'All changes published';
  }

  function showError(message) {
    var el = $('siteError');
    el.textContent = message || '';
    el.classList.toggle('hidden', !message);
  }

  function marksInvalid(field) {
    var el = field && document.getElementsByName(field)[0];
    if (!el) return;
    el.setAttribute('aria-invalid', 'true');
    if (el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    if (el.focus) el.focus({ preventScroll: true });
  }

  function fill(site) {
    GROUPS.forEach(function (group) {
      group.fields.forEach(function (field) {
        var el = document.getElementsByName(field[0])[0];
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!site[field[0]];
        else el.value = site[field[0]] == null ? '' : site[field[0]];
      });
    });
    state.heroSynced = heroIsSynced(site);
    updatePreview();
  }

  function load() {
    BC.api('/api/admin/site').then(function (x) {
      if (x.s !== 200 || !x.d.ok) {
        showError(x.d.error || 'Could not load event settings.');
        return;
      }
      state.site = x.d.site;
      state.computed = x.d.computed;
      state.formats = { dateFormats: x.d.dateFormats, timeFormats: x.d.timeFormats };
      render(x.d.site, state.formats);
      fill(x.d.site);
      setDirty(false);
      $('savedAt').textContent = x.d.site.site_updated
        ? 'Last published ' + new Date(x.d.site.site_updated).toLocaleString()
        : 'Not published yet';
      showError('');
    }).catch(function () {
      showError('Network error while loading event settings.');
    });
  }

  function onFieldChanged(e) {
    if (!e.target || !e.target.name) return;
    e.target.removeAttribute('aria-invalid');
    if (e.target.name === 'event_name' && state.heroSynced) {
      var parts = splitHeroTitle(e.target.value);
      ['hero_title_1', 'hero_title_2', 'hero_title_3'].forEach(
        function (key, i) {
          var el = document.getElementsByName(key)[0];
          if (el) el.value = parts[i];
        });
    }
    if (/^hero_title_[123]$/.test(e.target.name)) state.heroSynced = false;
    setDirty(true);
    updatePreview();
  }

  $('siteForm').addEventListener('input', onFieldChanged);
  $('siteForm').addEventListener('change', onFieldChanged);

  function setPublishing(busy) {
    ['saveBtn', 'saveTopBtn'].forEach(function (id) {
      var btn = $(id);
      if (!btn) return;
      btn.disabled = busy;
      btn.textContent = busy ? 'Publishing\u2026' : 'Publish changes';
    });
    $('saveBar').classList.toggle('is-saving', busy);
  }

  $('siteForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var data = collect();
    setPublishing(true);
    showError('');
    BC.api('/api/admin/site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site: data })
    }).then(function (x) {
      if (x.s === 200 && x.d.ok) {
        state.site = x.d.site;
        state.computed = x.d.computed;
        fill(x.d.site);
        setDirty(false);
        $('savedAt').textContent = 'Published ' + new Date().toLocaleString();
        BC.toast('Event settings published');
      } else {
        showError(x.d.error || 'Could not publish these changes.');
        if (x.d.field) marksInvalid(x.d.field);
        BC.toast(x.d.error || 'Publish failed', true);
      }
    }).catch(function () {
      showError('Network error while publishing. Nothing was lost.');
      BC.toast('Network error', true);
    }).then(function () {
      setPublishing(false);
    });
  });

  $('reloadBtn').addEventListener('click', function () {
    if (state.dirty && !window.confirm('Discard unsaved changes and reload?')) return;
    load();
  });

  window.addEventListener('beforeunload', function (e) {
    if (!state.dirty) return;
    e.preventDefault();
    e.returnValue = '';
  });

  BC.boot(function () { load(); });
})();
