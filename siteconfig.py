"""Central, admin-editable event/site configuration.

Everything the public site needs to describe *this* event lives here as one
JSON document in the existing ``settings`` table.  The module deliberately has
no imports from ``server`` or ``broadcast`` so both can use it without a
circular dependency.

The public payload is computed: dates, times, registration status and overlay
branding are derived from the stored ISO values, which keeps the same event
description consistent across the website, the status ticket and OBS.
"""

import json
import re
from datetime import datetime, timezone

SITE_KEY = "site_config"
SITE_UPDATED_KEY = "site_updated"

# Accepted date patterns shown in the admin date-format picker.
DATE_FORMATS = {
    "DD MMM YYYY": "14 Nov 2026",
    "DD MMMM YYYY": "14 November 2026",
    "D MMMM YYYY": "14 November 2026",
    "MMM DD, YYYY": "Nov 14, 2026",
    "MMMM DD, YYYY": "November 14, 2026",
    "YYYY-MM-DD": "2026-11-14",
    "DD/MM/YYYY": "14/11/2026",
    "DD.MM.YYYY": "14.11.2026",
    "dddd, DD MMMM YYYY": "Saturday, 14 November 2026",
}

TIME_FORMATS = ("12h", "24h")

DEFAULT_LINEUP = (
    "FE_PSYCHO | Coach | #002-01 | Strategy, Analysis, Team Play, Leadership "
    "| Tactical Mind, Squad Builder, Always a Step Ahead |\n"
    "FE_KANNU | Assaulter | #002-02 | Rush, Fragging, Positioning, Team Fight "
    "| Aggressive Entry, High Impact, Built for the Last Zone |"
)

