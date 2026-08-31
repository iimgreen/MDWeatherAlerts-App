# DECISIONS

Every non-trivial engineering choice and why (spec §0.4). Design Locks are numbered and never
rewritten — a change becomes a new version.

---

## Design Lock v1 — 2026-08-31

Vince: *"all your recommendations are great. I'd like to however include the compass in the watch
faces as well. also night mode."*

Every §10 question answered. Changes from here are recorded as v2, v3 — this text is not rewritten.

| | Locked |
|---|---|
| **Faces** | Two: **MERIDIAN** (analog field watch) first, **SECTOR** (digital instrument) second. GRID dropped. |
| **Names** | MERIDIAN, SECTOR. VECTOR is the spare. Play collision check before first upload. |
| **Packages** | `com.mdweatheralerts.watchface.meridian`, `com.mdweatheralerts.watchface.sector`. Permanent after first publish. |
| **Repo** | New dedicated repo; two Gradle app modules plus a shared resource module (D-015). Vince creates it empty. |
| **Format** | WFF v4 (D-002, and the validator ceiling in `PLATFORM_FACTS.md` §1). |
| **Colour** | Phosphor Amber `#FFB000` default; 8 accents + Mono + Night Ops. One accent visible at a time. |
| **Time** | 24-hour default, seconds as the sweeping arc. 12/24h, leading zero and Arc/Digits/Off all configurable. |
| **Second time** | UTC/Zulu default; selectable offset added in Phase 4 once `UTC_TIMESTAMP` units are confirmed on-device. |
| **SECTOR data** | Band reads `STEPS · [weather] · [heading] · BATT` — four compartments, two of them complication slots. |
| **MERIDIAN data** | Sub-dial slots: HR at 9, heading at 3. Steps keeps its arc gauge. Date aperture at 6. Zulu above the pivot. |
| **Gauges** | SECTOR: bars beneath their values (D-014). MERIDIAN: arcs flanking 12. Both native off `STEP_PERCENT` / `BATTERY_PERCENT`. |
| **Slots** | Two per face. One on each defaults to the heading readout. |
| **Night mode** | **On / Off / Auto** in the customization menu. Auto runs off daylight, not the light sensor (D-018). |
| **Flavors** | In — Default, Mono, Amber Ops, Ice, Minimal. |
| **Also in** | Unread notification count. **Deferred past v1:** moon phase, sunrise/sunset. |
| **QA** | Ultra 2 primary; one round Wear OS 6 emulator check before publishing. |
| **Compass** | **Heading readout gets a slot on both faces**, plus tap-to-open Compass. No live rose — WFF exposes no magnetometer (D-017). |

The layouts this locks are `mockups/optionB2_*` (MERIDIAN) and `mockups/optionA3_*` (SECTOR).

---

---

## Engineering decisions

### D-001 · Project lives in `tactical-watchface/`, not at the repo root
**2026-08-30.** The spec (§0.4, §9) assumes a dedicated repo and puts `CLAUDE.md`, `PROGRESS.md`,
`DECISIONS.md` at the root. This branch is on `iimgreen/MDWeatherAlerts-App`, which already hosts a
different, unrelated product (a static GitHub Pages weather site with its own `index.html`,
`CNAME`, and service worker). Putting a watch-face `CLAUDE.md` at that root would misdirect every
future session in the weather repo.

So the whole project sits in `tactical-watchface/` with the spec's file layout preserved *inside*
it. This is a file-structure call, which §0.3 says to make without asking. **But the repo choice
itself is Vince's** — a separate repo is the right long-term home, and it is Question 0 in the
Phase 0 batch. If he agrees, this directory moves wholesale and nothing else changes.

