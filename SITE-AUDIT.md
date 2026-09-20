# SITE-AUDIT.md — MDWeatherAlerts.com Rebuild, Phase 0

Audit date: **2026-09-20**. Author: Claude Code (Opus 5).
Method: live probes of mdweatheralerts.com (REST API, headers, sitemap, robots),
plus source audit of the two repos listed below. No theme code written.

> Re-verify the **Frozen URLs** table at the end of every phase (Hard rule 1 & 2).

---

## 1. Repository map

| Repo | What it actually is | Role in this project |
|---|---|---|
| `iimgreen/MDWeatherAlerts-App` (public) | Static PWA served by GitHub Pages at **app.mdweatheralerts.com** (`CNAME`, `.nojekyll`). Vanilla JS/CSS, Leaflet 1.9.4 from unpkg, ~227KB `js/app.js`, ~148KB `css/main.css`. | **Not** the rebuild target. Separate property. See §7. |
| `iimgreen/md-weather-alerts` (private) | The real product monorepo: iOS app (SwiftUI), Watch app, widgets, **`worker/`** (Cloudflare Worker), **`wordpress/`** (a WP plugin), docs. | Source of truth for backend, geometry, themes, report types. |
| *(not in this session)* | Android app | Referenced by handover §2.2 and Phase 9. Not found in either repo — see Q4. |

**The WordPress theme has no repo home yet.** Neither repo contains
`wp-content/themes/md-weather-alerts`. See Q1.

---

## 2. Hosting & platform

| Fact | Value | Evidence |
|---|---|---|
| Host | **WordPress.com Atomic** (Automattic managed) | `host-header: WordPress.com`, `x-ac: 5.dca _atomic_dca`, `x-hacker: ... join.a8c.com`, `wp-content/mu-plugins/wpcomsh` |
| Server | nginx + a8c CDN | `server: nginx`, `server-timing: a8c-cdn` |
| Active theme | **`md-weather-alerts`** — an existing *custom classic* theme | body class `wp-theme-md-weather-alerts`, `page-template-default` |
| Plugins visible on front end | `jetpack`, `gutenberg`, **`mdwa-live-nws`** (custom), `wpcomsh` (mu) | asset paths in homepage HTML |
| Sitemaps | Jetpack: `/sitemap.xml`, `/news-sitemap.xml` (no `wp-sitemap.xml`) | `robots.txt`, `generator='jetpack-16.3-a.1'` |
| Forms | Jetpack Forms (`jetpack_form` + `feedback` post types) | `/wp-json/wp/v2/types` |
| Payments | `jp_pay_product`, `jp_pay_order` (Jetpack Payments) | ditto — likely "Support Us" |
| HSTS | `max-age=31536000` | response headers |

**What this means for the plan.** Atomic (Business/Commerce plan) *does* allow
custom themes, plugins, SFTP/SSH + WP-CLI, and has **built-in staging**. So the
handover's Phase 0 access questions are mostly already answered — the remaining
unknown is credentials, not capability. Building a classic PHP theme is the right
call: the site already runs one, so there is no FSE/block-theme migration risk.
(The `wp_template`/`wp_global_styles` REST types are present only because the
Gutenberg plugin is active, not because a block theme is.)

---

## 3. Content inventory

**39 pages, 120 posts, 1 custom post type (`mdwa_report`, "Weather Reports").**

### 3.1 Pages — carry-over dispositions

| URL | Title | Disposition |
|---|---|---|
| `/` (id 13) | Home | **Redesigned** — becomes handover §6 Layout A |
| `/maryland-weather/` (436) | Maryland County Weather | **Redesigned** — county index |
| `/maryland-weather/<county>/` ×24 | "<County> Weather" | **Redesigned** — these ARE the county pages. See §5 |
| `/current-alerts/` (14) | Maryland Weather Alerts | Redesigned → handover §11 "Alerts" |
| `/forecasts/` (15) | Maryland Weather Forecasts | Redesigned |
| `/radar/` (281) | Radar | Redesigned (or merge into Radar tile — needs OK) |
| `/local-weather-reports/` (276) | Local Weather Reports | Redesigned → handover §11 "Reports" |
| `/maryland-weather-blog/` (16) | Maryland Weather Blog | Redesigned → "Forecast Desk" |
| `/maryland-briefing/` (400) | Maryland Weather Briefing | **Candidate to merge** with Forecast Desk — needs OK |
| `/member-center/` (426) | Member Center | **Unclassified** — needs OK; may relate to MDWA+ |
| `/resources/` (279) | Resources | Carry over redesigned — **linked from iOS Settings** |
| `/about/` (1) | About | Carry over redesigned |
| `/contact/` (18) | Contact | Carry over as-is (Jetpack form must keep working) |
| `/support-us/` (19) | Support Us | Carry over as-is (Jetpack Payments) |
| `/privacy-policy/` (267) | Privacy Policy | **FROZEN — restyle only** |
| `/submit-weather-reports/` (17) | Submit Weather Reports | Already 301s → `/local-weather-reports/#submit-weather-report`. Keep the 301. |

