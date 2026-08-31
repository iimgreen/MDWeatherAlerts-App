# DECISIONS

Every non-trivial engineering choice and why (spec §0.4). Design Locks are numbered and never
rewritten — a change becomes a new version.

---

## Design Lock

**Not yet locked.** Phase 0 gate is open: Vince has not yet picked a direction or answered the
Section 10 questions. Design Lock v1 gets written here the moment he does.

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
