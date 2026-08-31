# PLATFORM FACTS — verified in Phase 0

Spec §6 Phase 0 step 2 requires verifying what can be verified before any design is locked.
Everything below was checked against a primary source on **2026-08-30**. Anything not verified is
marked **UNVERIFIED** and carries the action needed to settle it.

Primary sources used:

- `developer.android.com/training/wearables/wff` and `/release-notes` (official docs)
- `github.com/google/watchface` @ `44b1855` (2026-08-13, *"Support schema version 5"*) — the official
  XSD schemas under `third_party/wff/specification/documents/{1..5}/` and the validator source under
  `tools/dwf-validator/`. **This repo is the authority**: the schemas and
  `expression/VersionRegistry.kt` are what the validator actually enforces.

---

## 1. Watch Face Format versions

| WFF version | Minimum Wear OS | Minimum API | Notable additions |
|---|---|---|---|
| 1 | 4 | 33 | Style editing, groups, complications, tag expressions |
| 2 | 5 | 34 | **Flavors**, `GOAL_PROGRESS` + `WEIGHTED_ELEMENTS` complication types, **weather data sources**, heart-rate system complication source |
| 3 | 5.1 | 35 | **Auto-sizing text**, blend modes for combining objects, weighted constraints on lines, extra time-zone data sources |
| 4 | 6 | 36 | User-selected photos, **ambient enter/exit transitions**, colour transforms + group tinting, `Reference` element |
| 5 | 7 | — | Blend mode on `Group`/`ComplicationSlot`, line spacing + vertical align on `Text`, auto-size + vertical align on `TextCircular`, `minSize` on auto-sized `Font`, `join` on `Stroke`/`WeightedStroke`, **nested settings** and dynamic complications on `ListOption` |

Version 1–4 rows are the official docs table. The v5 row is from the release notes plus the v5 XSDs.

### The finding that matters for the v4-vs-v5 decision

`tools/dwf-validator/.../MAX_WFF_VERSION` is **4** at the current repo HEAD, even though the v5
schemas shipped in the same commit. **Google's own validator does not yet validate a v5 face.**
Spec §7.1 requires the validator to pass with zero errors on every build, so targeting v5 today
means giving up the automated gate. This is the strongest argument for the spec's own v4
recommendation, and it is not a matter of taste — see Question 10.

`clipShape` defaults to `CIRCLE`; `WatchFace` requires `width`/`height` and at least one `Scene`.
The version is declared as manifest meta-data `com.google.wear.watchface.format.version`.

---

## 2. Data sources — the authoritative inventory

From `VersionRegistry.kt` `SOURCES`, which is the exact set the validator accepts. The number is
the minimum WFF version.

**Time** — `UTC_TIMESTAMP`¹ · `MILLISECOND`¹ · `SECOND`¹ · `SECOND_Z`¹ · `SECOND_TENS_DIGIT`² ·
`SECOND_UNITS_DIGIT`² · `SECOND_MILLISECOND`¹ · `SECONDS_IN_DAY`¹ · `SECONDS_SINCE_EPOCH`³ ·
`MINUTE`¹ · `MINUTE_Z`¹ · `MINUTE_TENS_DIGIT`² · `MINUTE_UNITS_DIGIT`² · `MINUTE_SECOND`¹ ·
`MINUTES_SINCE_EPOCH`³ · `HOUR_0_11`¹ · `HOUR_0_11_Z`¹ · `HOUR_0_11_MINUTE`¹ · `HOUR_1_12`¹ ·
`HOUR_1_12_Z`¹ · `HOUR_1_12_MINUTE`¹ · `HOUR_0_23`¹ · `HOUR_0_23_Z`¹ · `HOUR_0_23_MINUTE`¹ ·
`HOUR_1_24`¹ · `HOUR_1_24_Z`¹ · `HOUR_1_24_MINUTE`¹ · `HOUR_TENS_DIGIT`² · `HOUR_UNITS_DIGIT`² ·
`HOURS_SINCE_EPOCH`³ · `AMPM_STATE`¹ · `AMPM_POSITION`¹ · `AMPM_STRING`¹ · `IS_24_HOUR_MODE`¹

