# DECISIONS.md

Running log of choices made during the MDWeatherAlerts.com rebuild.
Minor calls are taken and logged here (handover §3); anything material goes to
Vince as a batched question instead.

| ID | Date | Decision | Rationale | Status |
|---|---|---|---|---|
| D-001 | 2026-09-20 | Phase 0 deliverables committed to `iimgreen/MDWeatherAlerts-App` on branch `claude/new-session-kp1kvx` | That is this session's designated branch. These are docs only — no code, and nothing that affects the PWA it sits beside. The theme's permanent home is Q1. | Provisional, pending Q1 |
| D-002 | 2026-09-20 | County pages stay at **`/maryland-weather/<slug>/`**; the handover's proposed `/county/<slug>/` is dropped | All 24 already exist, are in the Jetpack sitemap, and carry SEO. Reusing them satisfies Hard rule 3 with zero redirects. `/maryland-weather/` is already the index. | Taken |
| D-003 | 2026-09-20 | Worker CORS moves from Phase 4 to **Phase 1** | No browser can call the Worker until it exists (SITE-AUDIT §6.1), so every live tile is blocked on it. Additive and invisible to native apps. | Taken |
| D-004 | 2026-09-20 | Build a **classic PHP theme**, not a block/FSE theme | The live site already runs a custom classic theme (`md-weather-alerts`); block types in the REST API come from the Gutenberg plugin, not an FSE theme. Classic avoids a migration risk the handover never scoped. | Taken |
| D-005 | 2026-09-20 | One canonical county map (slug ↔ GeoJSON `NAME` ↔ D1 `county`) defined once in the theme | Three different spellings are in live use (SITE-AUDIT §5.1) and the Worker already carries a regression test for the apostrophe form. | Taken |
| D-006 | 2026-09-20 | Did **not** rotate or remove the committed `MDWA_ADMIN_KEY` | Rotating requires changing the WP constant and the Worker secret together or moderation 401s. Vince's call, not a silent fix. Raised as Q5. | Deferred to Vince |
| D-007 | 2026-09-20 | Did **not** touch the iOS `/terms` 404 | Pre-existing, in the app repo, outside the rebuild. Cheapest fix is a redirect, which is a site decision. Raised as Q3. | Deferred to Vince |
