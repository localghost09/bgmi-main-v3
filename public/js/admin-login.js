/* Admin sign-in form (the Control Room gate). */
(function () {
  'use strict';
  var form = document.getElementById('loginForm');
  if (!form) return;
  var err = document.getElementById('loginError');
  var btn = document.getElementById('loginBtn');
  var TIMEOUT_MS = 15000;
  var FLAG = 'bgmi_login_attempt';

  function fail(message) {
    err.textContent = message;
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }

  // A successful POST only proves the password was right. Navigating to
  // /admin requires the session cookie to survive the trip back — and a
  // browser that refuses to store it just shows this form again with no
  // error at all. Leave a marker so the bounce can explain itself: this
  // script only runs again on the login page, so a live marker means the
  // cookie did not stick.
  try {
    if (sessionStorage.getItem(FLAG) === 'pending') {
      sessionStorage.removeItem(FLAG);
      err.textContent = 'Password accepted, but the browser did not keep the ' +
        'session. Allow cookies for this site, or open it in its own tab, ' +
        'then sign in again.';
    }
  } catch (e) { /* private mode: no sessionStorage, no marker */ }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Signing in…';

    var abort = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () {
      if (abort) abort.abort();
    }, TIMEOUT_MS);

    function clear() {
      clearTimeout(timer);
    }

    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        username: document.getElementById('loginUser').value.trim(),
        password: document.getElementById('loginPass').value
      }),
      signal: abort ? abort.signal : undefined
    })
      .then(function (r) {
        return r.text().then(function (t) {
          var d = {};
          try { d = JSON.parse(t); } catch (e) { /* non-JSON (proxy error page) */ }
          return { s: r.status, d: d };
        });
      })
      .then(function (x) {
        clear();
        if (x.s === 200 && x.d.ok) {
          try { sessionStorage.setItem(FLAG, 'pending'); } catch (e) {}
          btn.textContent = 'Opening Control Room…';
          location.href = '/admin';
          return;
        }
        if (x.s === 200) {
          fail('Sign-in returned an unexpected response. Reload and try again.');
        } else if (!x.d.error && x.s >= 500) {
          fail('The server could not complete sign-in (HTTP ' + x.s + ').');
        } else {
          fail(x.d.error || 'Sign-in failed (HTTP ' + x.s + ').');
        }
      })
      .catch(function (ex) {
        clear();
        if (ex && ex.name === 'AbortError') {
          fail('The server did not answer within ' + (TIMEOUT_MS / 1000) +
            's. Check your connection and try again.');
        } else {
          fail('Could not reach the server. Check your connection and try again.');
        }
      });
  });
})();