**Date** — `DAY`¹ · `DAY_Z`¹ · `DAY_HOUR`¹ · `DAY_0_30`¹ · `DAY_0_30_HOUR`¹ · **`DAY_OF_YEAR`¹** ·
`DAY_OF_WEEK`¹ · `DAY_OF_WEEK_F`¹ · `DAY_OF_WEEK_S`¹ · `FIRST_DAY_OF_WEEK`² · `MONTH`¹ · `MONTH_Z`¹ ·
`MONTH_F`¹ · `MONTH_S`¹ · `DAYS_IN_MONTH`¹ · `MONTH_DAY`¹ · `MONTH_0_11`¹ · `MONTH_0_11_DAY`¹ ·
`YEAR`¹ · `YEAR_S`¹ · `YEAR_MONTH`¹ · `YEAR_MONTH_DAY`¹ · `WEEK_IN_MONTH`¹ · **`WEEK_IN_YEAR`¹**

**Time zone** — `TIMEZONE`¹ · `TIMEZONE_ABB`¹ · `TIMEZONE_ID`¹ · `TIMEZONE_OFFSET`¹ ·
`TIMEZONE_OFFSET_MINUTES`³ · `TIMEZONE_OFFSET_DST`¹ · `TIMEZONE_OFFSET_MINUTES_DST`³ ·
`IS_DAYLIGHT_SAVING_TIME`¹

**Health** — `STEP_COUNT`¹ · `STEP_GOAL`¹ · `STEP_PERCENT`¹ · `HEART_RATE`¹ · `HEART_RATE_Z`¹

**Battery** — `BATTERY_PERCENT`¹ · `BATTERY_CHARGING_STATUS`¹ · `BATTERY_IS_LOW`¹ ·
`BATTERY_TEMPERATURE_CELSIUS`¹ · `BATTERY_TEMPERATURE_FAHRENHEIT`¹

**Weather (all v2)** — `WEATHER.IS_AVAILABLE` · `WEATHER.IS_ERROR` · `WEATHER.CONDITION` ·
`WEATHER.CONDITION_NAME` · `WEATHER.IS_DAY` · `WEATHER.TEMPERATURE` · `WEATHER.TEMPERATURE_UNIT` ·
`WEATHER.DAY_TEMPERATURE_LOW` / `_HIGH` · `WEATHER.CHANCE_OF_PRECIPITATION` · `WEATHER.UV_INDEX` ·
`WEATHER.LAST_UPDATED` · plus indexed forecasts `WEATHER.HOURS.{n}.*` and `WEATHER.DAYS.{n}.*`

**Other** — `MOON_PHASE_POSITION`¹ · `MOON_PHASE_TYPE`¹ · `MOON_PHASE_TYPE_STRING`¹ ·
`UNREAD_NOTIFICATION_COUNT`¹ · `LANGUAGE_LOCALE_NAME`¹ · accelerometer
(`ACCELEROMETER_{X,Y,Z}`, `ACCELEROMETER_ANGLE_{X,Y,Z,XY}`, `ACCELEROMETER_IS_SUPPORTED`)¹

Expression functions include `round floor ceil clamp abs sqrt pow log sin cos tan numberFormat
icuText icuBestText subText textLength` (v1) and `colorRgb colorArgb extractColorFromColors
extractColorFromWeightedColors` (v4).

### What this settles for the design

**Available, so it goes on the face:**

- **Day of year** — `DAY_OF_YEAR` is a first-class v1 source. No computation needed; the spec's
  fallback plan for DOY is unnecessary. ISO week is available too via `WEEK_IN_YEAR`.
- **Heart rate, steps, step goal, step percent** — native, v1. The step-goal arc needs no
  complication; `STEP_PERCENT` drives it directly.
- **Battery + low-battery semantic** — `BATTERY_PERCENT` for the value and gauge, and
  `BATTERY_IS_LOW` for the ≤15 % red state (a real system flag rather than a hardcoded threshold).
- **Weather** — condition, temperature, unit, and an explicit `IS_AVAILABLE` / `IS_ERROR` pair, so
  the "weather unavailable" state the spec demands can be built properly.
- **Unread notifications, moon phase** — both native if Vince wants them.

**Not available — these need a decision, not a workaround:**

- **There is no second-time-zone data source.** Every time source reads local time. UTC/Zulu is
  still achievable: `UTC_TIMESTAMP` (v1) is epoch-based and therefore zone-free, so Zulu hours and
  minutes come out of arithmetic on it, and a user-selected offset is just an addend. So the
  spec's "UTC/Zulu secondary time" is buildable, and so is a user-selectable offset — but as
  expression arithmetic, not a data source. **UNVERIFIED:** the exact unit of `UTC_TIMESTAMP`
  (milliseconds vs seconds) is not stated in the registry. Confirm on-device in Phase 3 before
  wiring the Zulu readout. A `WORLD_CLOCK` system complication also exists as a fallback.
