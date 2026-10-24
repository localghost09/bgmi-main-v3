/* Public event configuration hydration.
 *
 * The server owns one event document. This script applies it to the static
 * pages through small data attributes, so changing a venue, date or line of
 * copy in /admin/event never requires an HTML edit.
 *
 * Content is applied with textContent (never innerHTML), and links are only
 * created for values the server already validated.
 */
(function (global) {
  'use strict';

  var SOCIAL_LINKS = [
    ['discord_url', 'Discord'],
    ['instagram_url', 'Instagram'],
    ['youtube_url', 'YouTube'],
    ['x_url', 'X / Twitter'],
    ['website_url', 'Website']
  ];

  function byKey(site, key) {
    return site && Object.prototype.hasOwnProperty.call(site, key)
      ? site[key] : '';
  }

  function setText(el, value, upper) {
    if (!el) return;
    var text = value == null ? '' : String(value);
    if (upper) text = text.toUpperCase();
    el.textContent = text;
  }

  function setAttr(el, name, value) {
    if (!el) return;
    var text = value == null ? '' : String(value);
    if (text) el.setAttribute(name, text);
    else el.removeAttribute(name);
  }

  function buildBrand(el, site) {
    if (!el) return;
    var prefix = byKey(site, 'brand_prefix');
    var name = byKey(site, 'brand_name');
    var suffix = byKey(site, 'brand_suffix');
    if (!prefix && !name && !suffix) return;
    el.textContent = '';
    if (prefix) el.appendChild(document.createTextNode(prefix));
    var slash = document.createElement('em');
    slash.textContent = '//';
    el.appendChild(slash);
    if (name) el.appendChild(document.createTextNode(name));
    if (suffix) {
      var mark = document.createElement('b');
      mark.textContent = suffix;
      el.appendChild(mark);
    }
  }

  function buildFooterTitle(el, site) {
    if (!el) return;
    var prefix = byKey(site, 'brand_prefix');
    var name = byKey(site, 'brand_name');
    if (!prefix && !name) return;
    el.textContent = prefix ? prefix + ' ' : '';
    if (name) {
      var span = document.createElement('span');
      span.textContent = name;
      el.appendChild(span);
    }
  }

  function applyGlobal(site) {
    var i;
    var logos = document.querySelectorAll('.nav-logo');
    for (i = 0; i < logos.length; i++) buildBrand(logos[i], site);
    var titles = document.querySelectorAll('.footer-title');
    for (i = 0; i < titles.length; i++) buildFooterTitle(titles[i], site);

    var waters = document.querySelectorAll('.footer-wm');
    for (i = 0; i < waters.length; i++)
      setText(waters[i], byKey(site, 'footer_watermark'));

    var dates = document.querySelectorAll('.footer-date');
    for (i = 0; i < dates.length; i++)
      setText(dates[i], byKey(site, 'footer_date'));

    var taglines = document.querySelectorAll('.footer-tagline');
    for (i = 0; i < taglines.length; i++)
      setText(taglines[i], byKey(site, 'footer_tagline'));

    var ctas = document.querySelectorAll('.footer-cta');
    for (i = 0; i < ctas.length; i++) {
      setText(ctas[i], site.registration_open ? 'Register team' :
        'Registration closed');
      if (!site.registration_open) {
        ctas[i].setAttribute('aria-disabled', 'true');
        ctas[i].setAttribute('href', '#register');
      } else {
        ctas[i].removeAttribute('aria-disabled');
      }
    }

    var bottoms = document.querySelectorAll('.footer-bottom');
    for (i = 0; i < bottoms.length; i++) {
      var ps = bottoms[i].querySelectorAll('p');
      if (ps[0]) setText(ps[0], byKey(site, 'footer_copyright'));
      if (ps[1]) setText(ps[1], byKey(site, 'footer_credit'));
    }

    var mails = document.querySelectorAll('a[href^="mailto:"]');
    for (i = 0; i < mails.length; i++) {
      var email = byKey(site, 'contact_email');
      if (email) {
        mails[i].setAttribute('href', 'mailto:' + email);
        setText(mails[i], 'Contact organizers');
      } else if (mails[i].parentNode) {
        mails[i].parentNode.classList.add('hidden');
      }
    }

    applySocialLinks(site);
  }

  function applySocialLinks(site) {
    var navs = document.querySelectorAll('nav[aria-label="Legal"]');
    for (var i = 0; i < navs.length; i++) {
      var list = navs[i].querySelector('.footer-links');
      if (!list) continue;
      var old = list.querySelectorAll('.js-site-social');
      for (var j = 0; j < old.length; j++) old[j].remove();
      SOCIAL_LINKS.forEach(function (pair) {
        var url = byKey(site, pair[0]);
        if (!url) return;
        var li = document.createElement('li');
        li.className = 'js-site-social';
        var a = document.createElement('a');
        a.className = 'f-link';
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = pair[1];
        li.appendChild(a);
        list.appendChild(li);
      });
      var phone = byKey(site, 'contact_phone');
      if (phone) {
        var pli = document.createElement('li');
        pli.className = 'js-site-social';
        var pa = document.createElement('a');
        pa.className = 'f-link';
        pa.href = 'tel:' + String(phone).replace(/[^\d+]/g, '');
        pa.textContent = phone;
        pli.appendChild(pa);
        list.appendChild(pli);
      }
    }
  }

  function applyDataAttributes(site) {
    var nodes = document.querySelectorAll('[data-site]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-site');
      if (!key) continue;
      var value = byKey(site, key);
      var upper = el.getAttribute('data-site-format') === 'upper';
      if (el.hasAttribute('data-site-attr')) {
        var attr = el.getAttribute('data-site-attr');
        var prefix = el.getAttribute('data-site-prefix') || '';
        setAttr(el, attr, value === '' ? '' : prefix + value);
      } else if (el.getAttribute('data-site-format') === 'hero-date') {
        var stamp = String(value || '').toUpperCase().trim();
        var cut = stamp.lastIndexOf(' ');
        el.textContent = '';
        if (cut > 0) {
          el.appendChild(document.createTextNode(stamp.slice(0, cut + 1)));
          var year = document.createElement('b');
          year.textContent = stamp.slice(cut + 1);
          el.appendChild(year);
        } else {
          el.textContent = stamp;
        }
      } else if (el.hasAttribute('data-site-break') && value) {
        var sep = el.getAttribute('data-site-break') || ',';
        var parts = String(value).split(sep);
        el.textContent = '';
        el.appendChild(document.createTextNode(parts.shift().trim()));
        parts.forEach(function (part) {
          el.appendChild(document.createElement('br'));
          el.appendChild(document.createTextNode(part.trim()));
        });
      } else {
        setText(el, value, upper);
      }
    }
  }

  function applyTitles(site) {
    var title = document.querySelector('title[data-site-title]');
    if (title) {
      var label = title.getAttribute('data-site-title');
      title.textContent = label ? label + ' | ' + site.event_name
        : site.event_name;
    }
    var metas = document.querySelectorAll('meta[data-site-description]');
    for (var i = 0; i < metas.length; i++) {
      var key = metas[i].getAttribute('data-site-description');
      var description = key && byKey(site, key) ? byKey(site, key)
        : byKey(site, 'seo_description');
      setAttr(metas[i], 'content', description);
    }
    var ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) setAttr(ogTitle, 'content', site.event_name);
    var ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) setAttr(ogDesc, 'content', site.seo_description);
    var ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) setAttr(ogImage, 'content', site.social_image);
  }

  function apply(site) {
    if (!site) return;
    applyGlobal(site);
    applyDataAttributes(site);
    applyTitles(site);
    if (document.body) {
      document.body.setAttribute('data-event-open',
        site.registration_open ? '1' : '0');
    }
  }

  var resolveReady;
  global.BGMI_SITE_READY = new Promise(function (resolve) {
    resolveReady = resolve;
  });

  fetch('/api/public/site', { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('site config unavailable');
      return response.json();
    })
    .then(function (payload) {
      var site = payload && payload.ok ? payload.site : null;
      global.BGMI_SITE = site;
      apply(site);
      resolveReady(site);
      try {
        global.dispatchEvent(new CustomEvent('bgmi:site', { detail: site }));
      } catch (e) {
        /* CustomEvent is available in every supported browser; the fallback
           simply leaves the static page copy in place. */
      }
    })
    .catch(function () {
      global.BGMI_SITE = null;
      resolveReady(null);
    });
})(window);
