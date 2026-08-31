# TACTICAL WATCH FACE — BUILD & PUBLISH SPEC

**Target:** Samsung Galaxy Watch Ultra 2 (Wear OS 7 / One UI 9 Watch) · **Format:** Watch Face Format (WFF) · **Distribution:** Google Play Store

**Owner:** Vince · **Builder:** Claude Code (Opus 5) · **Spec date:** August 30, 2026

> Source of this file: transcribed verbatim from `TACTICAL_WATCHFACE_SPEC.pdf`, supplied by Vince on 2026-08-30. Content is unchanged apart from PDF ligature repair and Markdown formatting. Per Section 9, this file is never edited by Claude Code except to append to the "Clarifications" section at the bottom.

---

## 0. HOW TO USE THIS DOCUMENT (READ THIS FIRST, CLAUDE CODE)

### 0.1 Model

Run this project on Claude Opus 5. If you are not currently running as Opus, stop and tell Vince to switch (`/model` in Claude Code) before continuing. Do not proceed on a smaller model.

### 0.2 Re-read cadence (mandatory)

This document is the single source of truth. You must re-read it, in full, at these moments:

1. At the start of every session.
2. At the start of every Phase (Section 6).
3. Before every deployment to the physical watch.
4. Any time you catch yourself unsure what "done" or "good" means for the current task.
5. Every ~10 tool calls or ~30 minutes of work, whichever comes first — re-read Section 5 (Design Brief) and Section 7 (Quality Bars) at minimum.

Log each re-read in `PROGRESS.md` as a one-line entry (`[re-read spec — Phase 3, before deploy]`). If you drift from the spec, the drift is the bug, not the spec.

### 0.3 Question policy

- **Ask Vince about:** visual design choices, what data he wants on screen, what the face should be called, priorities between features, anything about taste or function that this document leaves open.
- **Use your own discretion (do not ask) about:** tooling, build config, file structure, Gradle, SDK versions, package naming (propose one, use it unless he objects), XML structure, how to solve rendering problems, git, testing approach, memory optimization, and every other engineering matter. Make the call, document it in `DECISIONS.md`, move on.
- **Batch questions.** Never ask one question at a time across five messages. Collect them, ask them together, and give Vince a recommended answer for each so he can just say "go with your recommendations."
- Vince has very little coding knowledge. When you must involve him in a technical step (enabling developer mode on the watch, uploading to Play Console), write instructions for someone who has never done it — exact menu names, exact button labels, what the screen should look like when it worked.

### 0.4 Working style

