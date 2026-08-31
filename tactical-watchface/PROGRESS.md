# PROGRESS

**Current phase:** 0 — Discovery & design lock
**Gate status:** MET — **Design Lock v1 written 2026-08-31**, all items closed. Phase 0 is done.
**Scope:** Two faces — **MERIDIAN first, SECTOR second**. Two packages, two Play listings (D-015).
**Next action:** Phase 1 on MERIDIAN — tooling, emulator, pipeline proof, skeleton, first deploy.
Needs Vince at a Mac to approve installs and enable wireless ADB on the watch.

---

## Phase 0 — Discovery & design lock

| # | Step (spec §6) | State |
|---|---|---|
| 1 | Re-read this spec | done |
| 2 | Verify platform facts — WFF versions, data sources, complication types | done → `PLATFORM_FACTS.md` |
| 3 | Three design directions as rendered PNGs, interactive + ambient, two accents each | done → `mockups/` (12 renders + contact sheet) |
| 4 | Send Vince the batched Phase 0 questions with recommendations | done → `PHASE0_QUESTIONS.md` |
| 5 | **Gate:** Vince picks a direction and answers; write Design Lock v1 | **done** |

### Evidence

- `mockups/contact_sheet.png` — all twelve renders on one sheet.
- `mockups/option{A,B,C}_{interactive,ambient}_{amber,ice}.png` — 498 × 498, true device scale.
- `mockups/src/` — the generator, so any render is reproducible and reviewable.
- `PLATFORM_FACTS.md` — verified against Google's XSD schemas and validator source at
  `google/watchface@44b1855`, not from memory.

### What verification changed

- **Day of year is native** (`DAY_OF_YEAR`, v1). The spec's fallback plan for computing it is not
  needed. ISO week (`WEEK_IN_YEAR`) is available too.
- **There is no second-time-zone data source.** Zulu is still buildable — `UTC_TIMESTAMP` is
  epoch-based, so UTC and any fixed offset come out of expression arithmetic. Its units are
  unconfirmed; that is a Phase 3 check before the readout is wired.
- **No sunrise/sunset, calories, distance, or floors data sources.** Sunrise/sunset exists only as
  a system *complication* provider, so it can fill a slot but cannot mark the outer track. The
  bottom-row picker list in §5.8 has to shrink to what the platform actually exposes.
- **Google's validator still caps at WFF v4** even though the v5 schemas have shipped. Targeting v5
  today would mean building without the automated gate §7.1 requires. This turns Question 10 from
  a preference into a recommendation with a reason.
- Panel resolution is **unconfirmed**: 498 × 498 is a spec-sheet figure, and §2 requires reading it
  off the hardware. First ADB command in Phase 1.

### Round 2 — Vince's feedback (2026-08-31)

Recorded verbatim:

> "before answering any questions, I like watchface 1 - I just don't like how the actual time is
> up high on the face. should it be centered? also the 3rd one that's modular, great idea, but the
> info squares are not utilizing the watches round space. I want it to make use of the space"

Both acted on; neither needed a question back.

- **A — time centred.** Its optical centre now sits on 249.5 of 498. This cost one row: Zulu moved
  above the time and the separate weather block folded into the data row, whose centre position
  became the complication slot. See D-011 for why no arrangement keeps all six rows *and* centres
  the time.
- **C — panels sized to the disc.** The 2×2 rectangle became four panels that overhang the case,
  with the circular clip cutting their outer corners into arcs. Buildable natively; see D-012.
- Caught while revising: the first pass at C's new layout removed the perimeter entirely, leaving
  ambient with no accent element at all — a §5.9 violation. The 12 index is back in both modes.

Renders: `mockups/option{A2,C2}_{interactive,ambient}_{amber,ice}.png`. The review page and the
artifact now show the revised versions with a before thumbnail on each.

### Round 3 — Option B (2026-08-31)

Vince: *"let's do B and A later once b is done"* — B worked now, A revisited after.

- **B — slots recessed into sub-dials, date into an aperture.** This retires the "honest flaw" I
  reported in round 1. The hands crossing the slots was never the problem; the slots having no
  ground to be crossed *over* was. See D-013.
- All three directions have now had a revision pass, so the comparison is finally like-for-like.

**Open sequencing question, not blocking:** "B and A later once B is done" reads as shipping B
first and A as a second face afterwards. That would make this a two-face roadmap, which changes
Phase 1–7 scope (one bundle with two faces, or two Play listings). Worth confirming before
Phase 1 starts; it does not affect the design lock.

### Round 4 — Option A (2026-08-31)

Vince: *"now do A"* — the same craft pass B and C got.

- **A — data row seated, gauges moved under their values.** Centring the time in round 2 had
  quietly broken D-006's gauge-to-value pairing, leaving two unlabelled arcs beside the time
  measuring numbers at the bottom of the face. Progress moved into the row; the perimeter arcs are
  removed, which is a conscious §5.4 deviation. The row also gained a recessed ground — Option B's
  lesson applied back to A — which additionally gives the complication slot a visible compartment.
- Caught mid-revision: the band was first drawn as a rectangle inside the circle, i.e. exactly what
  Vince objected to in C. Clipping it to the case fixed that, but at r=238 it swallowed the tick
  track; the clip is now concentric with the track and 6 px inside it. See D-014.
- The three directions have converged on one idea without that being planned: data is seated in the
  dial and shaped by the case, not laid on top of it as a rectangle.

### Round 5 — scope settled (2026-08-31)

