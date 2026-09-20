# IDEAS.md

Suggestions only — **nothing here is approved.** Seeded from handover §15, plus
what the Phase 0 audit turned up. Best few get surfaced at phase boundaries.

## From the audit (new)

1. **Retire or absorb app.mdweatheralerts.com.** Its reports are `localStorage`-only, so anything filed there reaches nobody and appears in no app — a quiet dead end for anyone who finds it. Once the rebuilt site does all of it properly against the Worker, the PWA is a strictly worse copy of the site. Options: 301 the subdomain to the site, or keep it purely as the installable PWA shell pointed at the new front end. (See Q7.)
2. **The rebuilt site *is* the PWA.** Handover §15.6 asks for an installable PWA with a saved county — the saved-county work in Phase 2 gets that most of the way, and it would let the subdomain go away instead of being maintained twice.
3. **Add `/terms`** as a real page rather than a redirect, and link it from the footer. The subscription paywall needs it (SITE-AUDIT §4.3), the App Store expects it, and the site has no terms page at all today.
4. **Make `/maryland-weather/` a genuine statewide index** — 24 county cards with live conditions and alert state. It already exists as a page and already ranks; right now it is the weakest use of a strong URL.
5. **Reuse the Worker's overlays for a "Maryland right now" strip** — outages, lightning, cameras and storm reports are all already served (`/overlays/*`) and none of them appear on the website today.

## From handover §15 (carried over)

6. Web Storm Mode: when a warning covers the visitor's county, the hero reorganizes around what to do and when it ends.
7. Embeddable county widget for other Maryland sites and Facebook group admins. Free promotion.
8. Shareable report and alert pages with good link-preview images for Threads and Facebook.
9. County compare: two counties side by side.
10. "Bus stop" and "commute" mini-forecasts on county pages, morning and evening windows. *(The Worker already has `/me/commutes` + `src/commute.ts` — the logic exists.)*
11. Seasonal pages the daily posts can link to (first frost, hurricane season, snow totals).
12. Public "this week's top reporters by county" strip fed by the app leaderboard. *(`/leaderboard` + `src/reporterStats.ts` already serve this.)*
