# PHASE 0 QUESTIONS

Spec §0.3 says to batch these and give a recommendation for each, so you can reply
**"go with your recommendations"** and I will proceed. Answer any subset; anything you skip, I take
the recommendation.

Look at `mockups/contact_sheet.png` first — twelve renders at true watch size, three directions ×
interactive/ambient × two accent colours.

---

### 0. Where should this project live? *(new — not in the spec)*

This branch is on the **MD Weather Alerts** repo, which already holds a different product. The spec
assumes a dedicated repo and wants `CLAUDE.md` at the root; putting a watch-face `CLAUDE.md` at the
root of the weather repo would misdirect every future session there. For now everything sits in
`tactical-watchface/`.

> **Recommendation: a new dedicated repo** (e.g. `iimgreen/tactical-watchface`). The folder moves
> across wholesale and nothing else changes. Say the word and I will lay it out; you would create
> the empty repo on GitHub. Keeping it here also works — it is just untidy.

---

### 1. Which design direction?

- **A — SECTOR.** Digital instrument. Big 24-hour time, Zulu line under it, date + day-of-year
  across the top, three values on a shared baseline, two arc gauges hugging the tick track, one
  complication at the bottom, seconds sweeping the outer track.
- **B — MERIDIAN.** Analog field watch. Full 60-tick minute track, hour numerals, hands with a
  lumed accent tip, round complication slots at 3 and 9, date + DOY at 6, Zulu digital above centre.
- **C — GRID.** Modular. Time top-left with the seconds bar as its underline, four data cells in a
  2 × 2 block with in-cell progress bars, Zulu at the foot.

> **Recommendation: A.** It carries the most real data per glance without crowding, its ambient
> version is the strongest of the three, and the "one accent, one job" discipline holds cleanly.
>
> **One honest flaw in B you should see before deciding:** with slots at 3 and 9, the hands sit on
> top of the slot labels several hours a day — visible in the mockup, where the hour hand crosses
> "STEPS". Every analog face with sub-dials has this; it is not a bug I can fix, it is the cost of
> the layout. C is the most legible at a glance but the least distinctive.
>
> Mixing is fine — e.g. A's layout with C's in-cell progress bars.

### 2. What is it called?

Store name and on-watch name. Spec guidance: one or two syllables, no "Pro", no "Tactical" in the
name itself.

> **Recommendation:** **SECTOR**, **MERIDIAN**, or **VECTOR**. I would ship *SECTOR*. Check the
> Play Store for collisions before we commit — I will do that once you shortlist.

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

### 6. Which three data fields in the bottom row, and in what order?

**Verified finding:** the spec's picker list has to shrink. WFF exposes **steps, step goal, step
percent, heart rate, battery, weather, moon phase, notification count** — and that is all. There is
**no calories, distance, floors, or active-minutes source**. Those can only come through a
complication slot.

> **Recommendation: STEPS · HR · BATT.** Note the order is not the spec's — the spec lists HR
> first, but that puts the steps *value* in the centre while the step *gauge* is on the left edge.
> Reordering pairs each gauge with the number directly inboard of it, so an unlabelled arc is
> unambiguous. Same three fields; only the order changed.

### 7. Left / right gauge defaults?

> **Recommendation: left = step goal (accent), right = battery (neutral white, turning red when
> low).** `STEP_PERCENT` and `BATTERY_PERCENT` drive these natively — no complication needed.

### 8. How many complication slots, and where?

> **Recommendation for A: one, bottom centre, defaulting to weather.** The spec suggests up to
> three. I would rather ship one excellent slot than three that crowd the face, and add side slots
> in Phase 4 if it feels sparse on your wrist. For B it is the two round slots at 3 and 9; for C all
> four cells are slots.

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
> Watch 4 onward). None of the v5-only features are needed for any of the three directions. We can
> raise it later; that is a one-line manifest change plus a re-test.

### 11. Package name?

> **Recommendation: `com.mdweatheralerts.watchface.sector`** — reusing the domain you already own
> (`mdweatheralerts.com`), which keeps it verifiable and consistent with your existing Play
> Console app. If you would rather this not sit under the weather brand, give me a domain you own
> and I will use that instead. **This can never be changed after first publish**, so it is worth a
> moment's thought.

### 12. Broader device QA, or Ultra 2 only for v1?

> **Recommendation: Ultra 2 primary, plus one round Wear OS 6 emulator sanity check before
> publishing.** The face will be listed for other round Wear OS devices, so it should not look
> broken on them, but they are not worth a full test matrix for v1.

---

## What happens when you answer

I write **Design Lock v1** into `DECISIONS.md`, then start Phase 1: tooling on your Mac, the
emulator, building Google's official sample end-to-end to prove the pipeline, then the project
skeleton and a minimal version of the locked design on your actual watch.

You will have two jobs in Phase 1, and I will write both out step by step: approving a couple of
installs on the Mac, and turning on wireless debugging on the watch.
