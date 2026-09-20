# PROGRESS.md

MDWeatherAlerts.com rebuild. Updated at every phase end so a fresh session can
resume cheaply. Read `SITE-AUDIT.md` first — do not re-audit the live site.

**Current phase: 0 (audit) — complete, awaiting answers.**
Last updated: 2026-09-20.

---

## Done

### Phase 0 — audit, access, batched questions ✅

- `SITE-AUDIT.md` written: hosting, 39 pages, 120 posts, URL inventory, frozen URLs, backend, geometry, themes, report types.
- `DECISIONS.md`, `IDEAS.md`, this file created.
- Private monorepo `iimgreen/md-weather-alerts` located and attached (read-only clone at `/home/user/md-weather-alerts`) — it holds the Worker, the iOS app, the county geometry and the theme colors.
- **No code written. Nothing deployed. Nothing in the app, the Worker or the live site modified.**

---

## Next (Phase 1 — theme shell)

Blocked on Q1 (repo home + Atomic access) and Q2 (blog pipeline). Once unblocked:

1. Worker CORS allowlist + `OPTIONS` preflight (moved up from Phase 4 — D-003). Additive; native apps unaffected.
2. Token layer: `:root` custom properties per handover §5, `data-theme` on `<html>`, no-flash inline `<head>` script.
3. Self-host Oswald / Public Sans / Newsreader as woff2, preload the two heaviest.
4. Classic theme skeleton: `header.php`, `footer.php`, `index.php`, `page.php`, `single.php`, shared component partials (tile shell, section label, chip, button, accordion row).
5. Verify `/privacy-policy/` returns 200 with unchanged content on staging.

---

## Open questions (blocking — sent to Vince 2026-09-20)

| # | Question | Blocks |
|---|---|---|
| Q1 | Where does the theme code live, and how do I reach the Atomic staging site? | All of Phase 1 |
| Q2 | How does the 6 AM / 6 PM post pipeline publish? | Hard rule 4 safety |
| Q3 | Fix the `/terms` 404 that the iOS paywall links to? | Nothing — but it is live and broken now |
| Q4 | Where is the Android repo? | Phase 9 only |
| Q5 | Is the `mdwa_report` WP CPT still taking writes, and rotate the committed admin key? | Phase 4 |
| Q6 | Which 8 quick-report types on the web, and which post is "today's" in Forecast Desk? | Phase 3 / 4 |
| Q7 | What happens to app.mdweatheralerts.com? | Phase 8 launch only |

---

## Standing rules for every phase

- Re-verify the **Frozen URLs** table (`SITE-AUDIT.md` §4.1) returns 200 with unchanged content at the end of every phase.
- Never work on the live theme. Staging, or an inactive theme previewed privately.
- Backend changes additive only — new columns with defaults, new endpoints, no breaking change to anything a shipped app build calls.
- Screenshots at 1440 and 390 only, at phase end.
- Commit at phase end; update this file; suggest `/compact` or a new session if context is heavy.
- Ask about a staging look after phases 2, 5 and 8.

---

## Resuming on Vince's Mac

This branch (`claude/new-session-kp1kvx` on `iimgreen/MDWeatherAlerts-App`) holds
everything from Phase 0. Start there:

```sh
git fetch origin claude/new-session-kp1kvx
git checkout claude/new-session-kp1kvx
```

Then read `SITE-AUDIT.md` **first** — do not re-audit the live site, it costs
tokens and the answers are already written down.

### What the web session could not see (the reason for moving to the Mac)

These are the gaps. Anything found here should be written back into
`SITE-AUDIT.md` so it is only discovered once.

| Gap | Where it probably is on the Mac | Unblocks |
|---|---|---|
| The active theme source `wp-content/themes/md-weather-alerts` | A local WP install, an SFTP mount, or a Local/MAMP site | **All of Phase 1** — the rebuild starts from this |
| The `mdwa-live-nws` plugin source | Same place | Knowing what live data the site already renders |
| Atomic SFTP/SSH credentials + whether a staging site exists | WordPress.com dashboard → Settings → Hosting Configuration | Deploying anything at all |
| The 6 AM / 6 PM blog pipeline | Not in either repo. A local script, a cron, n8n/Zapier, or WP-side | Hard rule 4 — do not break it |
| The Android repo | Not in this session's scope | Phase 9 only |

### Useful to have open

- The WordPress.com hosting panel (for SFTP details and the staging toggle).
- Whatever writes the daily posts.
- The private monorepo `iimgreen/md-weather-alerts` — it holds the Worker, the county GeoJSON (`MD Weather Alerts/Resources/MarylandCounties.geojson`) and the severity colors (`Theme/Colors.swift:780`).

### Agreed starting point

Vince asked to keep the Worker untouched at first. Phase 1 therefore runs as
**theme shell only** — tokens, fonts, header, footer, base templates — with zero
backend contact. The CORS change (D-003) happens later, deliberately, with Vince
watching the app keep working before anything else proceeds.
