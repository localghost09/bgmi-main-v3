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

  // Remove the old bounce marker: it could persist after a successful login.
  try { sessionStorage.removeItem(FLAG); } catch (e) {}

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
        if (x.s === 200 && x.d.ok) {
          btn.textContent = 'Checking session…';
          return fetch('/api/admin/me', {
            credentials: 'same-origin', cache: 'no-store',
            signal: abort ? abort.signal : undefined
          }).then(function (r) {
            clear();
            if (r.ok) {
              location.replace('/admin');
            } else {
              fail('Password accepted, but the session could not be verified. ' +
                'Click “Open sign-in in a new tab” below, then sign in there.');
            }
          });
        }
        clear();
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