Vince: *"shipping two faces. ditch C. don't use anymore in plans or anything."*

- **MERIDIAN and SECTOR both ship; MERIDIAN first.** GRID is dropped everywhere forward-looking:
  renders deleted, removed from the generator, removed from the review page and the artifact.
  D-007 and D-012 stay in DECISIONS as history — D-012 in particular, since the circular-clip
  technique it found is what both surviving faces now use.
- **Verified before replanning: WFF allows one face per app** (D-015). Two faces therefore means
  two package names, two Play listings, two store asset sets and two review cycles — sharing one
  keystore, one repo, one design system and one QA matrix. This changes Phases 1–7 from a single
  track into a first pass and a much shorter second pass, and it is the reason questions 2, 8 and
  11 now need per-face answers.

### Round 6 — Design Lock v1 (2026-08-31)

Vince: *"all your recommendations are great. I'd like to however include the compass in the watch
faces as well. also night mode."*

- **Design Lock v1 is written** into `DECISIONS.md`. Phase 0's gate is met.
- **Night Ops is in** and rendered on both faces (`mockups/option{A3,B2}_*_night.png`). Building it
  surfaced a conflict worth recording: Night Ops makes the whole face red, so the low-battery red
  has no hue left to signal with. Resolved by carrying the alert on *intensity* — the low-battery
  value stays at full brightness while everything else dims. See D-016.
- **The compass cannot be built** (D-017). Verified across the validator's data-source registry,
  the complication provider enum, and every v1–v5 XSD: no magnetometer, heading or bearing at any
  version, and `Gyro` is tilt parallax, not direction. Going in instead: a tap-to-open Compass
  shortcut on both faces, plus a heading complication if a provider turns out to exist on the
  device — a Phase 4 check. Vince decides whether the readout earns a slot.

### Round 7 — compass slots and night mode (2026-08-31)

Vince: *"give the compass readout a slot and reading as you recommended and on both faces. night
mode should be the native night mode Samsung ultra 2 watch faces have. on, off, or auto setting."*

- **Heading gets a slot on both faces** (D-019). MERIDIAN's 3 o'clock sub-dial; SECTOR's band grows
  from three compartments to four so weather is not displaced. Both faces now carry two slots.
- **Night mode ships as On / Off / Auto** (D-018) — but not Samsung's. Verified: Samsung's night
  mode is first-party, runs on only *Simple Ultra* and *Ultra Analog*, and triggers off the
  **ambient light sensor**. WFF exposes no light-sensor source, and `Variant` has exactly one legal
  mode, `AMBIENT`, so no third-party face can join the feature or read its trigger. Ours matches the
  options, the menu location and the look; **Auto differs** — it switches on real daylight
  (`WEATHER.IS_DAY`) rather than room brightness, with a fixed evening window as fallback when
  weather is unavailable.
- Last open item is closed, so the Phase 0 gate is met.

### Blockers

- **Vince at his Mac.** Phase 1 needs him to approve a couple of installs and enable wireless ADB
  on the watch. No Android SDK, emulator, or watch exists in this environment, so nothing further
  can be built here.
- To confirm in Phase 4: whether any provider on the device actually publishes a heading
  complication. If none does, the tap-to-open Compass shortcut carries the feature alone.

---

## Re-read log (spec §0.2)

- `2026-08-30` — [re-read spec — session start, full document] before beginning Phase 0.
- `2026-08-30` — [re-read spec — §5 Design Brief + §7 Quality Bars] before drawing Option A.
- `2026-08-30` — [re-read spec — §5.2 Forbidden + §5.7 Layout rules] during the mockup review pass;
  caught the Option C perimeter arcs reading as decoration (D-007) and the ambient heart-rate value
  reading as fake data (D-008).
- `2026-08-30` — [re-read spec — §6 Phase 0 + §10] before writing the question batch.
- `2026-08-31` — [re-read spec — §5.3 Required qualities + §5.7 Layout rules] before reworking
  Option A's centring; confirmed the shared-baseline rule, which killed the staggered "arc" row.
- `2026-08-31` — [re-read spec — §5.2 Forbidden + §5.9 AOD] while revising Option C; caught the
  shortened gauges reading as brackets, and the missing ambient accent anchor.
- `2026-08-31` — [re-read spec — §5.1 What tactical means + §5.3 Required qualities] before
  reworking Option B; "instrument-grade" is what reframed the hand-crossing as a depth problem
  rather than a layout cost.
- `2026-08-31` — [re-read spec — §5.4 Option A brief + §5.7 Layout rules] before reworking Option
  A; §5.7's consistent-gap rule is what sent the band's clip radius to a circle concentric with
  the tick track instead of a hand-picked inset.
- `2026-08-31` — [re-read spec — §6 Phases, §8 Publishing, §9 Repo hygiene] after the two-face
  decision; all three assume a single face, which is what prompted verifying D-015 rather than
  replanning on an assumption.
- `2026-08-31` — [re-read spec — §3.2 Hard constraints + §5.2 Forbidden + §5.5 Colour] on the
  compass and night-mode requests; §5.2's "fake compass roses" and §5.5's "red means something is
  wrong" are what produced D-017 and the intensity-based alert in D-016.
- `2026-08-31` — [re-read spec — §5.8 Data & function + §5.10 Customization schema] before siting
  the heading slots and the night-mode setting; §5.8's "propose the nearest real alternative" is
  the rule both D-018 and D-019 are answering.

---

## Phases 1–7

Not started. Gates as written in spec §6.
