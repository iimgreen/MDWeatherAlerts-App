'use strict';
/* Phase 0 mockup generator — three design directions at true device resolution.
   Throwaway mockups per spec §6 Phase 0. NOT production WFF XML.
   Every value shown maps to a verified WFF data source (see PLATFORM_FACTS.md).
   All text placement uses widths measured in Chromium (see measure.js), not estimates. */

const S = 498;              // Galaxy Watch Ultra 2 panel — confirm with `adb shell wm size`
const C = S / 2;            // 249

// ---- color system (spec §5.5) -------------------------------------------
const T = {
  bg: '#000000', surface: '#101010',
  primary: '#F2F2F2', secondary: '#9A9A9A', tertiary: '#5C5C5C',
  tickMinor: '#3A3A3A', tickMajor: '#CFCFCF',
  gaugeTrack: '#2A2A2A', alert: '#FF5C5C',
};
const AMB = { primary: '#C8C8C8', secondary: '#6E6E6E', tertiary: '#4A4A4A', tick: '#4A4A4A', faint: '#3A3A3A', value: '#8A8A8A' };
const ACCENTS = { amber: '#FFB000', ice: '#9AD8FF' };

// ---- sample state --------------------------------------------------------
// Local 14:38:22 EDT · UTC 18:38 · Sun 30 Aug 2026 (DOY 242, verified)
const D = {
  hh: '14', mm: '38', ss: 22, utc: '18:38',
  dow: 'SUN', day: '30', mon: 'AUG', doy: '242',
  hr: '72', steps: '8,420', stepPct: 0.842, batt: 86,
  temp: '74°',
};

// ---- geometry ------------------------------------------------------------
const rad = d => (d - 90) * Math.PI / 180;               // 0deg = 12 o'clock, clockwise
const P = (r, a) => [C + r * Math.cos(rad(a)), C + r * Math.sin(rad(a))];
const f = n => Math.round(n * 100) / 100;