Counted: 16 rows + 23 further county pages = 39 pages. ✅

### 3.2 Posts — the automation

Permalink structure: **`/YYYY/MM/DD/slug/`** — must not change (Hard rule 3 & 4).
All recent posts: category `[1]`, author `282038178`.

> **Correction to the handover (§2 rule 4).** The automation is **not** once daily
> at 6 AM. It publishes **twice a day**: ~06:01 ("MDWA Morning Brief" / "Morning
> Edition" / "Sunday AM") and ~18:01 ("MDWA Overnight"). Verified across
> 2026-09-16 → 2026-09-20. Both runs must keep working, and "today's post" in the
> Forecast Desk panel needs a rule for which of the two it shows (see Q6).

**The publishing pipeline is not in either repo.** `worker/src/briefing.ts` is the
*app's* morning push briefing, a different feature; nothing in `worker/src/` posts
to `wp-json`. So the 6 AM/6 PM writer is external (a separate service, cron, or
WP-side plugin). **This is the single biggest unknown in the audit** — Hard rule 4
says don't break it, and I cannot yet see what it depends on. See Q2.

---

## 4. URL inventory & frozen URLs

### 4.1 Frozen (Hard rules 1 & 2) — verify 200 + unchanged at every phase end

| URL | Status @ 2026-09-20 | Referenced by |
|---|---|---|
| `https://mdweatheralerts.com/privacy-policy/` | **200** | iOS `AccountView.swift:105`, `SettingsView.swift:966`, both store listings |
| `https://mdweatheralerts.com/privacy` | **200** (→ `/privacy-policy/`) | iOS `PlusPaywallView.swift:207` |
| `https://mdweatheralerts.com/resources/` | **200** | iOS `SettingsView.swift:963` |
| `https://mdweatheralerts.com/` | **200** | iOS `SettingsView.swift:1001` |
| `https://mdweatheralerts.com/wp-json/wp/v2/posts` | **200** | iOS `WordPressClient.swift:92`, PWA `app.js:748` |
| `https://mdweatheralerts.com/contact/` | **200** | site nav |
| `https://mdweatheralerts.com/terms` | ❌ **404** | iOS `PlusPaywallView.swift:205` — **see §4.3** |

`www.` → apex 301 works for all of the above.

### 4.2 Not present on the main site (correctly — they live on app.mdweatheralerts.com)

`/.well-known/apple-app-site-association` (404), `/.well-known/assetlinks.json`
(404), `/app-ads.txt` (404). The PWA repo serves `/.well-known/assetlinks.json`
for **app.mdweatheralerts.com** only. If Universal Links / App Links are ever
pointed at the apex domain, these become frozen URLs on Atomic too — today they
are not, so the rebuild does not touch them.

### 4.3 🔴 Live defect found — iOS paywall Terms link is broken

`PlusPaywallView.swift:205` links `https://www.mdweatheralerts.com/terms`, which
resolves to **404**. `/privacy` on the same screen works (301 → `/privacy-policy/`).

Why it matters: Apple requires a functional **Terms of Use (EULA)** link on any
auto-renewing subscription paywall (App Store Review Guideline 3.1.2). A 404 there
is both a live broken link for paying customers and an App Review rejection risk
on the next MDWA+ build.

It is pre-existing and outside the rebuild's scope, but it is cheap to fix and it
is a *frozen-URL-class* problem, so it belongs in this audit rather than a
backlog. Fix is a one-line decision, not code — see **Q3**.

### 4.4 Redirects to preserve

- `/submit-weather-reports/` → `/local-weather-reports/#submit-weather-report` (301)
- `www.*` → apex (301, platform-level)

---

## 5. County pages — the path collision the handover flagged

Handover §11 proposes `/county/harford/`. **The site already has all 24 county
pages at `/maryland-weather/<slug>/`**, they are in the Jetpack sitemap, and they
have accrued SEO since launch.

**Recommendation: keep `/maryland-weather/<slug>/`. Do not introduce `/county/`.**
It satisfies Hard rule 3 ("no URL dies") with zero redirects, keeps existing
rankings, and `/maryland-weather/` already works as the county index. Logged in
`DECISIONS.md` as D-002.

### 5.1 The three-way county naming mismatch (implementation gotcha)

Three different canonical spellings exist and must be mapped, not assumed:

| WP slug | GeoJSON `NAME` (Census) | App / D1 `county` string |
|---|---|---|
| `baltimore-city` | `Baltimore city` *(lowercase c)* | `Baltimore City` |
| `prince-georges` | `Prince George's County` *(U+2019 apostrophe)* | `Prince George's County` |
| `queen-annes` | `Queen Anne's County` | `Queen Anne's County` |
| `saint-marys` | `St. Mary's County` | `St. Mary's County` |
| `allegany` … `worcester` (20 more) | `<Name> County` | `<Name> County` |

The Worker already has a regression test for this class of bug
(`worker/test/countyApostrophe.test.ts`), so the apostrophe form is load-bearing.
The theme needs **one** slug↔name map, defined once, used everywhere.

---

## 6. Backend audit (Cloudflare Worker)

Production URL: **`https://md-weather-push.mdweatheralerts.workers.dev`**
(`wrangler.toml` → `WORKER_BASE_URL`). Name `md-weather-push` is historical; it is
now the whole backend.

| Binding | Value |
|---|---|
| D1 | `md-weather-db` (`d7f025fa-…`), **71 migrations** (`0001`→`0070`) |
| R2 | `mdwa-report-photos` |
| KV | `DEVICES`, `SEEN` |
| Durable Objects | `FeedRoom` (live event feeds + chat), `DMRoom` |
| Crons | `*/2` (NWS poll + reports + post-storm), `*/15` (MDWA+ / briefing buckets), `0 5 * * *` (daily Discover), `0 22 * * SUN` (weekly digest) |
| Plan | **Workers Paid** (Durable Objects are not on free tier) |

**~122 routes** in `src/index.ts`. Ones the web rebuild needs:

| Tile / feature | Endpoint(s) |
|---|---|
| Community reports | `/reports`, `/reports/attribution`, `/reports/claim`, `/reports/abuse` |
| Air quality | `/overlays/aqi` |
| Road incidents | `/overlays/incidents` (Maryland CHART) |
| Radar / storm | `/overlays/storm-reports`, `/overlays/lightning` |
| Observations | `/overlays/observations`, `/overlays/cameras` |
| River / tide | `/overlays/tides` (USGS via `src/tides.ts`) |
| Outages | `/overlays/outages` |
| Live | `/feeds`, `/feeds/resolve`, `/feeds/ticket` (DO-backed) |
| Health | `/health` |

Licensed sources confirmed in-repo (Hard rule 9 holds): `api.weather.gov`,
`api.rainviewer.com`, `waterservices.usgs.gov`, `chart.maryland.gov`,
`api.open-meteo.com`, `air-quality-api.open-meteo.com`, `psc.maryland.gov`,
`mesonet.agron.iastate.edu`, `overpass-api.de`.

### 6.1 🔴 BLOCKER — the Worker has no CORS, at all

Exhaustive grep of `worker/src/**` for `Access-Control-Allow-Origin`, `cors`,
preflight `OPTIONS` handling: **zero matches.** `src/http.ts`'s `json()` helper
sets only `content-type`.

Today every consumer is a native app, which is not bound by the same-origin
policy — so this has never mattered. **A browser cannot call this Worker.** Every
live tile in the rebuild (§8 of the handover) depends on fixing it first.

Required, and purely additive (Hard rule 6): add an origin allowlist
(production apex + staging), echo `Access-Control-Allow-Origin`, handle `OPTIONS`
preflight, and set `Vary: Origin`. Native app traffic sends no `Origin` header and
is unaffected. **This is Phase 1 work, not Phase 4** — nothing live renders until
it lands.

### 6.2 Reports schema — current state

`worker/migrations/0019_reports.sql`:

```
reports(id, type, county, location, latitude, longitude, description,
        safety_level, observed_at, contact_name, contact_email, photo_key,
        status DEFAULT 'pending', submitted_at, approved_at, rejected_at)
```

- **No `source` column.** Handover §9 migration is confirmed still needed → will be `0071_report_source.sql`.
- **Moderation queue exists**: `status` defaults to `'pending'`; `/admin/reports/pending` + `src/reportApproval.ts` drive approve/reject. Anonymous web reports can drop straight into it — **no fork, so Q not needed** (handover §9 said ask only if the audit showed one; it doesn't).
- **Location randomization is already correct and server-side**: `jitterCoordinate()` in `src/reports.ts` offsets by a random bearing up to **0.3 miles** and is applied **at write time**, so the true coordinate is never persisted. Satisfies Hard rule 7 as-is; the web path reuses it unchanged.
- `0012_report_visibility.sql`, `0035_report_confidence.sql`, `0043_report_owner_status.sql` also shape report display — read before touching read endpoints.

### 6.3 Reports history: WordPress → D1 already happened

`wordpress/mdwa-reports-api.php` (v1.2.0) exposes the `mdwa_report` CPT and was
the original reports backend. Migration `0019` renamed `wordpress_report_id` →
`report_id` across four satellite tables and declares D1 "the single source of
truth". The CPT is **still registered on the live site**, so the plugin is still
active. Whether it still receives writes decides whether the web report form
targets the Worker (correct) or WP (legacy). See **Q5**.

### 6.4 🟠 Security finding — admin key committed in plaintext

`wordpress/mdwa-reports-api.php:30` hardcodes
`MDWA_ADMIN_KEY = '5aa3a42b…c7bb'` — the shared secret gating
`/admin/reports/pending|approve|reject`. It is in a private repo, and the file's
own comment offers the safer `wp-config.php` route, but it is committed in
plaintext and shipped inside `mdwa-reports-api.zip` in the same directory.

Not caused by this project and **not something I will change unilaterally** — a
rotation has to happen on the Worker secret and the WP side together or moderation
401s. Flagged for Vince's call; see **Q5**.

---

## 7. app.mdweatheralerts.com (the existing PWA)

A separate, self-contained static site. Relevant because it overlaps the rebuild's
feature set and because the handover doesn't mention it exists.

- Calls `api.weather.gov` / `radar.weather.gov` **directly from the browser**, plus `server.arcgisonline.com` basemap tiles, and `mdweatheralerts.com/wp-json/wp/v2/posts` for blog cards.
- **Talks to the Worker not at all.** Its "community reports" are `localStorage`-only (`saveReportsFeedSnapshot()` writes `submittedReports.innerHTML` to `mdwa_saved_reports`). Reports filed there reach no one and appear in no app.
- Map is Leaflet with `L.tileLayer` + `L.marker` — **no county polygons** (zero GeoJSON in `app.js`), i.e. exactly the approximated-Maryland approach Hard rule 11 forbids.
- Own `manifest.json`, icons, `service-worker.js`, `/.well-known/assetlinks.json`.

It overlaps heavily with what the rebuilt site will do, better. Not in scope to
change, but it needs a decision before launch — see **Q7**.

---

## 8. Design-system source material (verified in-app)

- **County geometry** ✅ `MD Weather Alerts/Resources/MarylandCounties.geojson` — **24 `Polygon` features, 2,327 coordinate pairs**, Census-derived (`NAME`, `BASENAME`, `COUNTY`, `GEOID`). This is real geometry and satisfies Hard rule 11. (There is no directory literally named `atlas-real-geometry`; this file is what the handover means.) 47KB raw — serve simplified + gzipped, reference by path, never paste into context.
- **Severity colors** ✅ `Theme/Colors.swift:780` `enum SeverityColor` — `warning #D32F2F`, `watch #F57C00`, `advisory #FBC02D`. Explicitly **never themed** in the app ("a tier must look the same regardless of theme"). The web must adopt the same three and contrast-check them against both themes.
- **App themes**: `AppColorTheme` has **42** cases (`classicCream`, `harborSlate`, `stormSapphire`, `midnightOcean`, …). **Neither "Atlas Night" nor "Daybreak" exists in the app** — they are new web-only theme names. Fine, but worth knowing: the handover's "add 2–4 more app themes later from the app's own definitions" means porting from these 42, and the naming won't line up.
- **Quick-report types**: canonical list is `Models/CommunityReport.swift` → `ReportType`, **36 cases** in two `ReportCategory` groups (Weather / Hazard). The Worker validates `type` as a loose trimmed string (`reports.ts:518`), so the app enum is the real contract. The mobile mockup's 8 (Rain, Wind, Flooding, Fog, Snow/ice, Tree down, Power out, Other) are illustrative and **do not match** it — e.g. the app has no "Wind", it has `windDamage = "Wind damage"`. See **Q6**.
- **Mockup tokens** ✅ The two desktop mockups differ *only* in token values — confirming the handover's premise that Daybreak is a cheap token swap (Phase 7).

---

## 9. What Phase 1 is blocked on

| # | Blocker | Owner |
|---|---|---|
| 1 | Worker CORS (§6.1) | Me, once Q1 answers where code lives |
| 2 | Atomic SFTP/SSH credentials + staging site | Vince (Q1) |
| 3 | How the 6 AM / 6 PM post pipeline publishes (§3.2) | Vince (Q2) |
| 4 | Theme repo home (§1) | Vince (Q1) |

Everything else in Phase 1 (tokens, fonts, header, footer, base templates) can
proceed as soon as Q1 is answered.
