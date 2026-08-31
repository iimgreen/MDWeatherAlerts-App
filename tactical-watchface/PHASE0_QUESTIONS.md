# PHASE 0 QUESTIONS

Spec §0.3 says to batch these and give a recommendation for each, so you can reply
**"go with your recommendations"** and I will proceed. Answer any subset; anything you skip, I take
the recommendation.

**Settled 2026-08-31:** two faces ship — **MERIDIAN first, then SECTOR**. GRID is dropped. Question 1
is answered; questions 2, 8 and 11 now need one answer per face because
**WFF allows only one watch face per app** (see `PLATFORM_FACTS.md` §3a), so this is two packages
and two Play listings.

Look at `mockups/contact_sheet.png` — eight renders at true watch size, two faces ×
interactive/ambient × two accent colours.

---

### 0. Where should this project live? *(new — not in the spec)*

This branch is on the **MD Weather Alerts** repo, which already holds a different product. The spec
assumes a dedicated repo and wants `CLAUDE.md` at the root; putting a watch-face `CLAUDE.md` at the
root of the weather repo would misdirect every future session there. For now everything sits in
`tactical-watchface/`.

This matters a bit more now that there are two faces. WFF allows one face per app, so this is two
Gradle application modules plus a shared module for the fonts, colours and type scale — one repo,
two bundles, two Play listings.

> **Recommendation: a new dedicated repo** (e.g. `iimgreen/tactical-watchface`) holding both faces.
> The folder moves across wholesale and nothing else changes. Say the word and I will lay it out;
> you would create the empty repo on GitHub. Keeping it here also works — it is just untidy, and
> more so with two products in it.

---

### 1. Which design direction? — **ANSWERED**

Both **MERIDIAN** (analog field watch) and **SECTOR** (digital instrument) ship, MERIDIAN first.
**GRID is dropped** and is not carried forward in any plan, render, or the generator.

> Nothing needed here. GRID's reasoning stays in `DECISIONS.md` as history, including the
> circular-clip technique it discovered — which is what both surviving faces now use for their
> seated elements.

---

### 2. What are they called?

Two faces means two store names and two on-watch names. They will sit beside each other in your Play
account, so they should read as a pair without being cute about it. One or two syllables, no "Pro",
no "Tactical" in either name.

> **Recommendation: keep MERIDIAN and SECTOR.** The working names already do the job — both single
> words, both instrument vocabulary, neither over-claims. VECTOR is the spare if one collides. I
> will check the Play Store for collisions on whichever two you settle on.

---

### 3. Default accent colour?

Eight ship regardless (Phosphor Amber, Signal Orange, Safety Yellow, NVG Green, Ice, Cobalt, Coral,
Bone) plus Mono. This is just the out-of-box default.

> **Recommendation: Phosphor Amber `#FFB000`** — if you want this to feel like a family with your
> Garmin TELEMETRY face. Otherwise Signal Orange. Both accents are rendered in the mockups; Ice is
> the cooler alternative if amber reads too warm to you.

### 4. 24-hour default? Seconds shown by default?

> **Recommendation: 24-hour, seconds as the sweeping arc.** Both stay user-configurable
> (12/24h, leading zero, and Arc / Digits / Off).

### 5. Secondary time zone — UTC fixed, or user-selectable offset?

**Verified finding:** WFF has *no* second-time-zone data source. Every time source reads local
time. But `UTC_TIMESTAMP` is epoch-based, so Zulu — and any fixed offset — is computable with
expression arithmetic. So this is buildable either way; it is just arithmetic rather than a
built-in source.

> **Recommendation: ship UTC/Zulu first, add a selectable offset list in Phase 4.** One caveat: I
> could not confirm whether `UTC_TIMESTAMP` is in milliseconds or seconds, so I will verify on your
> watch in Phase 3 before wiring it. If it turns out unworkable, the fallback is a `WORLD_CLOCK`
> complication, which is real but less elegant.

### 6. Which values sit where, on each face?

**Verified finding:** the spec's picker list has to shrink. WFF exposes **steps, step goal, step
percent, heart rate, battery, weather, moon phase, notification count** — and that is all. There is
**no calories, distance, floors, or active-minutes source**. Anything else has to arrive through a
complication slot.