SITE_DEFAULTS = {
    # ---- identity ---------------------------------------------------------
    "event_name": "BGMI CUP NOIDA 2026",
    "brand_prefix": "BGMI",
    "brand_name": "CUP",
    "brand_suffix": ".26",
    "edition_label": "CUP.26",
    "organizer_name": "Fearless Esports",

    # ---- when & where -----------------------------------------------------
    "start_date": "2026-11-14",
    "end_date": "2026-11-14",
    "start_time": "16:00",
    "end_time": "21:00",
    "checkin_time": "15:00",
    "date_format": "DD MMMM YYYY",
    "time_format": "12h",
    "timezone": "Asia/Kolkata",
    "timezone_short": "IST",
    "timezone_offset": "+05:30",
    "location_name": "Greater Noida",
    "venue_name": "Galgotias Polytechnic",
    "venue_address": "Galgotias Polytechnic, Greater Noida, Uttar Pradesh, India",
    "coordinates": "28.5355\u00b0 N, 77.3910\u00b0 E",

    # ---- registration -----------------------------------------------------
    "registration_open": True,
    "registration_deadline": "",
    "registration_closed_message":
        "Registration is closed for this edition. Follow the organizers for "
        "the next drop.",
    "registration_privacy_note":
        "We store your team sheet (names, IGNs, UIDs, captain contact) only "
        "to run the tournament \u2014 never sold, purged after the event.",
    "slot_limit": 16,

    # ---- home hero --------------------------------------------------------
    "hero_kicker": "BATTLEGROUNDS MOBILE INDIA",
    "hero_title_1": "BGMI CUP",
    "hero_title_2": "NOIDA",
    "hero_title_3": "2026",
    "hero_note_1": "Same Map.",
    "hero_note_2": "New",
    "hero_note_2_accent": "Legends.",
    "hero_date_override": "",
    "hero_tagline_1": "Four squads. One drop. Zero mercy.",
    "hero_tagline_2": "Bring your squad, not your ego.",
    "hero_cta_primary": "Register your squad",
    "hero_cta_secondary": "See the format",
    "hero_hud_location": "",
    "hero_hud_date": "",
    "hero_hud_tag": "LIVE THE BATTLE",
    "stat_1_value": "04",
    "stat_1_label": "Teams",
    "stat_2_value": "06",
    "stat_2_label": "Matches",
    "stat_3_value": "01",
    "stat_3_label": "Champion",

    # ---- home section copy ------------------------------------------------
    "meta_label": "The Meta",
    "meta_title_1": "Four drop in.",
    "meta_title_2": "Zero passengers.",
    "meta_desc":
        "A BGMI squad tournament for people who land Pochinki without a plan "
        "and call it \"strategy\".",
    "meta_card_1_value": "04",
    "meta_card_1_label": "Starters",
    "meta_card_1_desc": "One IGL, three brave souls. All four UIDs required.",
    "meta_card_2_value": "02",
    "meta_card_2_label": "Substitutes",
    "meta_card_2_desc": "Optional. Bench depth is a strategy, not a backup plan.",
    "meta_card_3_value": "\u221e",
    "meta_card_3_label": "Excuses",
    "meta_card_3_desc": "Not accepted. Ping is a mindset. Server is a choice.",
    "format_label": "The Format",
    "format_title_1": "Six matches.",
    "format_title_2": "One chicken.",
    "format_desc":
        "Points table decides everything. Placement kills matter. So does "
        "not disconnecting mid-final.",
    "format_card_1_value": "I",
    "format_card_1_label": "Qualifiers \u2014 6 rounds",
    "format_card_1_desc":
        "Erangel \u2022 Miramar \u2022 Sanhok rotation. TPP squad. Full points "
        "table.",
    "format_card_2_value": "II",
    "format_card_2_label": "Semifinals \u2014 top 16",
    "format_card_2_desc":
        "Table toppers survive. The lobby gets hungry. The casting gets loud.",
    "format_card_3_value": "III",
    "format_card_3_label": "Grand Finals",
    "format_card_3_desc":
        "Trophy, glory, stickers. In that order of importance. Allegedly.",
    "register_label": "Register",
    "register_title_1": "Enlist your",
    "register_title_2": "squad",
    "register_desc":
        "Team sheet, captain, four UIDs, done. Subs optional. Excuses not a "
        "field.",

    # ---- page copy --------------------------------------------------------
    "schedule_page_lede":
        "Lobby times, rounds and check-in \u2014 published by the organizers.",
    "teams_page_lede":
        "Squads cleared by the refs. Names, tags and logos only \u2014 "
        "contact details stay private.",
    "status_page_lede":
        "Grab the Reg ID from your confirmation (like BGMI26-0042) and the "
        "captain's phone or email. Only you can see your details.",
    "live_page_lede":
        "Public, read-only board \u2014 no player names, no room details, no "
        "private data. Updates itself.",
    "results_page_lede":
        "Only published matches count. Points = placement points + kills. "
        "Tie-breakers: points \u2192 wins \u2192 placement points \u2192 kills "
        "\u2192 last-match placement.",
    "about_page_badge": "Fearless Esports",
    "about_page_lede":
        "Coach, IGL and assaulter \u2014 the three tags you will see in the "
        "lobby, and the hands behind this site.",
    "about_page_story":
        "We run community BGMI cups in Greater Noida. No corporate suits, "
        "no mystery brackets \u2014 just a squad sheet, a schedule and a "
        "scoreboard everyone can check.",
    "about_dossier_status": "Active",
    "about_dossier_threat": "Elite",
    "about_dossier_loyalty": "Unquestioned",
    "about_lineup": DEFAULT_LINEUP,

    # ---- contact & footer -------------------------------------------------
    "contact_email": "organizers@bgmicup.example",
    "contact_phone": "",
    "discord_url": "",
    "instagram_url": "",
    "youtube_url": "",
    "x_url": "",
    "website_url": "",
    "footer_tagline": "Four seats. One drop. Zero rage quits.",
    "footer_copyright":
        "\u00a9 2026 BGMI Cup Noida. Independent community event, not "
        "affiliated with KRAFTON.",
    "footer_credit": "Made with \u2665 by FE_PSYCHO",
    "footer_watermark": "BGMI CUP",

    # ---- SEO --------------------------------------------------------------
    "seo_description":
        "BGMI CUP NOIDA 2026 \u2014 a one-day BGMI squad tournament in "
        "Greater Noida. Register your squad, check the schedule and follow "
        "the live standings.",
    "social_image": "",

    # ---- tickets / overlays ----------------------------------------------
    "ticket_mode": "Squad \u2022 TPP \u2022 6 rounds",
    "ticket_entry": "Free \u2022 Non-transferable",
    "overlay_format_label": "SQUAD TPP \u2022 6 ROUNDS",
    "overlay_semi_slots": 24,
    "overlay_final_slots": 16,
    "overlay_countdown_label": "LOCK IN. DROP IN. DOMINATE.",
}