### D-002 · Verify against Google's schemas and validator source, not the docs pages alone
**2026-08-30.** §3.3 forbids writing XML from memory and requires confirming every element and data
source in the reference. The doc pages do not enumerate the expression data sources anywhere I
could find. `github.com/google/watchface` does: the XSDs under
`third_party/wff/specification/documents/{1..5}/` and `tools/dwf-validator/.../VersionRegistry.kt`
are what the validator actually enforces, so they are a stricter source than prose. The full
inventory is transcribed into `PLATFORM_FACTS.md` with per-source minimum versions. The repo is
pinned in that file at commit `44b1855` so the claims are re-checkable.

### D-003 · Mockups rendered from hand-written SVG, not the emulator
**2026-08-30.** §5.4 prefers the emulator "because it forces you to design within WFF constraints
from day one", with a faithful SVG render as the stated alternative. This session runs in a Linux
container with no Android SDK, no emulator, and no watch — the emulator route is Phase 1 work on
Vince's Mac. Rather than stall Phase 0, the mockups are SVG rendered by headless Chromium at
498 × 498.

The WFF-constraint discipline was kept deliberately: every mockup is built only from primitives WFF
actually has (`Line`, `Arc`, `Rectangle`, `PartText`, `ComplicationSlot`), every displayed value maps
to a verified data source in `PLATFORM_FACTS.md`, and there are no gradients, shadows, or blends.
Nothing in these mockups requires anything WFF cannot express. They are still mockups: the real
constraint test is Phase 1.

### D-004 · Text positions come from measured widths, not estimates
**2026-08-30.** §5.2 forbids text that can be clipped by longer values and §5.7 requires whole-pixel
placement. Glyph advances were measured in Chromium with the actual TTFs
(`mockups/src/measure.js`) and the layout was placed from those numbers. This caught two real
collisions — `100,000` steps overflowing a three-column row at the spacing I first chose, and the
Zulu readout colliding with the time in Option C. Both were fixed by geometry, not by shrinking
text at render time.

Consequence for the build: the steps field is the widest variable value on the face (`100,000` is
117 px at 36 px in Barlow Semi Condensed). It needs WFF auto-size with a `minSize` floor (v3+), or a
box designed for the widest case. This is a Phase 2 long-value-test item.

### D-005 · Candidate typefaces: Barlow Semi Condensed + IBM Plex Mono
**2026-08-30.** Both are SIL OFL, both ship with their licence files in `assets/fonts/`. Barlow Semi
Condensed is the display/numeral face: geometric-industrial, condensed enough to fit a large
24-hour time inside the round safe zone, and it reads as an instrument rather than a costume. IBM
Plex Mono carries labels in tracked small caps for a data-terminal feel without a mono display
face (§5.6 forbids mixing two monos).

This is a **provisional** pair, not a lock. §5.6 requires rendering the time in each candidate
on-device and comparing screenshots side by side, then showing Vince the top two — that is a
Phase 1/2 task on real hardware. Rajdhani and Chakra Petch were not tried; the spec flags both as
"can read gamer" and neither is worth the risk before there is a device to judge on.

### D-006 · Option A's bottom row is ordered STEPS · HR · BATT
**2026-08-30.** §5.4 gives the defaults as heart rate, steps, battery, and the gauges as step goal
(left) and battery (right). Left to right as written, the steps *field* would sit in the centre
while the step *gauge* hugs the left edge, and the battery field would sit under the battery gauge —
one pairing legible, one not. Reordering to STEPS · HR · BATT puts each gauge directly outboard of
the value it measures, so an unlabelled arc is unambiguous. Same three fields, same two gauges;
only the order changed. Flagged for Vince in Question 6 since it touches the visible default.

### D-007 · Option C drops the perimeter "corner arc gauges"
**2026-08-30.** §5.4's sketch for Option C calls for corner arc gauges. Rendered, two symmetric
arcs at the screen edge read as decorative brackets framing the face rather than as instruments —
which trips §5.2's ban on decoration. The step-goal and battery progress moved *inside* their own
cells as 3 px bars beneath the value, which is the modular idiom (and ties each gauge to the number
it belongs to). The perimeter is now bare except a single accent index at 12. Reversible if Vince
wants the arcs back.