function arc(r, a0, a1, w, color, cap = 'butt') {
  let span = a1 - a0;
  if (span <= 0.01) return '';
  if (span >= 359.99) span = 359.99;
  const [x0, y0] = P(r, a0), [x1, y1] = P(r, a0 + span);
  return `<path d="M ${f(x0)} ${f(y0)} A ${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${f(x1)} ${f(y1)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="${cap}"/>`;
}
function tick(a, rOut, rIn, w, color) {
  const [x0, y0] = P(rOut, a), [x1, y1] = P(rIn, a);
  return `<line x1="${f(x0)}" y1="${f(y0)}" x2="${f(x1)}" y2="${f(y1)}" stroke="${color}" stroke-width="${w}"/>`;
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

function text(x, y, s, { size = 20, fam = 'display', weight = 400, fill = T.primary, anchor = 'start', track = 0 } = {}) {
  const family = fam === 'mono' ? 'IBMPlexMono' : 'BarlowSC';
  // letter-spacing appends a trailing advance; compensate so tracked text stays optically placed
  let dx = 0;
  if (track) { if (anchor === 'middle') dx = -track / 2; else if (anchor === 'end') dx = -track; }
  return `<text x="${f(x + dx)}" y="${f(y)}" font-family="${family}" font-size="${size}" font-weight="${weight}" ` +
    `fill="${fill}" text-anchor="${anchor}"${track ? ` letter-spacing="${track}"` : ''} ` +
    `style="font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1">${esc(s)}</text>`;
}

// Zulu readout: value + tracked mono "Z" suffix, as one baseline-locked run.
function zulu(x, y, { size, fill, zFill, anchor = 'start' }) {
  const zs = Math.round(size * 0.53);
  return `<text x="${f(x)}" y="${f(y)}" font-family="BarlowSC" font-size="${size}" font-weight="500" fill="${fill}" ` +
    `text-anchor="${anchor}" style="font-variant-numeric:tabular-nums">${D.utc}` +
    `<tspan font-family="IBMPlexMono" font-size="${zs}" fill="${zFill}" letter-spacing="1.6" dx="${Math.round(size * 0.34)}">Z</tspan></text>`;
}

// Stroked outline weather glyph (partly cloudy) — system-icon idiom, not decoration.
function wxIcon(x, y, k, color) {
  return `<g transform="translate(${f(x)},${f(y)}) scale(${k})" fill="none" stroke="${color}" stroke-width="${f(2 / k)}" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="-4.5" cy="-6" r="4.5"/>
    <line x1="-4.5" y1="-14.5" x2="-4.5" y2="-12.6"/><line x1="-13" y1="-6" x2="-11.1" y2="-6"/>
    <line x1="-10.5" y1="-12" x2="-9.1" y2="-10.6"/>
    <path d="M -7 4.5 a 6 6 0 0 1 1.2 -11.8 a 8 8 0 0 1 15.2 2.6 a 4.6 4.6 0 0 1 -0.9 9.2 Z"/></g>`;
}

// =========================================================================
// OPTION A — SECTOR   digital instrument, left-aligned block
// =========================================================================
function optionA(acc, amb) {
  const pri = amb ? AMB.primary : T.primary;
  const sec = amb ? AMB.secondary : T.secondary;
  const ter = amb ? AMB.tertiary : T.tertiary;
  let g = '';

  for (let i = 0; i < 60; i++) {
    const a = i * 6, major = i % 5 === 0;
    if (amb) { if (major) g += tick(a, 232, 218, 2.5, a === 0 ? acc : AMB.tick); }
    else g += major ? tick(a, 232, 214, 2.5, T.tickMajor) : tick(a, 232, 224, 1.5, T.tickMinor);
  }
  if (!amb) {
    g += arc(237, 0, D.ss * 6, 2.5, acc);                          // seconds, hugging the track
    const low = D.batt <= 15;
    g += arc(200, 235, 305, 4, T.gaugeTrack);                      // left  = step goal
    g += arc(200, 305 - 70 * D.stepPct, 305, 4, acc);
    g += arc(200, 55, 125, 4, T.gaugeTrack);                       // right = battery
    g += arc(200, 125 - 70 * (D.batt / 100), 125, 4, low ? T.alert : T.tickMajor);
  }

  g += text(116, 110, `${D.dow} ${D.day} ${D.mon}`, { fam: 'mono', size: 19, fill: sec, track: 1.6 });
  g += text(382, 110, `DOY ${D.doy}`, { fam: 'mono', size: 19, fill: ter, track: 1.6, anchor: 'end' });
  g += text(112, 204, `${D.hh}:${D.mm}`, { size: 110, weight: 600, fill: pri });   // 256.6px wide -> 112..368.6
  g += zulu(114, 246, { size: 32, fill: sec, zFill: ter });

  const cols = [{ x: 130, l: 'STEPS', v: D.steps }, { x: 249, l: 'HR', v: D.hr }, { x: 368, l: 'BATT', v: `${D.batt}%` }];
  for (const c of cols) {
    if (amb && c.l === 'HR') continue;                              // HR is not sampled in AOD
    const low = D.batt <= 15 && c.l === 'BATT';
    g += text(c.x, 296, c.l, { fam: 'mono', size: 14, fill: amb ? AMB.faint : ter, track: 1.6, anchor: 'middle' });
    g += text(c.x, 336, c.v, { size: 34, weight: 600, fill: low ? T.alert : (amb ? AMB.value : T.primary), anchor: 'middle' });
  }

  if (!amb) {                                                       // bottom-centre complication slot
    g += text(249, 370, 'WEATHER', { fam: 'mono', size: 12, fill: T.tertiary, track: 1.8, anchor: 'middle' });
    g += wxIcon(217, 398, 1, T.secondary);
    g += text(239, 406, D.temp, { size: 38, weight: 600, fill: T.primary });
  }
  return g;
}

// =========================================================================
// OPTION B — MERIDIAN   analog field watch
// =========================================================================
function optionB(acc, amb) {
  const pri = amb ? AMB.primary : T.primary;
  const sec = amb ? AMB.secondary : T.secondary;
  const ter = amb ? AMB.tertiary : T.tertiary;
  let g = '';

  for (let i = 0; i < 60; i++) {
    const a = i * 6, major = i % 5 === 0;
    if (amb) { if (major) g += tick(a, 232, 218, 2.5, a === 0 ? acc : AMB.tick); }
    else g += major ? tick(a, 232, 215, 2.5, T.tickMajor) : tick(a, 232, 225, 1.5, T.tickMinor);
  }
  if (!amb) {
    g += arc(206, 296, 352, 4, T.gaugeTrack);                       // step goal, left of 12
    g += arc(206, 296, 296 + 56 * D.stepPct, 4, acc);
    g += arc(206, 8, 64, 4, T.gaugeTrack);                          // battery, right of 12
    g += arc(206, 64 - 56 * (D.batt / 100), 64, 4, D.batt <= 15 ? T.alert : T.tickMajor);
  }

  // hour numerals — 3 and 9 omitted in interactive, where the complication slots sit
  const hours = amb ? [12, 3, 6, 9] : [12, 1, 2, 4, 5, 6, 7, 8, 10, 11];
  for (const h of hours) {
    const [x, y] = P(178, h * 30);
    g += text(x, y + 9.5, String(h), { size: 27, weight: 500, fill: amb ? AMB.tertiary : (h === 12 ? T.primary : '#A0A0A0'), anchor: 'middle' });
  }

  g += zulu(207, 176, { size: 28, fill: sec, zFill: ter });          // Zulu above centre
  g += text(249, 356, `${D.dow} ${D.day} ${D.mon}`, { fam: 'mono', size: 16, fill: sec, track: 1.8, anchor: 'middle' });
  if (!amb) g += text(249, 378, `DOY ${D.doy}`, { fam: 'mono', size: 13, fill: ter, track: 1.6, anchor: 'middle' });

  if (!amb) for (const s of [{ x: 115, t: 'HR', v: D.hr }, { x: 383, t: 'STEPS', v: D.steps }]) {
    g += text(s.x, 236, s.t, { fam: 'mono', size: 12, fill: T.tertiary, track: 1.8, anchor: 'middle' });
    g += text(s.x, 274, s.v, { size: 30, weight: 600, fill: T.primary, anchor: 'middle' });
  }

  // hands ---------------------------------------------------------------
  const hAng = ((14 % 12) + 38 / 60) * 30;          // 79.0
  const mAng = 38 * 6 + D.ss * 0.1;                 // 230.2
  const quad = (ang, l1, l2, w1, w2) => {
    const [ax, ay] = P(l1, ang), [bx, by] = P(l2, ang);
    const n = rad(ang + 90), dx = Math.cos(n), dy = Math.sin(n);
    return `${f(ax + dx * w1 / 2)},${f(ay + dy * w1 / 2)} ${f(bx + dx * w2 / 2)},${f(by + dy * w2 / 2)} ${f(bx - dx * w2 / 2)},${f(by - dy * w2 / 2)} ${f(ax - dx * w1 / 2)},${f(ay - dy * w1 / 2)}`;
  };
  const hand = (ang, len, tail, wBase, wTip, tipLen) => {
    const wAtTip = wTip + (wBase - wTip) * tipLen / (len + tail);
    if (amb) return `<polygon points="${quad(ang, -tail, len, wBase, wTip)}" fill="none" stroke="${AMB.primary}" stroke-width="2" stroke-linejoin="round"/>`;
    let s = `<polygon points="${quad(ang, -tail, len - tipLen, wBase, wAtTip)}" fill="${T.primary}" stroke="${T.bg}" stroke-width="1.5" stroke-linejoin="round"/>`;
    if (tipLen) s += `<polygon points="${quad(ang, len - tipLen, len, wAtTip, wTip)}" fill="${acc}" stroke="${T.bg}" stroke-width="1.5" stroke-linejoin="round"/>`;
    return s;
  };
  g += hand(hAng, 130, 24, 11, 6.5, 0);
  g += hand(mAng, 198, 28, 8.5, 4.5, 28);
  if (!amb) {
    const [sx, sy] = P(210, D.ss * 6), [tx, ty] = P(-48, D.ss * 6);
    g += `<line x1="${f(tx)}" y1="${f(ty)}" x2="${f(sx)}" y2="${f(sy)}" stroke="${acc}" stroke-width="2"/>`;
    g += `<circle cx="${f(tx)}" cy="${f(ty)}" r="5" fill="${acc}"/>`;
  }
  g += `<circle cx="${C}" cy="${C}" r="6.5" fill="${pri}"/><circle cx="${C}" cy="${C}" r="2.5" fill="${T.bg}"/>`;
  return g;
}

// =========================================================================
// OPTION C — GRID   modular, data-dense
// =========================================================================
function optionC(acc, amb) {
  const pri = amb ? AMB.primary : T.primary;
  const sec = amb ? AMB.secondary : T.secondary;
  const ter = amb ? AMB.tertiary : T.tertiary;
  let g = '';

  g += tick(0, 232, 220, 2.5, acc);                                  // the only perimeter element

  g += text(104, 100, `${D.dow} ${D.day} ${D.mon}`, { fam: 'mono', size: 17, fill: sec, track: 1.6 });
  g += text(394, 100, `DOY ${D.doy}`, { fam: 'mono', size: 17, fill: ter, track: 1.6, anchor: 'end' });
  g += text(100, 188, `${D.hh}:${D.mm}`, { size: 92, weight: 600, fill: pri });   // 214.9px -> 100..315
  if (!amb) {                                                        // seconds, as the time's underline
    g += `<rect x="100" y="202" width="215" height="3" rx="1.5" fill="${T.gaugeTrack}"/>`;
    g += `<rect x="100" y="202" width="${f(215 * D.ss / 60)}" height="3" rx="1.5" fill="${acc}"/>`;
  }

  const cells = [
    { x: 96, y: 220, t: 'WEATHER', v: D.temp, wx: true },
    { x: 254, y: 220, t: 'HEART RATE', v: D.hr },
    { x: 96, y: 310, t: 'STEPS', v: D.steps, bar: D.stepPct },
    { x: 254, y: 310, t: 'BATTERY', v: `${D.batt}%`, bar: D.batt / 100 },
  ];
  for (const c of cells) {
    if (amb && !['WEATHER', 'BATTERY'].includes(c.t)) continue;      // only sources that update in AOD
    if (!amb) g += `<rect x="${c.x}" y="${c.y}" width="148" height="80" rx="10" fill="${T.surface}"/>`;
    const low = D.batt <= 15 && c.t === 'BATTERY';
    g += text(c.x + 15, c.y + 26, c.t, { fam: 'mono', size: 12, fill: amb ? AMB.faint : T.tertiary, track: 1.6 });
    if (c.wx && !amb) g += wxIcon(c.x + 28, c.y + 60, 0.85, T.secondary);
    g += text(c.wx && !amb ? c.x + 46 : c.x + 15, c.y + 66, c.v,
      { size: 33, weight: 600, fill: low ? T.alert : (amb ? AMB.value : T.primary) });
    if (c.bar != null && !amb) {                                     // in-cell gauge, tied to its own value
      g += `<rect x="${c.x + 15}" y="${c.y + 72}" width="118" height="3" rx="1.5" fill="${T.gaugeTrack}"/>`;
      g += `<rect x="${c.x + 15}" y="${c.y + 72}" width="${f(118 * c.bar)}" height="3" rx="1.5" fill="${low ? T.alert : (c.t === 'STEPS' ? acc : T.tickMajor)}"/>`;
    }
  }

  g += zulu(249, 424, { size: 24, fill: amb ? AMB.secondary : sec, zFill: amb ? AMB.faint : ter, anchor: 'middle' });
  return g;
}


// =========================================================================
// OPTION A2 — SECTOR, CENTRED   time on the true vertical axis
// Centring the time costs one row: the separate weather line is gone, and the
// bottom row's centre position becomes the complication slot instead.
// =========================================================================
function optionA2(acc, amb) {
  const pri = amb ? AMB.primary : T.primary;
  const sec = amb ? AMB.secondary : T.secondary;
  const ter = amb ? AMB.tertiary : T.tertiary;
  let g = '';

  for (let i = 0; i < 60; i++) {
    const a = i * 6, major = i % 5 === 0;
    if (amb) { if (major) g += tick(a, 232, 218, 2.5, a === 0 ? acc : AMB.tick); }
    else g += major ? tick(a, 232, 214, 2.5, T.tickMajor) : tick(a, 232, 224, 1.5, T.tickMinor);
  }
  if (!amb) {
    g += arc(237, 0, D.ss * 6, 2.5, acc);
    // 60deg gauges: short enough to clear the data row, long enough to read as
    // gauges rather than as brackets framing the time
    g += arc(200, 240, 300, 4, T.gaugeTrack);
    g += arc(200, 300 - 60 * D.stepPct, 300, 4, acc);
    g += arc(200, 60, 120, 4, T.gaugeTrack);
    g += arc(200, 120 - 60 * (D.batt / 100), 120, 4, D.batt <= 15 ? T.alert : T.tickMajor);
  }

  g += text(116, 142, `${D.dow} ${D.day} ${D.mon}`, { fam: 'mono', size: 19, fill: sec, track: 1.6 });
  g += text(382, 142, `DOY ${D.doy}`, { fam: 'mono', size: 19, fill: ter, track: 1.6, anchor: 'end' });
  g += zulu(249, 190, { size: 30, fill: sec, zFill: ter, anchor: 'middle' });
  // cap height at 110 is 79px, so baseline 289 puts the optical centre on 249.5
  g += text(249, 289, `${D.hh}:${D.mm}`, { size: 110, weight: 600, fill: pri, anchor: 'middle' });

  // one row, one baseline — the centre position is the complication slot
  const cols = [
    { x: 138, l: 'STEPS', v: D.steps },
    { x: 249, l: 'WEATHER', v: D.temp, slot: true },
    { x: 360, l: 'BATT', v: `${D.batt}%` },
  ];
  for (const c of cols) {
    if (amb && c.slot) continue;
    const low = D.batt <= 15 && c.l === 'BATT';
    g += text(c.x, 336, c.l, { fam: 'mono', size: 14, fill: amb ? AMB.faint : ter, track: 1.6, anchor: 'middle' });
    if (c.slot) { g += wxIcon(220, 366, 0.9, T.secondary); g += text(242, 372, c.v, { size: 34, weight: 600, fill: T.primary }); }
    else g += text(c.x, 372, c.v, { size: 34, weight: 600, fill: low ? T.alert : (amb ? AMB.value : T.primary), anchor: 'middle' });
  }
  return g;
}

// =========================================================================
// OPTION C2 — GRID, ROUND   panels sized to the disc, not to a rectangle
// The panels overhang the case; WatchFace clipShape="CIRCLE" cuts their outer
// corners to the bezel arc, so the layout fills the round space natively.
// =========================================================================
function optionC2(acc, amb) {
  const pri = amb ? AMB.primary : T.primary;
  const sec = amb ? AMB.secondary : T.secondary;
  const ter = amb ? AMB.tertiary : T.tertiary;
  const R = 238;                                     // panel clip — an 11px rim inside the bezel
  let g = `<defs><clipPath id="disc"><circle cx="${C}" cy="${C}" r="${R}"/></clipPath></defs>`;
  g += tick(0, 232, 220, 2.5, acc);                  // orientation index, and the accent
                                                     // anchor that keeps ambient identifiable


  const cells = [
    { x: 4, y: 40, al: 'l', t: 'WEATHER', v: D.temp, wx: true },
    { x: 253, y: 40, al: 'r', t: 'HEART RATE', v: D.hr },
    { x: 4, y: 320, al: 'l', t: 'STEPS', v: D.steps, bar: D.stepPct },
    { x: 253, y: 320, al: 'r', t: 'BATTERY', v: `${D.batt}%`, bar: D.batt / 100 },
  ];

  if (!amb) {                                        // panel grounds, clipped to the disc
    g += `<g clip-path="url(#disc)">` +
      cells.map(c => `<rect x="${c.x}" y="${c.y}" width="241" height="138" rx="20" fill="${T.surface}"/>`).join('') +
      `</g>`;
  }

  for (const c of cells) {
    if (amb && !['WEATHER', 'BATTERY'].includes(c.t)) continue;
    const low = D.batt <= 15 && c.t === 'BATTERY';
    const left = c.al === 'l';
    const tx = left ? 74 : 424, anchor = left ? 'start' : 'end';
    g += text(tx, c.y + (left === (c.y < 200) ? 0 : 0) + (c.y < 200 ? 78 : 28), c.t, { fam: 'mono', size: 12, fill: amb ? AMB.faint : T.tertiary, track: 1.6, anchor });
    if (c.wx && !amb) g += wxIcon(87, c.y + 112, 0.85, T.secondary);
    g += text(c.wx && !amb ? 105 : tx, c.y + (c.y < 200 ? 118 : 68), c.v,
      { size: 34, weight: 600, fill: low ? T.alert : (amb ? AMB.value : T.primary), anchor: c.wx && !amb ? 'start' : anchor });
    if (c.bar != null && !amb) {
      const bx = left ? 74 : 304;
      g += `<rect x="${bx}" y="${c.y + 76}" width="120" height="3" rx="1.5" fill="${T.gaugeTrack}"/>`;
      g += `<rect x="${bx}" y="${c.y + 76}" width="${f(120 * c.bar)}" height="3" rx="1.5" fill="${low ? T.alert : (c.t === 'STEPS' ? acc : T.tickMajor)}"/>`;
    }
  }

  // centre band — date, time on the vertical axis, Zulu on the same baseline
  g += text(74, 216, `${D.dow} ${D.day} ${D.mon}   ·   ${D.doy}`, { fam: 'mono', size: 16, fill: sec, track: 1.6 });
  g += zulu(424, 216, { size: 26, fill: sec, zFill: ter, anchor: 'end' });
  g += text(72, 298, `${D.hh}:${D.mm}`, { size: 96, weight: 600, fill: pri });
  if (!amb) {
    g += `<rect x="72" y="308" width="352" height="3" rx="1.5" fill="${T.gaugeTrack}"/>`;
    g += `<rect x="72" y="308" width="${f(352 * D.ss / 60)}" height="3" rx="1.5" fill="${acc}"/>`;
  }
  return g;
}


// =========================================================================
// OPTION B2 — MERIDIAN, revised   recessed sub-dials and a date aperture
// The hands still cross the slots several hours a day; that is unavoidable on
// an analog dial. What changes is that they now cross *something* — a recessed
// sub-dial, the way a real watch is built — instead of bare floating text.
// =========================================================================
function optionB2(acc, amb) {
  const pri = amb ? AMB.primary : T.primary;
  const sec = amb ? AMB.secondary : T.secondary;
  const ter = amb ? AMB.tertiary : T.tertiary;
  const SUNK = '#0D0D0D', RING = '#1F1F1F';
  let g = '';

  for (let i = 0; i < 60; i++) {
    const a = i * 6, major = i % 5 === 0;
    if (amb) { if (major) g += tick(a, 232, 218, 2.5, a === 0 ? acc : AMB.tick); }
    else g += major ? tick(a, 232, 215, 2.5, T.tickMajor) : tick(a, 232, 225, 1.5, T.tickMinor);
  }
  if (!amb) {
    g += arc(206, 296, 352, 4, T.gaugeTrack);
    g += arc(206, 296, 296 + 56 * D.stepPct, 4, acc);
    g += arc(206, 8, 64, 4, T.gaugeTrack);
    g += arc(206, 64 - 56 * (D.batt / 100), 64, 4, D.batt <= 15 ? T.alert : T.tickMajor);
  }

  // hour numerals — 3 and 9 give way to the sub-dials
  const hours = amb ? [12, 3, 6, 9] : [12, 1, 2, 4, 5, 6, 7, 8, 10, 11];
  for (const h of hours) {
    const [x, y] = P(178, h * 30);
    g += text(x, y + 9.5, String(h), { size: 27, weight: 500, fill: amb ? AMB.tertiary : (h === 12 ? T.primary : '#A0A0A0'), anchor: 'middle' });
  }

  // recessed sub-dials at 3 and 9 — the hands pass over a dial, not over nothing
  if (!amb) for (const sd of [{ x: 115, t: 'HR', v: D.hr }, { x: 383, t: 'STEPS', v: D.steps }]) {
    g += `<circle cx="${sd.x}" cy="${C}" r="46" fill="${SUNK}" stroke="${RING}" stroke-width="1"/>`;
    g += text(sd.x, 236, sd.t, { fam: 'mono', size: 11, fill: T.tertiary, track: 1.6, anchor: 'middle' });
    g += text(sd.x, 274, sd.v, { size: 26, weight: 600, fill: T.primary, anchor: 'middle' });
  }

  // date aperture at 6 — a framed window, the field-watch device, so the date
  // is seated in the dial rather than floating on it
  if (!amb) g += `<rect x="175" y="338" width="148" height="36" rx="7" fill="${SUNK}" stroke="${RING}" stroke-width="1"/>`;
  g += text(249, 362, `${D.dow} ${D.day} ${D.mon}`, { fam: 'mono', size: 16, fill: sec, track: 1.8, anchor: 'middle' });

  // Zulu and day-of-year sit above the pivot, clear of the hand tails
  g += zulu(249, 166, { size: 28, fill: sec, zFill: ter, anchor: 'middle' });
  if (!amb) g += text(249, 194, `DOY ${D.doy}`, { fam: 'mono', size: 13, fill: ter, track: 1.6, anchor: 'middle' });

  const hAng = ((14 % 12) + 38 / 60) * 30;
  const mAng = 38 * 6 + D.ss * 0.1;
  const quad = (ang, l1, l2, w1, w2) => {
    const [ax, ay] = P(l1, ang), [bx, by] = P(l2, ang);
    const n = rad(ang + 90), dx = Math.cos(n), dy = Math.sin(n);
    return `${f(ax + dx * w1 / 2)},${f(ay + dy * w1 / 2)} ${f(bx + dx * w2 / 2)},${f(by + dy * w2 / 2)} ${f(bx - dx * w2 / 2)},${f(by - dy * w2 / 2)} ${f(ax - dx * w1 / 2)},${f(ay - dy * w1 / 2)}`;
  };
  const hand = (ang, len, tail, wBase, wTip, tipLen) => {
    const wAtTip = wTip + (wBase - wTip) * tipLen / (len + tail);
    if (amb) return `<polygon points="${quad(ang, -tail, len, wBase, wTip)}" fill="none" stroke="${AMB.primary}" stroke-width="2" stroke-linejoin="round"/>`;
    // a 2px case-coloured outline is what keeps the hand legible over a sub-dial
    let s = `<polygon points="${quad(ang, -tail, len - tipLen, wBase, wAtTip)}" fill="${T.primary}" stroke="${T.bg}" stroke-width="2" stroke-linejoin="round"/>`;
    if (tipLen) s += `<polygon points="${quad(ang, len - tipLen, len, wAtTip, wTip)}" fill="${acc}" stroke="${T.bg}" stroke-width="2" stroke-linejoin="round"/>`;
    return s;
  };
  g += hand(hAng, 130, 24, 11, 6.5, 0);
  g += hand(mAng, 198, 28, 8.5, 4.5, 28);
  if (!amb) {
    const [sx, sy] = P(210, D.ss * 6), [tx, ty] = P(-48, D.ss * 6);
    g += `<line x1="${f(tx)}" y1="${f(ty)}" x2="${f(sx)}" y2="${f(sy)}" stroke="${acc}" stroke-width="2"/>`;
    g += `<circle cx="${f(tx)}" cy="${f(ty)}" r="5" fill="${acc}"/>`;
  }
  g += `<circle cx="${C}" cy="${C}" r="6.5" fill="${pri}"/><circle cx="${C}" cy="${C}" r="2.5" fill="${T.bg}"/>`;
  return g;
}


// =========================================================================
// OPTION A3 — SECTOR, seated   the data row gets a ground and its own gauges
// Centring the time (A2) left the flanking arcs measuring values that had moved
// to the bottom of the face. The progress moves into the row, under the number
// it belongs to, and the row gets a recessed ground so the values are seated in
// the dial rather than floating on it.
// =========================================================================
function optionA3(acc, amb) {
  const pri = amb ? AMB.primary : T.primary;
  const sec = amb ? AMB.secondary : T.secondary;
  const ter = amb ? AMB.tertiary : T.tertiary;
  const SUNK = '#0D0D0D', RING = '#1F1F1F';
  const BY = 306, BH = 68;
  // The band overhangs and is clipped, so its ends are arcs that fill the chord
  // instead of a rectangle sitting inside it. The clip radius is concentric with
  // the tick track and 6px inside the majors, so the band never eats the track.
  let g = `<defs><clipPath id="aband"><circle cx="${C}" cy="${C}" r="208"/></clipPath></defs>`;

  for (let i = 0; i < 60; i++) {
    const a = i * 6, major = i % 5 === 0;
    if (amb) { if (major) g += tick(a, 232, 218, 2.5, a === 0 ? acc : AMB.tick); }
    else g += major ? tick(a, 232, 214, 2.5, T.tickMajor) : tick(a, 232, 224, 1.5, T.tickMinor);
  }
  if (!amb) g += arc(237, 0, D.ss * 6, 2.5, acc);    // the only perimeter element besides the track

  g += text(116, 142, `${D.dow} ${D.day} ${D.mon}`, { fam: 'mono', size: 19, fill: sec, track: 1.6 });
  g += text(382, 142, `DOY ${D.doy}`, { fam: 'mono', size: 19, fill: ter, track: 1.6, anchor: 'end' });
  g += zulu(249, 190, { size: 30, fill: sec, zFill: ter, anchor: 'middle' });
  g += text(249, 289, `${D.hh}:${D.mm}`, { size: 110, weight: 600, fill: pri, anchor: 'middle' });

  // the seated row: one ground, three compartments, hairline separators
  if (!amb) {
    g += `<g clip-path="url(#aband)"><rect x="30" y="${BY}" width="438" height="${BH}" rx="14" fill="${SUNK}"/></g>`;
    for (const sx of [187.5, 310.5]) g += `<line x1="${sx}" y1="${BY + 12}" x2="${sx}" y2="${BY + BH - 12}" stroke="${RING}" stroke-width="1"/>`;
  }

  const cells = [
    { x: 126, l: 'STEPS', v: D.steps, bar: D.stepPct },
    { x: 249, l: 'WEATHER', v: D.temp, slot: true },
    { x: 372, l: 'BATT', v: `${D.batt}%`, bar: D.batt / 100 },
  ];
  for (const c of cells) {
    if (amb && c.slot) continue;                     // the slot is not redrawn in ambient
    const low = D.batt <= 15 && c.l === 'BATT';
    g += text(c.x, 332, c.l, { fam: 'mono', size: 12, fill: amb ? AMB.faint : ter, track: 1.6, anchor: 'middle' });
    if (c.slot) { g += wxIcon(c.x - 25, 354, 0.8, T.secondary); g += text(c.x - 4, 360, c.v, { size: 28, weight: 600, fill: T.primary }); }
    else g += text(c.x, 360, c.v, { size: 28, weight: 600, fill: low ? T.alert : (amb ? AMB.value : T.primary), anchor: 'middle' });
    if (c.bar != null && !amb) {                     // the gauge, directly under its own number
      g += `<rect x="${c.x - 42}" y="366" width="84" height="3" rx="1.5" fill="${T.gaugeTrack}"/>`;
      g += `<rect x="${c.x - 42}" y="366" width="${f(84 * c.bar)}" height="3" rx="1.5" fill="${low ? T.alert : (c.l === 'STEPS' ? acc : T.tickMajor)}"/>`;
    }
  }
  return g;
}

const OPTIONS = { A: optionA, B: optionB, C: optionC, A2: optionA2, C2: optionC2, B2: optionB2, A3: optionA3 };

function svg(option, accentKey, ambient) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<defs><clipPath id="c"><circle cx="${C}" cy="${C}" r="${C}"/></clipPath></defs>
<g clip-path="url(#c)"><rect width="${S}" height="${S}" fill="${T.bg}"/>
${OPTIONS[option](ACCENTS[accentKey], ambient)}
</g></svg>`;
}

module.exports = { svg, S, OPTIONS, ACCENTS, T, D };