- Work in phases (Section 6). Do not start a phase until the previous phase's gate is satisfied.
- Maintain three files at repo root: `PROGRESS.md` (what's done, what's next, blockers), `DECISIONS.md` (every non-trivial engineering choice and why), and `CLAUDE.md` (a short pointer that says: "Read `TACTICAL_WATCHFACE_SPEC.md` in full before doing anything. Follow Section 0.").
- Commit after every meaningful step with clear messages.
- When you deploy to the watch, tell Vince exactly what to look at and what to compare against.
- Never claim something works on-device unless it has actually been deployed and observed on the Ultra 2 (or, at minimum, the Wear OS 7 emulator with a screenshot you've inspected).

### 0.5 The standard

The output must look like Samsung or Google shipped it. That is the bar. If a screen would embarrass a professional watch face designer, it is not done. See Section 5 for exactly what this means.

---

## 1. PROJECT SUMMARY

Design and build a tactical-style watch face for the Galaxy Watch Ultra 2, publish it on Google Play, and make it installable on Vince's watch through the normal store flow.

**Non-negotiables:**

1. Looks and behaves like a first-party, native watch face. Not a hobbyist face. Not a "cool" face. A serious instrument.
2. Every element on screen is real data or real function. No decorative fake readouts, no fake gauges, no fake sensor text, no "SYS OK" nonsense.
3. Always-On Display (ambient mode) is designed with the same care as the interactive mode — it is not an afterthought.
4. Deep, well-organized customization through the standard Wear OS / Galaxy Wearable customization UI.
5. Published on Google Play, passing review, installable on the Ultra 2.
6. Free. No purchases, no subscriptions, no ads.

---

## 2. TARGET HARDWARE & PLATFORM FACTS (verified Aug 2026)

- **Device:** Galaxy Watch Ultra 2 — 47mm titanium, 1.52" round AMOLED, up to 5,000 nits peak, Snapdragon Wear Elite, 800mAh battery. Single size, LTE only.
- **OS:** Wear OS 7 with One UI 9 Watch. Five major OS updates promised.
- **Screen resolution:** Verify on the actual device with `adb shell wm size` and `adb shell wm density` before laying anything out. Do not assume. Design at the true pixel resolution; the Ultra 2's larger panel may differ from the original Ultra's 480×480.
- **Display shape:** Round. There is no square/rect variant of this device. But your `watch_face_shapes.xml` must still declare shapes correctly so Play can list the face for other round Wear OS devices.
- **Watch Face Format:** Wear OS 7 supports WFF version 5. Wear OS 6 supports v4, Wear OS 5 supports v2/v3. Version determines feature availability (see Section 3.3).
- **Play Store rules in force:**
  - Only WFF watch faces can be published or installed (legacy AndroidX/WSL faces were cut off Jan 14, 2026).
  - Min SDK 33 or higher for new watch faces.
  - As of Sept 15, 2026, all Wear OS apps must support 64-bit (a WFF face has no native code, so this is satisfied, but confirm the bundle passes Play's pre-launch checks).
  - As of July 15, 2026, watch face listing icons must comply with policy WO-G4: the icon must feature a centered, circular rendering of the watch face itself.
  - Read the current Wear OS app quality guidelines page before producing store assets.
- **Customization surface:** On Galaxy watches, users customize faces by long-pressing the face on the watch, and via the Galaxy Wearable app on the phone (Watch faces tab). The customization UI is generated automatically from the `UserConfigurations` you declare in the WFF XML. You do not build a settings UI; you design the configuration schema well.

---

## 3. TECHNOLOGY DECISION: WATCH FACE FORMAT

### 3.1 What it is

WFF is a declarative XML format co-developed by Google and Samsung. The watch face is an Android App Bundle containing no executable code (`android:hasCode="false"`) — just XML, fonts, and images. The system renders it. You get battery efficiency and Play compliance for free; in exchange, you cannot write logic beyond WFF's expression language and conditions.

This is the only viable path. Do not consider Kotlin/Compose/AndroidX watch faces. Do not consider Watch Face Studio's GUI (Vince isn't going to drive a design tool; you are going to hand-author the XML, which gives finer control anyway).

### 3.2 Hard constraints to design around

- **No arbitrary code.** Logic = arithmetic/boolean expressions on data sources, `Condition` elements, and `Variant` overrides for ambient mode.
- **Memory budgets enforced by the system:** roughly 100 MB interactive, 10 MB ambient. Use Google's memory footprint tool (in the `google/watchface` GitHub repo) to measure; keep well under.
- **Fonts must be embedded** (TTF/OTF in `res/font/`). Only use fonts with a license that permits redistribution in an app (SIL OFL or equivalent). Include the license file in the repo.
- **Data availability is what WFF exposes and what complications provide.** Nothing else. If a sensor value is not reachable, it does not go on the face. Specifically: do not fake a compass, altimeter, barometer, or GPS readout. If it's not real data, it's not on the face.
- **Ambient mode runs at low frequency** (roughly once a minute). No seconds in ambient. Keep ambient lit pixels minimal (see Section 5.9).

### 3.3 WFF version to target

- **Recommendation to Vince (ask him in Phase 0):** target WFF v4 (Wear OS 6+) as the baseline for wider device reach — that covers Pixel Watches and Galaxy Watch 4 onward once updated — and only raise to v5 if a v5-only feature (blend modes on groups/complication slots, text line spacing/vertical align, `minSize` on auto-size fonts, `join` on strokes, nested settings) turns out to be essential to the design. Declare the version in the manifest meta-data `com.google.wear.watchface.format.version`.
- **Before using any element, attribute, or data source, confirm it exists in the official XML reference for the version you're targeting** (developer.android.com → Wear OS → Watch Face Format → XML reference; toggle the version selector at the top). Do not write XML from memory. Do not invent tag names.

### 3.4 Reference resources (fetch and read these during Phase 1)

- WFF overview & setup: https://developer.android.com/training/wearables/wff
- XML reference (check the version toggle): https://developer.android.com/training/wearables/wff/watch-face
- Release notes per version: https://developer.android.com/training/wearables/wff/release-notes
- Google's official samples, XSD schema, validator, and memory footprint tool: https://github.com/google/watchface
- Wear OS design guidelines for watch faces (layout, safe zones, complications).
- Play Console: "Create and distribute a watch face on Google Play" help article.
- Wear OS app quality guidelines (for WO-G4 icon rule and review checklist).

If any of these URLs have moved, search for the current location. Do not guess.

---

## 4. ENVIRONMENT SETUP

### 4.1 On Vince's Mac (Claude Code does this; Vince approves installs)

1. Java 17+ JDK (Temurin is fine).
2. Android Studio (latest stable) — if not already installed from the Android app project. Install the Android SDK, platform tools (adb), and a Wear OS 7 system image for the emulator. Android Studio has native WFF support: XML syntax checking, autocomplete, and a run configuration that deploys WFF faces to a device.
3. Gradle via the wrapper (do not install globally).
4. Clone or vendor the `google/watchface` repo tools: the WFF validator (`wff-validator`) and the memory footprint tool. Wire both into a `./scripts/check.sh` that runs on every build.
5. `git` repo initialized on day one.

### 4.2 Wireless ADB to the Ultra 2 (Vince does this on the watch, following your instructions)

Write these steps for Vince in plain language. On the watch: Settings → About watch → Software → tap Software version repeatedly until "Developer mode turned on" appears. Then Settings → Developer options → enable ADB debugging and Debug over Wi‑Fi. The watch shows an IP address and port. Vince tells you the IP; you run `adb connect IP:PORT` and confirm `adb devices` shows it. Watch and Mac must be on the same Wi‑Fi. Note: menu names can shift between One UI versions — if the path above doesn't match what Vince sees, tell him what to look for rather than repeating the same path.

### 4.3 Emulator

Set up a Wear OS 7 round emulator matching the Ultra 2's verified resolution. Use it for fast iteration; use the real watch for every gate review. Screenshots from the emulator (`adb exec-out screencap -p > shot.png`) go in `/screenshots/` with a date and phase in the filename. **Actually open and look at every screenshot you take. Do not describe a screenshot you haven't inspected.**

### 4.4 Project skeleton

Standard WFF bundle layout:

```
app/
  src/main/
    AndroidManifest.xml        (hasCode=false, wearable standalone, WFF version meta-data, uses-feature watch)
    res/raw/watchface.xml      (the face)
    res/xml/watch_face_info.xml
    res/xml/watch_face_shapes.xml
    res/font/                  (embedded fonts + LICENSE files)
    res/drawable*/             (any bitmaps; prefer vector/drawn primitives)
    res/values/strings.xml     (all user-facing config labels — no hardcoded strings in the face XML)
    res/mipmap*/               (Play icon — see WO-G4)
scripts/check.sh               (validator + memory tool + build)
screenshots/
PROGRESS.md  DECISIONS.md  CLAUDE.md  TACTICAL_WATCHFACE_SPEC.md
```

Copy the manifest and Gradle configuration from Google's official sample in `google/watchface` rather than composing from memory, then adapt.

---

## 5. DESIGN BRIEF — THE "TACTICAL, NOT CORNY" STANDARD

**This is the most important section. Re-read it often.**

### 5.1 What "tactical" means here

Tactical means instrument-grade: the aesthetic of a professional field tool — a pilot's HUD, a dive computer, a military-issue field watch, a Garmin Tactix/Instinct, an Apple Watch Ultra "Wayfinder/Modular Ultra" face, Samsung's own Ultra faces. The look is earned by precision, restraint, hierarchy, and legibility, not by decoration.

A tactical face says: someone who depends on this designed it.

### 5.2 Forbidden (any one of these fails the standard)

- Fake data of any kind: decorative numbers, fake coordinates, "SYS/NAV/OK" status text, fake radar sweeps, fake compass roses that don't point anywhere, random hex strings, "loading" bars.
- Skeuomorphic clutter: fake screws, brushed-metal textures, bevels, glowing neon, scanlines, drop shadows, lens flares, "carbon fiber," camo patterns.
- Sci-fi/gamer/HUD-movie styling: hexagon grids, circuit traces, "cyber" fonts, glitch effects, reticles used as decoration.
- Stock "military stencil" fonts, Star Wars-style fonts, any font that looks like a Halloween costume.
- Red/green "alert" colors used decoratively. Red means something is wrong. Only use it when something is wrong.
- More than two typefaces. More than one accent color visible at once (except semantic states).
- Anything that overlaps, crowds, or touches the screen edge without intent.
- Elements sized inconsistently for no reason. Every size should come from the type scale (5.6).
- Mismatched corner radii, stroke weights, or spacing. One system, applied everywhere.
- Text that can be cut off by longer values (e.g., "Wednesday, September 30", "100%", 5-digit steps, "‑12°F"). Design for the longest value, always.

### 5.3 Required qualities

- **Hierarchy:** Time is dominant and readable at arm's length in one glance. Everything else is subordinate in a clear, deliberate order.
- **Grid & alignment:** Everything sits on a shared grid and shared radial guides. Adjacent labels share baselines. Ring elements share the same center and consistent radii.
- **Restraint:** Empty space is a feature. If removing an element makes the face better, remove it.
- **Precision details that only pros notice:** tick marks that actually align to minutes/seconds; tabular (monospaced-figure) numerals so digits don't jitter; consistent letterspacing on labels; perfectly concentric rings; label text that is optically centered, not mathematically centered.
- **Native feel:** Behaves like Samsung's built-in faces — complication slots in expected places, tap targets that open the expected apps, customization options that appear in the standard customization UI with sensible names and previews.
- **AOD parity:** The ambient version looks like the same product, thoughtfully reduced, not a stripped placeholder.
- **Legibility under sunlight and in the dark:** high-contrast, no thin hairlines on dark backgrounds smaller than ~2px at device density, no mid-gray text on black for anything important.

### 5.4 Proposed default direction (present to Vince as Option A; also give him two alternatives — see Phase 0)

**Working name: SECTOR** (Vince chooses the final name)

**Concept:** A dark, matte instrument face. A precise outer minute/second track with 60 ticks (majors at 5s) in near-white and a single accent. Large digital time in the upper-center-left, 24-hour default, tabular numerals, with seconds rendered as a slim accent arc sweeping the outer track (interactive only). A secondary UTC / Zulu time line beneath the main time — a real tactical convention. Date block in ISO-ish compact form (`SUN 30 AUG` and `DOY 242` — day of year, another real military/field convention) aligned to the left margin of the time. Lower half: three data fields on a shared baseline (default: heart rate, steps, battery), each with a hairline label in small caps above a tabular value. Left and right edge: two arc gauges hugging the tick track (default: step goal progress, battery). Bottom center: a single complication slot (default: weather condition + temp). Nothing touches the bezel. Nothing glows.

**Alternatives to present (mockups, not builds):**

- **Option B — "MERIDIAN":** Analog-forward. Precise hands with a lumed-look tip in accent, a 24h inner sub-scale, digital date window, two small round complication slots at 3 and 9, data ring around the perimeter. Closer to a field watch.
- **Option C — "GRID":** Fully digital, data-dense, modular-ultra style. Time top, four rectangular complication cells in a 2×2 block, corner arc gauges, and a full-width status line. Closest to Apple's Modular Ultra / Garmin's data pages.

Produce each option as a rendered PNG at true device resolution (use the emulator with a rough WFF draft, or a faithful SVG rendered to PNG — the emulator is preferred because it forces you to design within WFF constraints from day one). Show interactive and ambient for each. Show one alternate accent color for each. Let Vince pick a direction and combine elements if he wants.

### 5.5 Color system

- **Base:** true black `#000000` background (AMOLED; pixels off). Surfaces, if any, are `#0A0A0A`–`#121212`. No gradients on backgrounds.
- **Primary text:** `#F2F2F2` (not pure white; pure white on AMOLED blooms).
- **Secondary text / labels:** `#9A9A9A`. Tertiary / disabled: `#5C5C5C`.
- **Tick track:** `#3A3A3A` minors, `#CFCFCF` majors.
- **Accent (user-selectable, one at a time):** ship at least eight, each tested for contrast on black. Starting palette — Phosphor Amber `#FFB000`, Signal Orange `#FF6A00`, Safety Yellow `#FFD600`, NVG Green `#7CFF5E` (desaturate if it reads "gamer"), Ice `#9AD8FF`, Cobalt `#3D7BFF`, Coral `#FF5C5C` (use sparingly — reads as alert), Bone `#E6E1D6` (monochrome mode).
- **Semantic (not user-selectable):** low battery (≤15%) → the battery value and gauge turn `#FF5C5C`; everything else unchanged. That is the only red on the face unless the user picked Coral.
- Add a **"Mono"** theme where accent = primary text: for users who want zero color.
- Add a **"Night Ops"** option that dims all lit pixels by ~35% and shifts the accent to a deep red `#B3261E` (real night-vision preservation convention) — only if Vince wants it. Ask.

### 5.6 Typography

- Exactly two families, both with OFL licenses, embedded:
  - **Display / numerals:** a clean, geometric-industrial sans with tabular figures — candidates: Barlow Semi Condensed, IBM Plex Sans Condensed, Rajdhani (test carefully; can read "gamer"), Chakra Petch (same warning), Saira Semi Condensed, Inter (safe, very native). Pick one after rendering the time in each on-device and comparing screenshots side by side. Show Vince the top two.
  - **Labels / small text:** either the same family at a lighter weight with tracked-out small caps, or IBM Plex Mono / JetBrains Mono for a data-terminal feel. Do not mix a mono label font with a mono display font.
- **Type scale** (define in pixels at verified device resolution, then reuse everywhere): Time (XL) · UTC/secondary time (M) · Data values (M) · Date (S) · Labels (XS, tracked +8–12%). No sizes outside the scale.
- Always use **tabular numerals** for anything that changes (time, HR, steps, battery, temperature) so layout doesn't shift.
- Verify auto-size behavior for any field that can vary widely (steps, temperature). Use WFF auto-size with a `minSize` floor where the targeted version supports it; otherwise design the box for the widest case.

### 5.7 Layout rules

- Define a **safe zone**: nothing meaningful within ~6% of the radius from the bezel except the tick track and the arc gauges, which are designed to live there.
- **Round-screen awareness:** text blocks near the top/bottom get narrower. Do not place wide text where the circle clips it.
- One consistent stroke weight for hairlines, one for gauges, one for the seconds arc. Consistent gap between arc gauges and the tick track.
- **Tap targets** for complications: at least ~48dp equivalent; visually the slot is smaller than its tap area — that's fine, that's native.
- **Snap all positions to whole pixels.** Sub-pixel placement blurs hairlines on AMOLED.

### 5.8 Data & function spec

Everything below must be wired to real WFF data sources or complication slots. **Verify each data source's exact tag name and version availability in the XML reference before use.** If a "must" item is not achievable in WFF, tell Vince and propose the nearest real alternative — don't fake it.

**Must have:**

- **Time** — 12/24h (user choice; default 24h). Optional leading zero (user choice). Seconds in interactive mode only, as a sweeping arc on the outer track or as small digits (user choice; default arc).
- **Secondary time** — UTC/Zulu by default; user can pick a different time zone offset if WFF's timezone data sources allow (v3+ added timezone-related sources — verify). Label it `UTC` / `Z` per convention.
- **Date** — day-of-week, day, month (short, uppercase). User choice of format: `SUN 30 AUG`, `30 AUG`, `08/30`, `2026-08-30`.
- **Day of year** (`DOY 242`) and ISO week if WFF exposes them (verify; if not available as data sources, compute from available date sources with expressions if feasible — day-of-year from month+day is computable; if not cleanly computable, drop it and note in DECISIONS.md).
- **Battery percentage** + arc gauge; low-battery semantic color.
- **Heart rate** (WFF health data source or a complication slot, whichever behaves better on Samsung; verify permission requirements and what happens when unavailable — design the "—" state).
- **Steps** + step-goal progress arc.
- **Weather** (WFF v2+ weather data sources: condition, temperature, is-available). Unit follows system. Design the unavailable state.
- **Three configurable data fields** (bottom row) — user picks from a list: HR, steps, battery, calories/energy, distance, floors, weather temp, sunrise/sunset (if available as a data source; verify — if not, offer via complication), moon phase, notifications count, second time zone. Whatever the platform actually exposes.
- **Complication slots:** at least one, ideally three, in native positions (bottom center + left/right or 2×2 depending on chosen direction). Support the standard types (SHORT_TEXT, RANGED_VALUE, SMALL_IMAGE, ICON, GOAL_PROGRESS where applicable). Style them so third-party complications look consistent with the face (use the face's fonts/colors via WFF complication styling). Default each slot to a sensible provider.
- **Tap actions:** tapping a data field opens the relevant app where WFF allows launching (verify tap `Launch` action support and package names on Samsung Health vs. system apps — test on device).

**Nice to have (ask Vince which he wants):**

- Notifications unread count indicator (small, subtle).
- Sunrise/sunset markers on the outer track (only if the data is real).
- Moon phase glyph.
- Alarm indicator (if exposed).
- "Night Ops" dimmed red mode (5.5).
- Flavors (WFF presets): ship 4–6 curated presets (e.g., Default, Mono, Amber Ops, Ice, Minimal) so the Galaxy Wearable app shows one-tap styles.

### 5.9 Always-On Display (ambient) spec

- Same layout skeleton, reduced: time, secondary time, date, one or two key values, tick track majors only, no seconds, no arc sweep, gauges reduced to thin outlines or removed.
- Keep lit pixel area low. Use `Variant mode="AMBIENT"` overrides for opacity/size/visibility; prefer thin strokes and dimmed text (`#9A9A9A` for primary in ambient is acceptable) — but keep the accent visible on at least one element so the face stays identifiable.
- Use WFF v4+ ambient enter/exit transitions if targeted version supports them; keep them subtle (opacity only, ~200ms). No slides, no scaling effects.
- Test ambient with the watch actually in AOD (lower the wrist, wait), not just in the customization preview.

### 5.10 Customization schema (what shows up in the customize menu)

Design the `UserConfigurations` so the customization menu reads like a first-party face. Group and order:

1. **Style** — Accent color (ColorConfiguration, with the 8+ swatches and Mono).
2. **Time** — 12/24h · Leading zero · Seconds style (Arc / Digits / Off).
3. **Second time zone** — UTC or offset list (if possible).
4. **Date** — Format list.
5. **Data fields** — Field 1 / Field 2 / Field 3 pickers (ListConfiguration).
6. **Gauges** — Left gauge source · Right gauge source (or Off).
7. **Display** — Tick density (60 / 12 / Off) · Night Ops (if built) · AOD brightness (Normal / Dim).
8. **Complications** — handled by the system for each slot.

Every option needs a clear label in `strings.xml`, a sensible default, and an accurate preview (the customize UI renders your XML live, so each option must look correct in the preview, not just at full size). Use nested settings (WFF v5) only if targeting v5.

---

## 6. BUILD PHASES & GATES

Each phase ends with a gate. Do not pass a gate on your own say-so; each gate requires either Vince's approval or a concrete artifact (screenshot, validator output) recorded in `PROGRESS.md`.

### Phase 0 — Discovery & design lock (no code beyond throwaway mockups)

1. Re-read this spec.
2. Verify platform facts you can verify (fetch the WFF reference and release notes; note current WFF version numbers, data sources available, complication types).
3. Produce the three design directions (5.4) as rendered PNGs, interactive + ambient, two accent colors each.
4. Send Vince the batched Phase 0 questions (Section 10) with your recommendations.
5. **Gate:** Vince picks a direction and answers the questions. Write the locked design into `DECISIONS.md` as "Design Lock v1." Any later change to the lock is recorded as v2, v3, etc.

### Phase 1 — Environment, skeleton, first deploy

1. Set up tooling (Section 4). Get the emulator running.
2. Build the official Google sample, run the validator and memory tool on it, and deploy it to the emulator. This proves the pipeline.
3. Create the project skeleton. Replace the sample XML with a minimal version of the locked design: background, tick track, time only.
4. Walk Vince through enabling wireless ADB on the Ultra 2. Deploy the minimal face to the real watch.
5. **Gate:** Screenshot from the real watch showing the minimal face rendering at correct resolution, validator passing, memory numbers recorded.

### Phase 2 — Core layout & AOD

1. Implement the full static layout: time, secondary time, date, DOY, tick track, gauge outlines, data field labels (values can be placeholders wired to real sources even if the values are "—").
2. Implement ambient mode fully (5.9).
3. Run the long-value test: temporarily force every text field to its widest plausible value (see 7.2) and screenshot. Fix every clip and collision.
4. **Gate:** Vince reviews on-device: interactive + ambient, day and night. He confirms hierarchy, font, and layout. Record his feedback verbatim in `PROGRESS.md`.

### Phase 3 — Data layer

1. Wire battery, HR, steps, weather, secondary time zone, day-of-year.
2. Build every "unavailable" state (no HR yet, no weather, phone disconnected). Screenshot each.
3. Semantic low-battery state.
4. **Gate:** Screenshots of all data states; Vince confirms the real values on his wrist match what the watch reports elsewhere (compare HR/steps with Samsung Health).

### Phase 4 — Complications & customization

1. Complication slots with default providers, styled to match. Test with at least five different third-party/Samsung providers per slot (weather, calendar, sleep, energy score, timer, etc.) and screenshot each. Fix anything that looks foreign.
2. Full customization schema (5.10). Test every option, including every accent color, in the on-watch customize UI and in the Galaxy Wearable phone app. Screenshot the customize menu itself.
3. Flavors, if agreed.
4. **Gate:** Vince plays with customization on his watch and phone and confirms the menu feels native and every option works.

### Phase 5 — The "native audit" polish pass

Do this with fresh eyes (re-read Section 5 first). Go through the face element by element and ask, for each: *Would Samsung ship this?* Fix alignment to the pixel, baselines, tracking, stroke weights, concentricity, optical centering, contrast. Compare side-by-side with a screenshot of one of Samsung's own Ultra faces at the same resolution. Produce a before/after screenshot set.

**Gate:** Vince approves the polished build as "release candidate."

### Phase 6 — QA

Run the full matrix in Section 7. Fix everything. Re-run validator and memory tool; record final numbers.

**Gate:** All checklist items checked in `PROGRESS.md`, signed AAB built.

### Phase 7 — Store assets & publish

See Section 8. **Gate:** Face is live on Google Play (at least internal testing, then production) and Vince has installed it on the Ultra 2 from the Play Store, not via ADB.

---

## 7. QUALITY BARS & TEST MATRIX

### 7.1 Automated (on every build via scripts/check.sh)

- WFF validator passes for the targeted version, zero errors, zero warnings you can't justify in DECISIONS.md.
- Memory footprint tool: record interactive and ambient numbers; both must be comfortably under system limits with headroom (target < 50% of the limit).
- Bundle builds signed; `bundletool` can extract and install an APK to the emulator.

### 7.2 Visual matrix (screenshot every cell, inspect every screenshot)

- **Times:** `00:00`, `09:09`, `11:11`, `12:00`, `23:59`, `1:07 AM` in 12h, `12:34 PM` in 12h.
- **Dates:** `WED 30 SEP`, `2026-12-31`, day-of-year `001` and `366`.
- **Values:** HR `—`, `48`, `199`; steps `0`, `999`, `12,345`, `100,000`; battery `100`, `15`, `4`; temp `-12°`, `104°`, unavailable; weather every condition glyph.
- **Modes:** interactive, ambient, customize preview.
- **Themes:** every accent color, Mono, Night Ops (if built).
- **Complications:** each slot empty, each slot with a long-text provider, an icon-only provider, a ranged-value provider.
- **Connectivity:** phone connected, phone disconnected (weather unavailable), first boot before any health data.

### 7.3 Behavior

- Seconds arc is smooth and aligns exactly to the tick track (the arc end at :15 sits on the 15 major tick).
- No layout shift when any value changes (tabular numerals verified).
- Tap actions open the right apps.
- Ambient enter/exit clean; no flash, no leftover interactive elements.
- Battery drain over 24h with the face installed is not meaningfully worse than a built-in Samsung face (Vince checks the battery graph).
- Face survives a watch reboot and a phone disconnect/reconnect.

---

## 8. PLAY STORE PUBLISHING

### 8.1 Division of labor

- **Claude Code:** produces the signed AAB, keystore (stored safely — explain to Vince where it is and that losing it means he can never update the app), the listing copy, the WO-G4-compliant icon, feature graphic, screenshots at the required Wear OS sizes, privacy policy text (a static page — the face collects nothing; still needed if health permissions are declared), and a step-by-step upload guide written for Vince.
- **Vince:** clicks through Play Console using that guide. He already has a Google Play Developer account and an existing Play Console app (MD Weather Alerts) so he knows the basic layout. If Vince prefers, offer to set up Gradle Play Publisher with a service account so uploads become a command — but only after the first manual upload succeeds, and only if he asks.

### 8.2 Play Console steps (put these in PUBLISH_GUIDE.md in more detail, with what each screen looks like)

1. Play Console → Create app → type: App (not Game), free.
2. Test and release → Setup → Advanced settings → Form factors → Add new form factor → Wear OS. Opt in and accept terms.
3. Complete the App content section (privacy policy URL, data safety — declare exactly what permissions/data the face uses, likely body sensors for HR; ads: none; target audience: adults).
4. Store listing: name, short description, full description, icon (WO-G4 compliant — centered circular watch face render), feature graphic, Wear OS screenshots (round, real renders, no marketing frames or fake bezels unless Play guidelines allow them — read the current listing asset rules).
5. Internal testing track first: upload AAB, add Vince's Google account as a tester, publish. Vince installs from the Play Store on his phone → watch (or from the watch's Play Store). Confirm it works.
6. Then Production: create release, upload the same AAB, submit for review. Wear OS review checks against the Wear OS app quality guidelines; expect a few days.
7. After approval: verify the listing renders correctly on the watch's Play Store and the face can be installed cleanly on a fresh device.

### 8.3 Listing copy guidance

Write it the way Samsung or a serious indie studio would: what the face is, what data it shows, customization list, AOD support, supported devices. No hype, no emoji, no "ultimate," no "revolutionary." Include a short changelog convention for future updates.

---

## 9. REPO HYGIENE & DOCUMENTS TO MAINTAIN

- `TACTICAL_WATCHFACE_SPEC.md` — this file, never edited by Claude Code except to append a "Clarifications" section at the bottom recording Vince's answers.
- `CLAUDE.md` — pointer to this spec; the re-read rule.
- `PROGRESS.md` — phase, checklist state, gate status, blockers, re-read log.
- `DECISIONS.md` — design locks and engineering decisions with rationale.
- `PUBLISH_GUIDE.md` — Vince's step-by-step Play Console walkthrough.
- `screenshots/` — every gate's evidence, named `phaseN_description_YYYYMMDD.png`.
- Fonts' LICENSE files alongside the fonts.

---

## 10. PHASE 0 QUESTIONS FOR VINCE (ask as one batch, with a recommendation for each)

1. Which design direction: A (SECTOR), B (MERIDIAN), C (GRID), or a combination? **Recommendation:** A.
2. Name of the watch face (store name + on-watch name). **Recommendation:** pick something one or two syllables, no "Pro," no "Tactical" in the name itself.
3. Default accent color. **Recommendation:** Phosphor Amber for continuity with his Garmin TELEMETRY face, if he wants the two to feel like a family; otherwise Signal Orange.
4. 24h default? Show seconds by default (arc)? **Recommendation:** 24h, arc.
5. Secondary time zone: UTC fixed, or user-selectable offset? **Recommendation:** user-selectable if WFF allows, default UTC.
6. Which three data fields default in the bottom row? **Recommendation:** HR · Steps · Battery.
7. Left/right gauge defaults? **Recommendation:** Step goal · Battery.
8. Complication slot count/positions per chosen direction. **Recommendation:** bottom center + two side slots.
9. Want Night Ops (dimmed red) mode? Want Flavors/presets? **Recommendation:** yes to both if time allows; Flavors are cheap.
10. WFF v4 (wider device reach) vs v5 (newest features, Wear OS 7 only)? **Recommendation:** v4 unless a v5 feature is essential.
11. Package name (propose e.g. `com.<vincebrand>.watchface.<name>`) — just confirm.
12. Does he want to try the same face on Galaxy Watch 9 / Pixel Watch emulators for broader QA, or Ultra 2 only for v1? **Recommendation:** Ultra 2 primary; emulator sanity check on one other round Wear OS 6 device before publishing.

---

## 11. GLOSSARY FOR VINCE

- **WFF (Watch Face Format):** Google/Samsung's XML-only way to build watch faces. No code, very battery-friendly, and the only kind the Play Store accepts now.
- **AAB:** Android App Bundle — the file you upload to the Play Store.
- **ADB:** the tool that lets the Mac talk to the watch over Wi‑Fi to install test builds.
- **AOD / Ambient:** the dimmed always-on version of the face when your wrist is down.
- **Complication:** a small slot on the face that shows data from another app (weather, calendar, sleep). You pick what goes in each slot.
- **Flavor:** a preset combination of style settings that shows up as a one-tap option in the Galaxy Wearable app.
- **Validator:** a checker that confirms the face XML is valid before it goes near the store.
- **Keystore:** the signing key that proves updates come from you. Losing it means you can never update the app — back it up.

*End of spec. Claude Code: re-read Section 0 now, then begin Phase 0.*

---

## CLARIFICATIONS

*(Appended by Claude Code only, to record Vince's answers. Nothing above this line is ever edited.)*

### 2026-08-31 — Phase 0 answers (Design Lock v1)

Vince accepted every recommendation in the §10 batch, with two additions and one deletion. Recorded
here verbatim where he was explicit; the full lock is in `DECISIONS.md`.

**Scope changed from one face to two.** *"shipping two faces. ditch C. don't use anymore in plans or
anything."* MERIDIAN (Option B) ships first, SECTOR (Option A) second — order from *"let's do B and
A later once b is done"*. GRID is dropped entirely.

This affects §6, §7 and §8, all written for a single face: **WFF permits one watch face per app**
(verified, `PLATFORM_FACTS.md` §3a), so this is two packages, two Play listings, two store asset
sets and two review cycles, sharing one keystore, repo, design system and QA matrix.

**Two design changes he asked for directly:**

- *"I just don't like how the actual time is up high on the face. should it be centered?"* — yes.
  SECTOR's time now sits on the true vertical centre, which cost one row (D-011), and knock-on from
  that moved its gauges into the data row (D-014).
- *"the info squares are not utilizing the watches round space. I want it to make use of the
  space."* — applied to GRID first (D-012), then, once the principle was clear, to SECTOR's data
  band as well (D-014) and to MERIDIAN's sub-dials and date aperture (D-013).

**Two additions:** *"I'd like to however include the compass in the watch faces as well. also night
mode."*

- **Night mode: in.** Built as §5.5's Night Ops (D-016). One consequence the spec did not
  anticipate: Night Ops turns the whole face red, so §5.5's low-battery red has no hue left to
  signal with. Resolved by carrying that alert on intensity instead — the low-battery value stays
  at full brightness while everything else dims.
- **Compass: cannot be built.** Verified against the validator's data-source registry, the
  complication provider enum, and every v1–v5 XSD (D-017). WFF exposes no magnetometer, heading or
  bearing at any version; `Gyro` is tilt parallax, not direction. Per §5.8, the nearest real
  alternatives go in instead: a tap-to-open Compass shortcut on both faces, and a heading
  complication if a provider proves to exist on the device (Phase 4 check). Whether that readout
  earns a slot is still Vince's to decide.

**Both settled the same day.** *"give the compass readout a slot and reading as you recommended and
on both faces. night mode should be the native night mode Samsung ultra 2 watch faces have. on,
off, or auto setting."*

- **Heading takes a slot on both faces** (D-019): MERIDIAN's 3 o'clock sub-dial, and a fourth
  compartment added to SECTOR's band so weather is not displaced.
- **Night mode ships as On / Off / Auto** (D-018), but not Samsung's. Samsung's night mode is
  first-party — it runs on *Simple Ultra* and *Ultra Analog* only and triggers off the ambient
  light sensor. WFF exposes no light-sensor source and `Variant` accepts exactly one mode,
  `AMBIENT`, so no third-party face can join the feature. Ours matches the options, the menu
  location and the look; Auto switches on real daylight (`WEATHER.IS_DAY`) rather than room
  brightness, with a fixed evening window as fallback when weather is unavailable.

**Corrections to the spec's own assumptions,** all verified rather than assumed:

- Day-of-year needs no computation — `DAY_OF_YEAR` is a v1 source, as is ISO week (§5.8 planned a
  fallback that is unnecessary).
- There is no second-time-zone data source; Zulu comes from arithmetic on `UTC_TIMESTAMP` (§5.8).
- No sunrise/sunset, calories, distance or floors sources exist, so §5.8's data-field picker list
  shrinks to what the platform actually exposes.
- §5.8 says "ICON"; the actual complication type is `MONOCHROMATIC_IMAGE`.
- §3.3's v4-vs-v5 recommendation is stronger than taste: Google's validator still caps at v4, so
  v5 would mean building without the gate §7.1 requires.