### D-008 · Ambient shows only sources that actually update in ambient
**2026-08-30.** Ambient refreshes roughly once a minute (§3.2), and heart rate is not sampled on
that cadence. Showing a heart-rate number in AOD would be a stale value presented as live — which
is §1's "no fake readouts" in a subtler form. So heart rate is dropped from every ambient variant
rather than frozen at its last value. Steps, battery, weather, date and time all remain valid.

### D-009 · Element positions are identical between interactive and ambient
**2026-08-30.** Ambient reduces what is shown and how brightly, and moves nothing. A layout that
reflows on wrist-down reads as two different faces; §5.9's "same layout skeleton, reduced" and
§5.3's AOD-parity requirement both point the other way. The cost is more empty space in ambient,
which is the correct trade on an AMOLED panel where empty means unlit.

### D-010 · Low battery keys off `BATTERY_IS_LOW`, not a hardcoded 15 %
**2026-08-30.** §5.5 specifies the semantic red at ≤15 %. `BATTERY_IS_LOW` is a v1 system flag, so
the face can follow the platform's own definition of low instead of duplicating a threshold that
may not match what the watch shows elsewhere. If on-device testing shows the flag trips at a
different level than Vince expects, fall back to an explicit `BATTERY_PERCENT <= 15` comparison and
record it here.

### D-011 · Option A centres the time by dropping a row
**2026-08-31.** Vince's feedback: he likes A but not that the time sits high. He is right, and
the cause is arithmetic rather than taste. The composition was balanced around the screen centre,
but the *time* was not, because four rows stacked below it (Zulu, labels, values, weather) against
one above (date). With a 110 px time, centring its cap on y=249 leaves room for two rows below,
not four.

So one row had to go. The Zulu line moved *above* the time to sit with the date, and the separate
bottom-centre weather block was absorbed into the data row — the row's centre position is now the
complication slot itself. That satisfies §5.8's "at least one complication slot" while putting the
time's optical centre on 249.5 of 498.

The gauges also changed. Freeing the lower disc first tempted me to shorten them to ~34°, but
rendered, two short symmetric arcs beside the time read as brackets framing it — the same
decoration failure that killed Option C's perimeter arcs in D-007. They are back to 60°, which is
long enough to read as an instrument and still clears the data row (checked by angle and radius,
not by eye).

Cost, stated plainly: three values instead of three plus weather. Heart rate can occupy any of the
three positions.

### D-012 · Option C's panels are sized to the disc, not to a rectangle
**2026-08-31.** Vince's feedback: the modular idea is good but "the info squares are not utilizing
the watch's round space." Correct — a 2×2 grid of rectangles inscribed in a circle discards all
four corners, which on a 498 px disc is a large fraction of the usable area.

The fix uses a mechanism the platform already provides. `WatchFace` carries
`clipShape="CIRCLE"` (the default), so the system clips everything drawn beyond the case. A
`RoundRectangle` with a `Fill` — both verified present in the v4 XSD — can therefore be drawn
*past* the edge and the bezel cuts its outer corners into arcs at no cost. The four panels now
overhang the case and reach the top and bottom of the disc, with an 11 px rim.

Rejected on the way: a four-sector annular ring around a central time. It fills the disc more
completely, but horizontal text in the 3 and 9 sectors gets a window only ~92 px wide, and
`100,000` steps needs 110 px at the row's type size (D-004). Curved text would fix the width and
wreck the legibility. Three horizontal bands — panels, time, panels — keep every value on a
straight baseline and still fill the round space.

Content inside each panel is placed against the chord at its own height, not against the panel's
bounding box, so nothing drifts into a clipped corner. The accent index at 12 was kept: it clears
the panels (they reach r=209 on the vertical axis) and it is what keeps ambient identifiable
under §5.9, which the first pass at this layout had quietly broken by removing the perimeter.