- **No sunrise/sunset data source.** The spec lists sunrise/sunset markers as a nice-to-have "only
  if the data is real". It is not real as a data source — but `SUNRISE_SUNSET` *is* a system
  complication default provider (below). So it can be a complication slot, and it cannot be an
  outer-track marker. Question 9 covers this.
- **No calories, distance, floors, or active minutes.** The health sources are steps and heart
  rate only. The spec's bottom-row picker list has to be trimmed to what exists, with the rest
  offered through a complication slot instead.
- **No compass, altimeter, barometer, GPS.** Confirmed — only the accelerometer is exposed, and it
  gives device tilt, not heading. The spec's "do not fake it" rule holds with nothing to fake.

---

## 3. Complication types and default providers

Complication types accepted on `ComplicationSlot supportedTypes` (from the v5 XSD):
`SHORT_TEXT` · `LONG_TEXT` · `RANGED_VALUE` · `GOAL_PROGRESS` · `WEIGHTED_ELEMENTS` ·
`MONOCHROMATIC_IMAGE` · `SMALL_IMAGE` · `PHOTO_IMAGE` · `EMPTY`

Note the spec's §5.8 list says "ICON" — the actual type name is `MONOCHROMATIC_IMAGE`.

System default providers for `DefaultProviderPolicy`:
`DATE` · `DAY_AND_DATE` · `DAY_OF_WEEK` · `TIME_AND_DATE` · `WORLD_CLOCK` · `HEART_RATE` ·
`STEP_COUNT` · `WATCH_BATTERY` · `UNREAD_NOTIFICATION_COUNT` · `SUNRISE_SUNSET` · `NEXT_EVENT` ·
`FAVORITE_CONTACT` · `APP_SHORTCUT` · `EMPTY`

`ComplicationSlot` also carries `isCustomizable`, `displayName`, `tintColor`, and (v5 only)
`blendMode`, plus `Variant` children — so ambient-mode overrides work on slots as well as elements.

---

## 3a. One watch face per app

Verified against Google's own sample (`play-validations/memory-footprint/test-samples/sample-wf`):
the face lives at the fixed path `res/raw/watchface.xml` with a single
`res/xml/watch_face_info.xml`, and the manifest declares no per-face service — only
`android:hasCode="false"` and the format-version property. There is no mechanism for a second face
in the same package. Google's Play Console guidance says the same: each APK contains a single
WFF watch face, and multiple faces are published as separate apps.

Consequences for a two-face project:

| Per face | Shared |
|---|---|
| Package name (permanent after first publish) | Signing keystore |
| Play listing, icon, feature graphic, screenshots | Repo, `scripts/check.sh`, CI |
| Store copy and changelog | Fonts and their licences |
| Review cycle | Colour system, type scale, accent palette |
| `watchface.xml`, `watch_face_info.xml`, `strings.xml` | Design language and QA matrix |

---

## 4. Device

- Galaxy Watch Ultra 2, 1.52″ round AMOLED, reported by spec sites as **498 × 498** (~327 ppi),
  peak 5,000 nits, Wear OS 7 / One UI 9.
- **UNVERIFIED and blocking for final layout.** The mockups are drawn at 498 × 498 on that
  reported figure. Spec §2 is explicit that this must be read off the hardware. First action in
  Phase 1: `adb shell wm size` and `adb shell wm density`. Every position in the design is a
  fraction of the radius, so a different panel size rescales cleanly — but it must be confirmed
  before pixel-snapping (§5.7) means anything.

---

## 5. Still to verify (Phase 1 / Phase 3)

| # | Question | When |
|---|---|---|
| 1 | True panel resolution and density | Phase 1, first ADB session |
| 2 | `UTC_TIMESTAMP` units, for the Zulu readout arithmetic | Phase 3 |
| 3 | Heart-rate permission prompt behaviour on One UI 9, and what `HEART_RATE` returns before the first reading | Phase 3 |
| 4 | Whether `Launch` tap actions can open Samsung Health, and its package name | Phase 3 |
| 5 | Current Play listing-asset rules and the WO-G4 icon requirement wording | Phase 7 |
| 6 | Whether the validator has raised `MAX_WFF_VERSION` to 5 by the time we ship | before release |