SITE_FIELDS = tuple(SITE_DEFAULTS)
BOOL_FIELDS = {"registration_open"}
INT_FIELDS = {"slot_limit", "overlay_semi_slots", "overlay_final_slots"}
URL_FIELDS = {
    "discord_url", "instagram_url", "youtube_url", "x_url", "website_url",
    "social_image",
}
# Fields stored in the legacy settings table rather than the JSON blob. They
# remain virtual here so the admin has one form and the old Settings tab keeps
# working against the same values.
VIRTUAL_FIELDS = ("slot_limit", "timezone", "schedule_note")
EDITABLE_FIELDS = SITE_FIELDS + ("schedule_note",)

TEXT_LIMITS = {
    "event_name": 80, "brand_prefix": 16, "brand_name": 16,
    "brand_suffix": 16, "edition_label": 32, "organizer_name": 80,
    "location_name": 80, "venue_name": 120, "venue_address": 240,
    "coordinates": 80, "timezone": 48, "timezone_short": 16,
    "registration_closed_message": 600, "registration_privacy_note": 600,
    "hero_kicker": 120, "hero_title_1": 48, "hero_title_2": 48,
    "hero_title_3": 48, "hero_note_1": 80, "hero_note_2": 80,
    "hero_note_2_accent": 80, "hero_date_override": 80,
    "hero_tagline_1": 180, "hero_tagline_2": 180,
    "hero_cta_primary": 60, "hero_cta_secondary": 60,
    "hero_hud_location": 40, "hero_hud_date": 40, "hero_hud_tag": 60,
    "stat_1_value": 12, "stat_1_label": 40, "stat_2_value": 12,
    "stat_2_label": 40, "stat_3_value": 12, "stat_3_label": 40,
    "meta_label": 40, "meta_title_1": 80, "meta_title_2": 80,
    "meta_desc": 400, "format_label": 40, "format_title_1": 80,
    "format_title_2": 80, "format_desc": 400, "register_label": 40,
    "register_title_1": 80, "register_title_2": 80, "register_desc": 400,
    "schedule_page_lede": 400, "teams_page_lede": 400,
    "status_page_lede": 400, "live_page_lede": 400,
    "results_page_lede": 400, "about_page_badge": 80,
    "about_page_lede": 500, "about_page_story": 2000,
    "about_dossier_status": 40, "about_dossier_threat": 40,
    "about_dossier_loyalty": 40, "about_lineup": 6000,
    "contact_email": 120, "contact_phone": 40,
    "footer_tagline": 180, "footer_copyright": 300,
    "footer_credit": 160, "footer_watermark": 40,
    "seo_description": 400, "ticket_mode": 80, "ticket_entry": 80,
    "overlay_format_label": 80, "overlay_countdown_label": 80,
    "schedule_note": 2000,
}
for _field in URL_FIELDS:
    TEXT_LIMITS[_field] = 400


class SiteConfigError(ValueError):
    def __init__(self, message, field=None):
        super().__init__(message)
        self.message = message
        self.field = field


def _get_setting(conn, key, default=""):
    row = conn.execute("SELECT value FROM settings WHERE key = ?",
                       (key,)).fetchone()
    return row["value"] if row else default