### D-013 · Option B's slots become recessed sub-dials; the date gets an aperture
**2026-08-31.** The flaw I flagged in round 1 — the hands crossing the complication labels at 3 and
9 — was misdiagnosed as a layout cost to be lived with. It is not. Every analog watch with
sub-dials has hands crossing them, and it does not look broken on a real watch, because the hand
crosses *a dial*. Mine crossed bare text floating on black, which reads as a collision rather than
as depth.

So the slots are now recessed: a `#0D0D0D` disc with a `#1F1F1F` hairline ring, r=46. The date
moved into a framed aperture at 6 (`RoundRectangle` with the same ground and ring) instead of
floating text, which is the authentic field-watch device and seats it in the dial the same way.
The hands gained a 2 px case-coloured outline — up from 1.5 px — so they stay separated over a
lit sub-dial ground.

Moving the slots off the 3/9 axis was the other option and was rejected: hands sweep the whole
dial, so it relocates the crossing rather than solving it, and it gives up the positions users
expect a field watch to use.

Sizing: the sub-dial value dropped to 26 px and the dial grew from r=42 to r=46 after the first
render showed `8,420` nearly touching the ring. These are complication slots, so the value is not
under our control — `SHORT_TEXT` providers abbreviate (`100K`), which is what makes a small dial
workable at all. Worth re-checking in Phase 4 against the five providers per slot the spec
requires.

The residual crossing is real and stays: at 14:38 the hour hand meets the STEPS sub-dial, and the
mockup deliberately shows that hour rather than a flattering one.

### D-014 · Option A's data row is seated, and its gauges move under their values
**2026-08-31.** Two problems, one fix. Both were created or exposed by centring the time (D-011).

**The gauges stopped measuring anything nearby.** D-006 put the step-goal arc on the left and the
battery arc on the right specifically so each sat outboard of the value it measures. Centring the
time moved the values to the bottom of the face while the arcs stayed at 9 and 3, so the pairing
that justified their placement was gone — two unlabelled arcs beside the time, measuring numbers
40 % of the dial away. The progress therefore moved into the row as 3 px bars directly beneath
each number, which is the same device C uses (D-012) and leaves no ambiguity at all. The perimeter
arcs are removed.

That is a deviation from §5.4, which specifies "two arc gauges hugging the tick track" for this
direction. It is deliberate: the spec's sketch assumed the time sat high with the data beneath it,
and Vince's centring changed that premise. Reversible if he wants the arcs back, but the pairing
would go with them.

**The row was bare text on black** — the same failure as Option B's slots (D-013), spotted by
applying B's lesson back to A. The three values now sit on a recessed ground with hairline
separators, which also gives the complication slot a visible compartment; previously nothing
distinguished the swappable position from the two built-in ones.

The band overhangs the case and is clipped, so its ends are arcs rather than a rectangle sitting
inside a circle — Vince's round-space point from round 2, applied here rather than only to C. The
first attempt clipped at r=238 like C's panels and the band swallowed the tick track at both ends.
The clip is now r=208: concentric with the track by construction, and 6 px inside the majors, so
the gap is uniform at every angle rather than eyeballed. Value size dropped 34 → 28 to keep
`100,000` inside a compartment at the narrower radius.

Net effect across the three directions: each now seats its data in the dial and lets the case
shape it — sub-dials and an aperture in B, clipped panels in C, a clipped band in A. That
consistency was not planned; it fell out of fixing each one honestly.

### D-015 · Two faces means two apps, not one bundle with two faces
**2026-08-31.** Checked before replanning rather than assumed, because the answer decides the
shape of Phases 1–7. WFF puts the face at a fixed resource path — `res/raw/watchface.xml`, with one
`res/xml/watch_face_info.xml` — and the manifest declares no per-face service, only
`hasCode="false"` and the version property. Google's own sample has exactly one of each, and Play
Console guidance states each APK contains a single WFF watch face. **There is no way to ship two
faces in one bundle.**

