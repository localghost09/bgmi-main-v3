# Security notes

- **Sessions** — `bgmi_admin` cookie is httpOnly/SameSite, stored hashed.
  Two lifetimes apply: an **absolute cap** (`BGMI_SESSION_TTL`, default 14 d)
  and an **idle timeout** (`BGMI_SESSION_IDLE_TTL`, default 8 h) that revokes
  an untouched session on its next request.
- **Login throttle** — per-IP (10/5 min) *and* per-username (5 failures/5 min,
  cleared on success), plus a dummy scrypt for unknown users so response times
  don't reveal whether an account exists. Failure messages never distinguish
  "no such user" from "wrong password".
- **Same-origin writes** — every state-changing admin request checks
  `Origin`/`Referer` against `Host` (403 on mismatch); CSRF tokens remain
  required on top of that.
- **Headers** — `X-Content-Type-Options: nosniff` and `Referrer-Policy:
  strict-origin-when-cross-origin` on every response.
- **Framing** — `X-Frame-Options: DENY` on `/admin*`, `SAMEORIGIN` everywhere
  else, backed by a CSP `frame-ancestors 'self'`. See *Preview hosts* below for
  the one exception and why it exists.
- **Preview hosts** — when the request arrives through a sandbox preview
  proxy (`*.e2b.app`, or anything listed in `BGMI_PREVIEW_HOSTS`), the app is
  rendered inside a cross-site iframe on a host we do not control. Both the
  frame policy and the cookie have to change or sign-in silently no-ops:
  `X-Frame-Options` is dropped in favour of `frame-ancestors *`, and
  `bgmi_admin` is issued `SameSite=None; Secure; Partitioned` (CHIPS) so it is
  sent from a third-party frame even with third-party cookies disabled.
  `BGMI_FRAME_ANCESTORS` overrides the ancestor list for a real deployment.
  Production hosts keep `DENY`/`'self'` — the exception never applies unless
  the request actually came from a preview host.
- **Path safety** — `.py/.db/.db-wal/.db-shm/.pyc`, dotfiles and `..` escapes
  are blocked; `uploads/` resolves only inside `BGMI_UPLOADS`.
- **Privacy** — `/status` misses are byte-identical regardless of whether the
  Reg ID or the hint was wrong; notification/queue payloads carry team ids, not
  addresses; exports are recorded in the audit log.
- **Integrity** — multi-statement admin writes run in `BEGIN IMMEDIATE`
  transactions; rejected registrations can never leave orphan logo files.

### Temporary admin login bypass

`BGMI_ADMIN_LOGIN_BYPASS=1` explicitly disables the session requirement for
admin pages and APIs, using the `preview-admin` identity. This is OFF by
default. CSRF and same-origin checks still apply to writes. Anyone able to
reach the server has admin access while enabled; use only for a temporary
preview, never a public deployment. Unset the variable and restart to restore
normal cookie authentication. No database credentials are changed.