def _set_setting(conn, key, value):
    conn.execute("INSERT INTO settings (key, value) VALUES (?, ?) "
                 "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                 (key, str(value)))


def _bool(value):
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in ("1", "true", "yes", "on")


def _int(value, field, low, high):
    try:
        number = int(value)
    except (TypeError, ValueError):
        raise SiteConfigError("Enter a whole number.", field)
    if not low <= number <= high:
        raise SiteConfigError("Enter a number between %d and %d."
                              % (low, high), field)
    return number


def _text(value, field):
    value = str(value if value is not None else "").replace("\r\n", "\n")
    limit = TEXT_LIMITS.get(field, 300)
    if len(value) > limit:
        raise SiteConfigError("Keep this to %d characters." % limit, field)
    return value


def _date(value, field, required=False):
    value = _text(value, field).strip()
    if not value:
        if required:
            raise SiteConfigError("Pick a date.", field)
        return ""
    if not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
        raise SiteConfigError("Use the date picker (YYYY-MM-DD).", field)
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        raise SiteConfigError("That date is not valid.", field)
    return value


def _time(value, field):
    value = _text(value, field).strip()
    if not value:
        return ""
    if not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", value):
        raise SiteConfigError("Use a valid 24-hour time (HH:MM).", field)
    return value


def _deadline(value):
    value = _text(value, "registration_deadline").strip()
    if not value:
        return ""
    if not re.match(r"^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$", value):
        raise SiteConfigError(
            "Use the date-time picker for the registration deadline.",
            "registration_deadline")
    try:
        datetime.strptime(value, "%Y-%m-%dT%H:%M")
    except ValueError:
        raise SiteConfigError("That deadline is not valid.",
                              "registration_deadline")
    return value


def _url(value, field):
    value = _text(value, field).strip()
    if not value:
        return ""
    if field == "social_image" and value.startswith("/"):
        return value
    if not re.match(r"^https?://[^\s]+$", value, re.I):
        raise SiteConfigError("Use a full http:// or https:// link.", field)
    return value


def _email(value):
    value = _text(value, "contact_email").strip()
    if not value:
        return ""
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", value):
        raise SiteConfigError("Enter a valid contact email.", "contact_email")
    return value


def _phone(value):
    value = _text(value, "contact_phone").strip()
    if value and not re.match(r"^[0-9+()\-.\s]{5,30}$", value):
        raise SiteConfigError("Use a phone number with digits, spaces, +, - "
                              "or brackets.", "contact_phone")
    return value


def _validate(field, value):
    if field == "registration_open":
        return _bool(value)
    if field in INT_FIELDS:
        low, high = (1, 256) if field == "slot_limit" else (1, 128)
        return _int(value, field, low, high)
    if field in ("start_date", "end_date"):
        return _date(value, field, required=(field == "start_date"))
    if field in ("start_time", "end_time", "checkin_time"):
        return _time(value, field)
    if field == "registration_deadline":
        return _deadline(value)
    if field == "date_format":
        value = _text(value, field).strip()
        if value not in DATE_FORMATS:
            raise SiteConfigError("Choose a supported date format.",
                                  "date_format")
        return value
    if field == "time_format":
        value = _text(value, field).strip()
        if value not in TIME_FORMATS:
            raise SiteConfigError("Choose 12-hour or 24-hour time.",
                                  "time_format")
        return value
    if field == "timezone_offset":
        value = _text(value, field).strip()
        if not re.match(r"^[+-](0\d|1[0-4]):[0-5]\d$", value):
            raise SiteConfigError("Use an offset like +05:30.",
                                  "timezone_offset")
        return value
    if field == "timezone":
        value = _text(value, field).strip()
        if not re.match(r"^[A-Za-z0-9_+\-/]+$", value):
            raise SiteConfigError("Timezone looks odd.", field)
        return value
    if field in URL_FIELDS:
        return _url(value, field)
    if field == "contact_email":
        return _email(value)
    if field == "contact_phone":
        return _phone(value)
    if field == "about_lineup":
        value = _text(value, field)
        members = []
        for number, raw in enumerate(value.splitlines(), 1):
            if not raw.strip():
                continue
            parts = [part.strip() for part in raw.split("|")]
            if len(parts) > 6:
                raise SiteConfigError(
                    "Line %d has too many pipes. Use up to six: name | role "
                    "| file ref | skills | dossier | image." % number,
                    field)
            while len(parts) < 6:
                parts.append("")
            if not parts[0]:
                raise SiteConfigError("Line %d needs a member name." % number,
                                      field)
            limits = (40, 40, 24, 240, 240, 300)
            for part, limit in zip(parts, limits):
                if len(part) > limit:
                    raise SiteConfigError(
                        "Line %d has a field longer than %d characters."
                        % (number, limit), field)
            if any(ch in parts[5] for ch in ("\n", "\r")) or \
                    parts[5].lower().startswith("javascript:"):
                raise SiteConfigError("Line %d has an unsafe image path."
                                      % number, field)
            members.append(" | ".join(parts).rstrip(" |"))
        if len(members) > 8:
            raise SiteConfigError("Keep the About line-up to 8 members.",
                                  field)
        return "\n".join(members)
    if field == "schedule_note":
        return _text(value, field)
    return _text(value, field)


def get_config(conn):
    """Merged config with legacy virtual settings and all defaults."""
    cfg = dict(SITE_DEFAULTS)
    raw = _get_setting(conn, SITE_KEY, "")
    if raw:
        try:
            saved = json.loads(raw)
        except (TypeError, ValueError):
            saved = None
        if isinstance(saved, dict):
            for key in SITE_FIELDS:
                if key in saved and key not in VIRTUAL_FIELDS:
                    cfg[key] = saved[key]
    cfg["slot_limit"] = _get_setting(conn, "slot_limit",
                                     str(cfg["slot_limit"]))
    cfg["timezone"] = _get_setting(conn, "timezone", cfg["timezone"])
    cfg["schedule_note"] = _get_setting(conn, "schedule_note", "")
    cfg["schedule_updated"] = _get_setting(conn, "schedule_updated", "")
    cfg["site_updated"] = _get_setting(conn, SITE_UPDATED_KEY, "")
    try:
        cfg["slot_limit"] = int(cfg["slot_limit"])
    except (TypeError, ValueError):
        cfg["slot_limit"] = int(SITE_DEFAULTS["slot_limit"])
    return cfg


def save_config(conn, incoming):
    """Validate and persist a partial update. Returns (config, changed)."""
    if not isinstance(incoming, dict):
        raise SiteConfigError("Expected a settings object.")
    current = get_config(conn)
    clean = {}
    for key, value in incoming.items():
        if key not in EDITABLE_FIELDS:
            continue
        clean[key] = _validate(key, value)

    start = clean.get("start_date", current["start_date"])
    end = clean.get("end_date", current["end_date"])
    if start and end and end < start:
        raise SiteConfigError("The end date cannot be before the start date.",
                              "end_date")
    if not start:
        raise SiteConfigError("Pick an event start date.", "start_date")

    changed = {}
    stored = {}
    for key in SITE_FIELDS:
        if key in VIRTUAL_FIELDS:
            continue
        new = clean.get(key, current.get(key, SITE_DEFAULTS[key]))
        if key not in SITE_DEFAULTS:
            continue
        stored[key] = new
        if current.get(key) != new:
            changed[key] = (current.get(key), new)
    if stored:
        _set_setting(conn, SITE_KEY, json.dumps(
            stored, ensure_ascii=False, separators=(",", ":")))

    for key in VIRTUAL_FIELDS:
        if key not in clean:
            continue
        new = clean[key]
        old = current.get(key)
        if key == "slot_limit":
            _set_setting(conn, key, new)
        elif key == "timezone":
            _set_setting(conn, key, new)
            _set_setting(conn, "schedule_updated", _now_iso())
        elif key == "schedule_note":
            _set_setting(conn, key, new)
            _set_setting(conn, "schedule_updated", _now_iso())
        if old != new:
            changed[key] = (old, new)

    if changed:
        _set_setting(conn, SITE_UPDATED_KEY, _now_iso())
    return get_config(conn), changed


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def _parse_date(value):
    try:
        return datetime.strptime(value, "%Y-%m-%d")
    except (TypeError, ValueError):
        return None


def _parse_local(date_value, time_value, offset):
    if not date_value:
        return None
    stamp = "%sT%s:00%s" % (date_value, time_value or "00:00",
                            offset or "+00:00")
    try:
        return datetime.fromisoformat(stamp)
    except ValueError:
        return None


def _fmt_date(value, pattern):
    d = _parse_date(value)
    if not d:
        return ""
    # strftime is not portable for %-d, so build the day manually.
    day = str(d.day)
    rep = {
        "DD": d.strftime("%d"),
        "D": day,
        "dddd": d.strftime("%A"),
        "MMMM": d.strftime("%B"),
        "MMM": d.strftime("%b"),
        "MM": d.strftime("%m"),
        "YYYY": d.strftime("%Y"),
    }
    return re.sub(r"dddd|MMMM|MMM|YYYY|DD|D|MM",
                  lambda match: rep[match.group(0)], pattern)


def format_date_range(start, end, pattern):
    if not start:
        return ""
    first = _fmt_date(start, pattern)
    if not end or end == start:
        return first
    a, b = _parse_date(start), _parse_date(end)
    if (a and b and a.year == b.year and a.month == b.month
            and "dddd" not in pattern
            and ("MMMM" in pattern or "MMM" in pattern)):
        # 14-16 November 2026 reads better than repeating the month.
        month = "MMMM" if "MMMM" in pattern else "MMM"
        return "%d-%d %s" % (a.day, b.day, _fmt_date(start,
                                                      month + " YYYY"))
    return "%s \u2013 %s" % (first, _fmt_date(end, pattern))


def format_time(value, time_format):
    if not value:
        return ""
    try:
        hour, minute = [int(x) for x in value.split(":")[:2]]
    except (TypeError, ValueError):
        return value
    if time_format == "24h":
        return "%02d:%02d" % (hour, minute)
    suffix = "AM" if hour < 12 else "PM"
    hour12 = hour % 12 or 12
    return "%d:%02d %s" % (hour12, minute, suffix)


def _offset_iso(date_value, time_value, offset):
    if not date_value:
        return ""
    return "%sT%s:00%s" % (date_value, time_value or "00:00",
                           offset or "+00:00")


def registration_state(cfg, now=None):
    """Effective public registration state (toggle + deadline)."""
    now = now or datetime.now(timezone.utc)
    enabled = bool(cfg.get("registration_open"))
    deadline = _parse_local(
        (cfg.get("registration_deadline") or "")[:10],
        (cfg.get("registration_deadline") or "")[11:16],
        cfg.get("timezone_offset", "+00:00"))
    reason = ""
    if not enabled:
        reason = cfg.get("registration_closed_message") or \
            "Registration is closed."
    elif deadline and now > deadline:
        reason = "Registration closed on %s." % deadline_label(cfg)
    return (enabled and not reason), reason


def deadline_label(cfg):
    raw = cfg.get("registration_deadline") or ""
    if not raw:
        return ""
    date_part = _fmt_date(raw[:10], cfg.get("date_format", "DD MMM YYYY"))
    time_part = format_time(raw[11:16], cfg.get("time_format", "12h"))
    short = cfg.get("timezone_short") or ""
    return (date_part + (" \u00b7 " if date_part and time_part else "") +
            time_part + (" " + short if short else ""))


def computed(cfg):
    start = cfg.get("start_date", "")
    end = cfg.get("end_date", "") or start
    pattern = cfg.get("date_format", "DD MMMM YYYY")
    date_label = format_date_range(start, end, pattern)
    short = format_date_range(start, end, "DD MMM YYYY")
    upper = format_date_range(start, end, "DD MMM YYYY").upper()
    time_label = format_time(cfg.get("start_time", ""),
                             cfg.get("time_format", "12h"))
    short_tz = cfg.get("timezone_short") or ""
    if time_label and short_tz:
        time_label += " " + short_tz
    checkin = format_time(cfg.get("checkin_time", ""),
                          cfg.get("time_format", "12h"))
    if checkin and short_tz:
        checkin += " " + short_tz
    reg_open, reg_reason = registration_state(cfg)
    hero_date = (cfg.get("hero_date_override") or "").strip() or date_label
    if hero_date:
        hero_date = hero_date.upper()
    return {
        "date_label": date_label,
        "date_label_upper": date_label.upper(),
        "date_short": short,
        "date_short_upper": upper,
        "date_iso": start,
        "end_date_iso": end,
        "time_label": time_label,
        "checkin_label": checkin,
        "footer_date": "%s // %s" % (cfg.get("location_name", ""), short),
        "event_start_iso": _offset_iso(start, cfg.get("start_time", ""),
                                       cfg.get("timezone_offset", "")),
        "event_end_iso": _offset_iso(end, cfg.get("end_time", ""),
                                     cfg.get("timezone_offset", "")),
        "registration_deadline_label": deadline_label(cfg),
        "registration_open": reg_open,
        "registration_message": reg_reason,
        "hero_date_label": hero_date,
        "hero_hud_location": (cfg.get("hero_hud_location") or
                              cfg.get("location_name", "")).strip().upper(),
        "hero_hud_date": (cfg.get("hero_hud_date") or "").strip() or upper,
    }


def public_payload(conn):
    cfg = get_config(conn)
    out = {key: cfg.get(key, SITE_DEFAULTS.get(key))
           for key in SITE_FIELDS}
    out.update(computed(cfg))
    out["schedule_note"] = cfg.get("schedule_note", "")
    out["schedule_updated"] = cfg.get("schedule_updated", "")
    out["site_updated"] = cfg.get("site_updated", "")
    return out


def overlay_payload(conn):
    cfg = get_config(conn)
    c = computed(cfg)
    return {
        "eventName": cfg.get("event_name", ""),
        "eventShortName": "%s %s" % (cfg.get("brand_prefix", ""),
                                     cfg.get("brand_name", "")),
        "edition": cfg.get("edition_label", ""),
        "organizer": cfg.get("organizer_name", ""),
        "location": cfg.get("location_name", ""),
        "dateLabel": c["date_label_upper"],
        "dateShort": c["date_short_upper"],
        "timeLabel": c["time_label"],
        "formatLabel": cfg.get("overlay_format_label", ""),
        "semifinalSlots": int(cfg.get("overlay_semi_slots", 24)),
        "finalSlots": int(cfg.get("overlay_final_slots", 16)),
        "countdownEndsAt": c["event_start_iso"],
        "countdownLabel": cfg.get("overlay_countdown_label", ""),
    }