So: two package names (permanent after first publish), two Play listings, two icon and screenshot
sets, two review cycles. Shared: one keystore, one repo, one `scripts/check.sh`, one set of fonts
and licences, one colour system and type scale, one QA matrix.

Repo structure follows from that — a Gradle project with two application modules and a shared
resource module, rather than one app module. Laid out in Phase 1; recorded here so the shape is
not re-litigated then.

Sequencing consequence worth stating: MERIDIAN goes through Phases 1–7 first and SECTOR follows.
The second face skips most of Phase 1 (tooling, emulator, ADB, pipeline proof) and inherits the
design system from the first, so it is substantially less work — but it does need its own Phase 7
in full, because a listing and a review cycle are not shareable.

### D-016 · Night Ops, and what it does to the low-battery red
**2026-08-31.** Vince asked for night mode; it is in. Per §5.5: every lit pixel dimmed ~35 % and the
accent shifted to deep red `#B3261E`, the night-vision preservation convention. Modelled in the
mockups as a group opacity of 0.65, which is also the most likely build: black stays black and only
lit pixels dim, so it costs nothing on an AMOLED panel. WFF v4 offers group `tintColor` and the
colour-transform functions (`colorRgb`, `colorArgb`, `extractColorFromColors`) if a per-element
palette swap turns out cleaner than a group alpha; that choice is Phase 2 work, not a lock.

**The conflict this creates, and the fix.** §5.5 reserves red for "something is wrong" — the
low-battery state turns the battery value and gauge `#FF5C5C`. In Night Ops the *entire face* is
red, so hue can no longer carry the alarm. Signalling it with a second colour would put two accents
on screen at once, which §5.2 forbids.

So in Night Ops the alert is carried by **intensity, not hue**: the low-battery value renders at
full brightness while everything else stays dimmed. Night-vision doctrine keeps everything dim, so
the one bright thing on the dial is the thing demanding attention. That is a stronger signal in the
dark than a colour shift would be, and it needs no second accent. To be built and screenshotted in
Phase 3 with the other data states.

Note also that Night Ops compounds with ambient — an already-dim AOD dimmed a further 35 % is very
dark, which is the intent, but §5.9 requires testing AOD on the wrist rather than in the preview.
The §5.10 "AOD brightness (Normal / Dim)" option is the escape hatch if it proves too dark.

### D-017 · The compass cannot be built, and what goes in instead
**2026-08-31.** Vince asked for a compass on both faces. It is not buildable, and this was checked
rather than assumed:

- No magnetometer, heading, bearing or azimuth data source exists in `VersionRegistry.kt` — the
  exact set the validator accepts — at any format version.
- No system complication provider for heading (`DefaultProviderPolicy` enumerates fourteen; none
  is a compass).
- Nothing in the v1–v5 XSDs matches magnet/heading/bearing/azimuth/compass.
- The one motion element, `Gyro`, is explicitly documented as a parallax transform driven by
  `ACCELEROMETER_ANGLE_*` — tilt against gravity. A rose driven by it would swing when the wrist
  turned and point nowhere, which is §5.2's "fake compass roses that don't point anywhere" and
  §3.2's "do not fake a compass" by name.

**Built instead, both real:**

1. **Tap-to-open.** A slot carries a compass glyph and launches the system Compass app on tap
   (`Launch`, with `APP_SHORTCUT` as the default provider). Real function, no invented data, works
   regardless of what complications exist. Going in on both faces.
2. **A heading readout, if a provider exists.** If Samsung's Compass — or any compass app Vince
   installs — publishes a `SHORT_TEXT` complication, a slot displays a genuine heading. Cannot be
   confirmed from this environment; **first check in Phase 4**, and it costs a slot, so Vince
   decides whether it earns one.