> **Recommendation — SECTOR:** the band reads `STEPS · [weather] · BATT`, with the centre
> compartment as the complication slot. Note the order is not the spec's, which lists HR first;
> putting steps and battery on the flanks pairs each with its own progress bar, and heart rate can
> take any of the three positions if you would rather see it than weather.
>
> **Recommendation — MERIDIAN:** `HR` at 9, `STEPS` at 3. Both are slots, so either can become
> anything a complication provides.

### 7. Gauges — where does progress show?

This changed when the time was centred. On SECTOR the step-goal and battery arcs used to hug the
tick track at 9 and 3; with the values now in the band at the bottom, those arcs were measuring
numbers nowhere near them, so the progress moved into the band as bars directly under each value.
MERIDIAN keeps true arc gauges, flanking 12, where nothing competes with them.

> **Recommendation: as rendered — SECTOR's bars in the band, MERIDIAN's arcs flanking 12.** Both
> run off `STEP_PERCENT` and `BATTERY_PERCENT` natively, no complication needed. If you want
> SECTOR's perimeter arcs back, say so — but the bar-under-the-number pairing goes with them.

### 8. How many complication slots, and where?

The two faces answer this differently because their layouts do.

> **Recommendation: MERIDIAN — two, the recessed sub-dials at 3 and 9. SECTOR — one, the centre
> compartment of the data band.** Both are what each layout supports without crowding. If either
> feels thin on your wrist, we add slots in Phase 4 rather than guessing now.

---

### 9. Which nice-to-haves do you want?

- **Night Ops** — everything dimmed ~35 %, accent shifts to deep red `#B3261E`.
- **Flavors** — 4–6 one-tap presets in the Galaxy Wearable app (Default, Mono, Amber Ops, Ice,
  Minimal). Cheap to build.
- **Notification count** — small, subtle. Real source, available.
- **Moon phase** — real source, available.
- **Sunrise / sunset** — **not available as a data source.** It exists only as a system
  complication provider, so it can fill a slot but cannot mark the outer track the way the spec
  imagined. Your call whether it is worth a slot.
- **Alarm indicator** — I found no alarm data source. Treat as not available unless it turns up.

> **Recommendation: yes to Flavors and Night Ops; yes to notification count; skip moon phase and
> sunrise/sunset for v1** — they earn their place on a hiking face, less so on this one. All are
> easy to add later.

### 10. WFF v4 or v5?

**Verified finding, and this one is not a preference.** Google's own WFF validator still caps at
**version 4** (`MAX_WFF_VERSION = 4`) even though the v5 schemas have shipped. Spec §7.1 requires
the validator to pass with zero errors on every build. Targeting v5 today means building without
that gate.

> **Recommendation: v4.** It also reaches far more devices (Wear OS 6+, so Pixel Watch and Galaxy
> Watch 4 onward). None of the v5-only features are needed by either face. We can
> raise it later; that is a one-line manifest change plus a re-test.

### 11. Package names?

One per face — and **neither can ever be changed after first publish**, so it is worth a moment.

> **Recommendation:** `com.mdweatheralerts.watchface.meridian` and
> `com.mdweatheralerts.watchface.sector` — reusing the domain you already own, which keeps them
> verifiable and consistent with your existing Play Console app. If you would rather these not sit
> under the weather brand, give me a domain you own and I will use it for both.

---

### 12. Broader device QA, or Ultra 2 only for v1?

> **Recommendation: Ultra 2 primary, plus one round Wear OS 6 emulator sanity check before
> publishing.** The face will be listed for other round Wear OS devices, so it should not look
> broken on them, but they are not worth a full test matrix for v1.

---

## What happens when you answer

I write **Design Lock v1** into `DECISIONS.md`, then start Phase 1 on **MERIDIAN**: tooling on your
Mac, the emulator, building Google's official sample end-to-end to prove the pipeline, then the
project skeleton and a minimal version of the locked design on your actual watch.

You will have two jobs in Phase 1, and I will write both out step by step: approving a couple of
installs on the Mac, and turning on wireless debugging on the watch.

**SECTOR follows once MERIDIAN is published.** It reuses the same repo, keystore, fonts, colour
system and check script, so it skips most of Phase 1 and inherits the design system — but it needs
its own Phase 7 in full, because a Play listing and a review cycle cannot be shared.