Offered but not added: an inclinometer. Tilt *is* real, so a spirit level or pitch readout is
buildable and would be an honest field instrument — but it is not what he asked for, and
substituting it silently would be its own kind of faking. His call.

### D-018 · Night mode ships as On / Off / Auto, and Auto runs off daylight
**2026-08-31.** Vince: *"night mode should be the native night mode Samsung ultra 2 watch faces have.
on, off, or auto setting."* The three-option setting is buildable. Parity with Samsung's is not,
and the gap is worth stating precisely because he will notice it.

**What Samsung's actually is.** Night mode on the Galaxy Watch Ultra runs on exactly two faces —
*Simple Ultra* and *Ultra Analog*, both first-party — and it triggers off the **ambient light
sensor**: the face goes red when the watch detects dim surroundings, and back when it detects
bright. Auto/On/Off live under long-press → Customize.

**Why a WFF face cannot join it.** Two independent blocks, both verified:

- No ambient-light data source exists. The validator's `SOURCES` map has accelerometer, battery,
  health, weather, time, date, notifications — no light sensor at any version.
- `Variant` has exactly one legal `mode`: `AMBIENT`. The v5 XSD enumerates that single value, so
  there is no night-mode variant for the system to drive.

Nothing in WFF exposes the system night-mode state either, so the face cannot even follow along
when Samsung's own toggles. This is a first-party feature; a third-party face gets no signal.

**What ships instead.** A `ListConfiguration` under Display: **On / Off / Auto** — the same three
options in the same menu, with the same look (dimmed ~35 %, accent to deep red). On and Off behave
identically to Samsung's.

**Auto is where they differ.** With no light sensor, Auto is driven by `WEATHER.IS_DAY` (v2) —
real daylight at the user's location, and honest data rather than a clock guess. So it switches at
actual sunset and sunrise, tracking the seasons, instead of when he walks into a dark room. A dark
garage at noon will not trigger it. When weather is unavailable (phone disconnected, no location)
`WEATHER.IS_AVAILABLE` is false and there is no daylight signal, so Auto falls back to a fixed
evening window off `HOUR_0_23` — a schedule, not invented data — so the setting always does
something. Both branches are `Condition` expressions; no new capability needed.

If on-wrist testing shows the daylight switch feels wrong, the fallback schedule can become the
primary and daylight the refinement. Recorded as a Phase 3 evaluation item.

### D-019 · The heading readout takes a slot on both faces
**2026-08-31.** Vince: *"give the compass readout a slot and reading as you recommended and on both
faces."* Settles the item D-017 left open. Both faces now carry two complication slots, one of
which defaults to a heading provider.

- **MERIDIAN** — the 3 o'clock sub-dial becomes heading; HR keeps 9. Steps was the displaced
  default and loses nothing important: its progress is already the step-goal arc flanking 12, so
  the dial still reports it, just as a gauge instead of a number.
- **SECTOR** — the band goes from three compartments to four: `STEPS · [weather] · [heading] ·
  BATT`. Adding a compartment rather than displacing weather keeps a §5.8 "must have" on the face.
  Geometry: the band's chord at the value baseline is 351.8 px wide (half-width
  `sqrt(208² − 111²) = 175.9`), so four compartments are 88 px each. Value type drops 28 → 26 px
  and labels 12 → 11 px to suit; `100,000` steps at 26 px is 84.5 px and fits, with auto-size still
  the backstop per D-004.

Neither face shows heading in ambient — it is a complication, and like heart rate it does not
update on an AOD cadence, so showing a stale bearing would be D-008's error repeated. Both slots
drop out in ambient as the weather slot already did.

Still true, and still worth repeating at Phase 4: **whether any provider on the device actually
publishes a heading complication is unconfirmed.** If none does, the slot falls back to its
secondary default and the tap-to-open Compass shortcut carries the feature alone. That check is the
first thing in Phase 4.
