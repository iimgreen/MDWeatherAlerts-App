'use strict';
const fs = require('fs'), path = require('path');
const M = '/home/user/MDWeatherAlerts-App/tactical-watchface/mockups';
const d = f => 'data:image/png;base64,' + fs.readFileSync(path.join(M, f)).toString('base64');

const OPTS = [
  {
    k: 'B2', name: 'MERIDIAN', kind: 'Analog field watch', revised: true, ships: 'Ships first',
    before: 'optionB_interactive_amber.png',
    beforeNote: 'The hands crossing the slot labels looked broken because the labels were bare text floating on the dial, with nothing for a hand to pass over. Recessing the slots into sub-dials and framing the date in an aperture seats both in the dial, so a hand crossing them now reads the way it does on a real watch.',
    lede: 'Full 60-tick minute track, hour numerals, hands with a lumed accent tip, recessed sub-dials at 3 and 9 carrying heading and heart rate, a framed date aperture at 6, and Zulu above the pivot.',
    reads: [
      ['Sub-dials', 'HR at 9, heading at 3 — both complication slots, recessed and ringed'],
      ['Date', 'A framed aperture at 6 — the field-watch device'],
      ['Hands', 'Tapered, with a 2px case-coloured outline so they stay legible over a sub-dial'],
      ['Ambient', 'Hands become outlines; four numerals return for orientation'],
    ],
    note: 'The hands still cross the sub-dials several hours a day — unavoidable on an analog dial, and visible above where the hour hand meets "STEPS". What changed is that it now reads as intended rather than as a collision.',
    tone: 'good',
  },
  {
    k: 'A3', name: 'SECTOR', kind: 'Digital instrument', revised: true, ships: 'Ships second',
    before: 'optionA_interactive_amber.png',
    beforeNote: 'Two passes. First the time came down to the true centre, which cost a row — Zulu moved above it and the weather line folded into the data row. That left the two arc gauges at 9 and 3 measuring values that had moved to the bottom of the face, so the progress moved into the row, under the number it belongs to, and the row gained a recessed ground that overhangs the case.',
    lede: 'Date and day-of-year across the top, Zulu beneath them, the time centred on the vertical axis, and a seated four-compartment band below carrying steps, weather, heading and battery.',
    reads: [
      ['Time', 'Optical centre on the screen centre — its cap is centred on 249 of 498'],
      ['Band', 'Overhangs the case; clipped concentric with the tick track, 6px inside it'],
      ['Gauges', 'Under the number each one measures, inside its own compartment'],
      ['Ambient', 'Twelve majors, the band ground drops away, accent kept on the 12 index'],
    ],
    note: 'The band went from three compartments to four to seat the heading readout. Heart rate can take any compartment you prefer — every one of them is configurable.',
    tone: 'good',
  },
];

const FINDINGS = [
  ['warn', 'One watch face per app — so two faces means two listings', 'Verified in Google\'s own sample: the face lives at a fixed path, <code>res/raw/watchface.xml</code>, one per package, and the manifest declares no per-face service. Two faces cannot share a bundle. That means two package names, two Play listings, two sets of store assets and two review cycles — but one keystore, one shared design system, and one repo.'],
  ['ok', 'Day of year is native', '<code>DAY_OF_YEAR</code> is a v1 data source, and so is ISO week. The spec\'s fallback plan for computing DOY from month and day is not needed.'],
  ['ok', 'Step goal needs no complication', '<code>STEP_PERCENT</code> and <code>BATTERY_PERCENT</code> drive both arc gauges directly. <code>BATTERY_IS_LOW</code> gives the red state a real system flag instead of a hardcoded 15%.'],
  ['ok', 'Weather has a real unavailable state', '<code>WEATHER.IS_AVAILABLE</code> and <code>WEATHER.IS_ERROR</code> exist, so the phone-disconnected case can be built properly rather than guessed at.'],
  ['warn', 'No second time zone source', 'Every WFF time source reads local time. Zulu is still buildable — <code>UTC_TIMESTAMP</code> is epoch-based, so UTC and any fixed offset come out of arithmetic. Its units are unconfirmed; I check that on your watch before wiring it.'],
  ['no', 'No sunrise/sunset, calories, distance or floors', 'The health sources are steps and heart rate, full stop. Sunrise/sunset exists only as a system <em>complication</em> provider — it can fill a slot, but it cannot mark the outer track the way the spec imagined.'],
  ['no', 'No compass, altimeter, barometer or GPS', 'Only the accelerometer is exposed, and it gives tilt, not heading. Nothing to fake, which is how the spec wants it.'],
  ['warn', 'Google\'s validator still caps at WFF v4', 'The v5 schemas have shipped but <code>MAX_WFF_VERSION</code> is still 4. Targeting v5 today means building without the automated gate the spec requires on every build. This is why question 10 has a real answer rather than a preference.'],
  ['warn', 'Panel resolution unconfirmed', 'These are drawn at 498×498 from published specs. The spec is explicit that it must be read off the hardware — first ADB command in Phase 1. Every position is a fraction of the radius, so a different panel rescales cleanly.'],
];

const LOCK = [
  ['Faces', 'MERIDIAN then SECTOR', 'Two apps — WFF allows one face per package'],
  ['Names', 'MERIDIAN · SECTOR', 'Checked for Play collisions before first upload'],
  ['Packages', 'com.mdweatheralerts.watchface.meridian / .sector', 'Permanent after first publish'],
  ['Repo', 'New dedicated repo, two app modules + shared resources', 'You create it empty; I lay it out'],
  ['Format', 'WFF v4', 'The validator still caps at 4, so v5 would mean no automated gate'],
  ['Accent', 'Phosphor Amber default, 8 + Mono', 'One accent visible at a time; night mode overrides it'],
  ['Time', '24-hour, seconds as the sweeping arc', 'Both user-configurable'],
  ['Second time', 'UTC / Zulu, selectable offset in Phase 4', 'Arithmetic on the epoch timestamp'],
  ['SECTOR band', 'STEPS · [weather] · [heading] · BATT', 'Four compartments, two of them slots'],
  ['MERIDIAN dials', 'HR at 9 · [heading] at 3', 'Both slots; steps keeps its arc gauge'],
  ['Compass', 'Heading readout in a slot, both faces', 'Plus tap-to-open Compass. No live rose — WFF has no magnetometer'],
  ['Gauges', 'SECTOR: bars under their values · MERIDIAN: arcs flanking 12', 'Native, no complication needed'],
  ['Night mode', 'On / Off / Auto', 'Auto runs off daylight, not the light sensor — see above'],
  ['Flavors', 'Default, Mono, Amber Ops, Ice, Minimal', 'One-tap presets in Galaxy Wearable'],
  ['Also in', 'Notification count', 'Moon phase and sunrise/sunset deferred past v1'],
  ['QA', 'Ultra 2 primary, one Wear OS 6 round emulator check', 'Before publishing'],
];

const NIGHT = [
  ['no', 'Samsung\'s own night mode is not reachable', 'Samsung\'s night mode runs on exactly two faces — <em>Simple Ultra</em> and <em>Ultra Analog</em>, both first-party — and it triggers off the <strong>ambient light sensor</strong>, going red when the watch detects dim surroundings. A Watch Face Format face gets neither: there is no light-sensor data source, and <code>Variant</code> accepts one single mode, <code>AMBIENT</code>. No third-party face on any platform version can join that feature or read what triggers it.'],
  ['best', 'What you get instead: the same three options, same place', 'Night mode ships as <strong>On / Off / Auto</strong> in the customization menu — long-press the face, Customize, swipe — which is exactly where you already change it on Samsung\'s faces, and it looks the same: everything dimmed, accent to deep red. On and Off behave identically to Samsung\'s.'],
  ['warn', 'Auto switches on daylight, not on room light', 'This is the one difference you will notice, so I would rather say it now than have you find it. Samsung\'s Auto goes red when you walk into a dark room. Mine goes red when the sun goes down, driven by <code>WEATHER.IS_DAY</code> — real daylight at your location, not a guess. Walking into a dark garage at noon will not trigger it. If weather is unavailable it falls back to a fixed evening window so Auto always does something.'],
];


const chip = { ok: ['Available', 'ok'], warn: ['Needs care', 'warn'], no: ['Not available', 'no'] };

const faceCard = o => `
<article class="dir" id="dir-${o.k}">
  <header class="dir-head">
    <span class="key">${o.k.replace(/[0-9]/g, "")}</span>
    <div class="dir-id">
      <h3>${o.name}</h3>
      <p class="kind">${o.kind}</p>
    </div>
    ${o.ships ? `<span class="ships">${o.ships}</span>` : ''}
  </header>
  <div class="stage">
    ${['interactive', 'ambient'].map(m => ['amber', 'ice', 'night'].map(a => `<img class="face" src="${d(`option${o.k}_${m}_${a}.png`)}" alt="${o.name}, ${m} mode, ${a === 'night' ? 'Night Ops' : a} accent" data-mode="${m}" data-accent="${a}"${m === 'interactive' && a === 'amber' ? '' : ' hidden'}>`).join('')).join('')}
  </div>
  <p class="lede">${o.lede}</p>
  <dl class="reads">
    ${o.reads.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}
  </dl>
  <p class="note note-${o.tone}">${o.note}</p>
  ${o.before ? `<div class="before">
    <img src="${d(o.before)}" alt="${o.name} as first drawn">
    <div><span class="eyebrow">What changed</span><p>${o.beforeNote}</p></div>
  </div>` : ''}
</article>`;

const html = `<title>Watch Face Design Lock</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Semi+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{
  --ground:#EAECEE; --plate:#FFFFFF; --sunk:#DFE2E5;
  --ink:#14171A; --ink-2:#4A5157; --ink-3:#767E85;
  --rule:#CDD2D6; --rule-soft:#E1E4E7;
  --accent:#9A6A00; --accent-mark:#C98A00;
  --ok:#1E6B4E; --ok-bg:#DCEDE4;
  --warn:#8A5A00; --warn-bg:#F4E8D2;
  --no:#8C3230; --no-bg:#F5DEDD;
  --shadow:0 1px 2px rgba(20,23,26,.06),0 8px 24px -12px rgba(20,23,26,.18);
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --ground:#0E1013; --plate:#171A1E; --sunk:#0A0C0E;
    --ink:#E6E8EA; --ink-2:#A8B0B7; --ink-3:#79828A;
    --rule:#272C32; --rule-soft:#1E2227;
    --accent:#FFB000; --accent-mark:#FFB000;
    --ok:#6FCFA0; --ok-bg:#12271E;
    --warn:#FFC24D; --warn-bg:#2A2113;
    --no:#F08B87; --no-bg:#2C1817;
    --shadow:0 1px 0 rgba(255,255,255,.03),0 16px 40px -20px rgba(0,0,0,.8);
  }
}
:root[data-theme="dark"]{
  --ground:#0E1013; --plate:#171A1E; --sunk:#0A0C0E;
  --ink:#E6E8EA; --ink-2:#A8B0B7; --ink-3:#79828A;
  --rule:#272C32; --rule-soft:#1E2227;
  --accent:#FFB000; --accent-mark:#FFB000;
  --ok:#6FCFA0; --ok-bg:#12271E;
  --warn:#FFC24D; --warn-bg:#2A2113;
  --no:#F08B87; --no-bg:#2C1817;
  --shadow:0 1px 0 rgba(255,255,255,.03),0 16px 40px -20px rgba(0,0,0,.8);
}

*{box-sizing:border-box}
body{
  margin:0; background:var(--ground); color:var(--ink);
  font:400 16px/1.62 Barlow,"Helvetica Neue",Arial,sans-serif;
  -webkit-font-smoothing:antialiased;
}
.wrap{max-width:1060px;margin:0 auto;padding:0 24px 96px}
h1,h2,h3{font-family:"Barlow Semi Condensed",Barlow,sans-serif;margin:0;text-wrap:balance;letter-spacing:-.01em}
code{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.86em;background:var(--sunk);padding:.1em .38em;border-radius:3px;color:var(--ink-2)}
.mono{font-family:"IBM Plex Mono",ui-monospace,monospace}
.eyebrow{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}

/* masthead ------------------------------------------------------------- */
header.top{padding:56px 0 0}
.ticks{display:flex;gap:5px;align-items:flex-end;height:14px;margin-bottom:26px}
.ticks i{width:2px;background:var(--rule);height:6px;display:block}
.ticks i:nth-child(5n+1){height:14px;background:var(--ink-3)}
.ticks i:first-child{background:var(--accent-mark)}
header.top h1{font-size:clamp(38px,6vw,60px);font-weight:700;line-height:1.02;letter-spacing:-.02em}
header.top .sub{margin:16px 0 0;max-width:60ch;color:var(--ink-2);font-size:17px}
.meta{display:flex;flex-wrap:wrap;gap:0 32px;margin-top:28px;padding-top:18px;border-top:1px solid var(--rule)}
.meta div{display:flex;flex-direction:column;gap:3px;padding:6px 0}
.meta dt{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.meta dd{margin:0;font-family:"Barlow Semi Condensed",sans-serif;font-weight:600;font-size:17px;font-variant-numeric:tabular-nums}
.meta dd.live{color:var(--accent)}

section{margin-top:72px}
.sec-head{display:flex;align-items:baseline;gap:14px;padding-bottom:14px;border-bottom:1px solid var(--rule);margin-bottom:30px}
.sec-head h2{font-size:26px;font-weight:600}
.sec-head p{margin:0;color:var(--ink-3);font-size:14.5px}

/* controls -------------------------------------------------------------- */
.controls{display:flex;flex-wrap:wrap;gap:12px 28px;align-items:center;margin-bottom:30px;
  background:var(--plate);border:1px solid var(--rule-soft);border-radius:10px;padding:14px 18px;box-shadow:var(--shadow)}
.ctl{display:flex;align-items:center;gap:11px}
.ctl > span{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3)}
.seg{display:flex;border:1px solid var(--rule);border-radius:7px;overflow:hidden}
.seg button{appearance:none;border:0;background:transparent;color:var(--ink-2);cursor:pointer;
  font:600 13px/1 "Barlow Semi Condensed",sans-serif;letter-spacing:.05em;text-transform:uppercase;padding:9px 15px}
.seg button + button{border-left:1px solid var(--rule)}
.seg button[aria-pressed="true"]{background:var(--ink);color:var(--ground)}
.seg button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.swatch{width:11px;height:11px;border-radius:50%;display:inline-block;margin-right:7px;vertical-align:-1px}

/* direction cards ------------------------------------------------------- */
.dirs{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:22px;max-width:820px}
.dir{background:var(--plate);border:1px solid var(--rule-soft);border-radius:12px;padding:22px;box-shadow:var(--shadow);
  display:flex;flex-direction:column;gap:18px}
.dir-head{display:flex;align-items:center;gap:13px}
.key{font-family:"Barlow Semi Condensed",sans-serif;font-weight:700;font-size:15px;color:var(--ground);
  background:var(--ink);width:26px;height:26px;border-radius:5px;display:grid;place-items:center;flex:none}
.dir-id h3{font-size:23px;font-weight:700;letter-spacing:.04em}
.dir-id .kind{margin:1px 0 0;font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3)}
.stage{background:var(--sunk);border-radius:10px;padding:16px;display:grid;place-items:center}
.face{width:100%;max-width:300px;aspect-ratio:1;display:block;border-radius:50%}
.face[hidden]{display:none}
.lede{margin:0;font-size:15px;color:var(--ink-2)}
.reads{margin:0;display:flex;flex-direction:column;gap:0;border-top:1px solid var(--rule-soft)}
.reads > div{display:grid;grid-template-columns:84px 1fr;gap:14px;padding:9px 0;border-bottom:1px solid var(--rule-soft)}
.reads dt{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.11em;text-transform:uppercase;color:var(--ink-3);padding-top:3px}
.reads dd{margin:0;font-size:14px;color:var(--ink-2)}
.note{margin:0;font-size:14px;padding:12px 14px;border-radius:8px;border-left:2px solid;background:var(--sunk)}
.note-good{border-color:var(--ok);color:var(--ink-2)}
.note-warn{border-color:var(--warn);color:var(--ink-2)}
.note-neutral{border-color:var(--rule);color:var(--ink-2)}
.ships{margin-left:auto;font-family:"IBM Plex Mono",monospace;font-size:9.5px;letter-spacing:.12em;
  text-transform:uppercase;padding:4px 8px;border-radius:4px;background:var(--accent-mark);color:var(--ground);
  font-weight:500;white-space:nowrap}
.before{display:grid;grid-template-columns:72px 1fr;gap:14px;align-items:start;
  padding-top:16px;border-top:1px solid var(--rule-soft)}
.before img{width:72px;height:72px;border-radius:50%;display:block;opacity:.6}
.before p{margin:3px 0 0;font-size:13.5px;color:var(--ink-3)}

/* findings -------------------------------------------------------------- */
.finds{display:flex;flex-direction:column;gap:0}
.find{display:grid;grid-template-columns:132px 1fr;gap:22px;padding:18px 0;border-bottom:1px solid var(--rule-soft);align-items:start}
.find:first-child{border-top:1px solid var(--rule-soft)}
.pill{font-family:"IBM Plex Mono",monospace;font-size:10px;letter-spacing:.11em;text-transform:uppercase;
  padding:5px 9px;border-radius:4px;justify-self:start;white-space:nowrap}
.pill.ok{background:var(--ok-bg);color:var(--ok)}
.pill.warn{background:var(--warn-bg);color:var(--warn)}
.pill.no{background:var(--no-bg);color:var(--no)}
.pill.c-best{background:var(--ok-bg);color:var(--ok)}
.pill.c-good{background:var(--ok-bg);color:var(--ok)}
.pill.c-no{background:var(--no-bg);color:var(--no)}
.pill.c-extra{background:var(--sunk);color:var(--ink-3)}
.pill.c-warn{background:var(--warn-bg);color:var(--warn)}
.lock{display:flex;flex-direction:column}
.lock-row{display:grid;grid-template-columns:150px 1fr;gap:20px;padding:13px 0;border-bottom:1px solid var(--rule-soft)}
.lock-row:first-child{border-top:1px solid var(--rule-soft)}
.lock-row dt{font-family:"IBM Plex Mono",monospace;font-size:10.5px;letter-spacing:.13em;text-transform:uppercase;color:var(--ink-3);padding-top:4px}
.lock-row dd{margin:0;display:flex;flex-direction:column;gap:2px}
.lock-row dd strong{font-family:"Barlow Semi Condensed",sans-serif;font-size:17.5px;font-weight:600;color:var(--ink)}
.lock-row dd span{font-size:13.5px;color:var(--ink-3)}
.find h4{margin:0 0 4px;font-family:"Barlow Semi Condensed",sans-serif;font-size:19px;font-weight:600}
.find p{margin:0;font-size:15px;color:var(--ink-2);max-width:70ch}

/* questions ------------------------------------------------------------- */
.qs{display:flex;flex-direction:column;gap:0}
.q{display:grid;grid-template-columns:56px 1fr;gap:20px;padding:24px 0;border-bottom:1px solid var(--rule-soft)}
.q:first-child{border-top:1px solid var(--rule-soft)}
.qn{font-family:"Barlow Semi Condensed",sans-serif;font-weight:700;font-size:26px;color:var(--ink-3);
  font-variant-numeric:tabular-nums;line-height:1.1;padding-top:2px}
.q h3{font-size:20px;font-weight:600;margin-bottom:8px}
.q-flag{display:inline-block;margin-left:9px;vertical-align:2px;font-family:"IBM Plex Mono",monospace;
  font-size:9.5px;letter-spacing:.11em;text-transform:uppercase;padding:3px 7px;border-radius:3px;
  background:var(--warn-bg);color:var(--warn)}
.q-flag.q-done{background:var(--ok-bg);color:var(--ok)}
.q p{margin:0 0 10px;font-size:15px;color:var(--ink-2);max-width:72ch}
.q-caveat{font-size:14px !important;color:var(--ink-3) !important}
.rec{margin-top:12px;padding:13px 16px;background:var(--sunk);border-left:2px solid var(--accent-mark);border-radius:0 8px 8px 0}
.rec .eyebrow{display:block;margin-bottom:5px}
.rec p{margin:0;color:var(--ink);font-size:15px}

/* footer ---------------------------------------------------------------- */
.next{margin-top:64px;background:var(--plate);border:1px solid var(--rule-soft);border-radius:12px;padding:28px 30px;box-shadow:var(--shadow)}
.next h2{font-size:22px;font-weight:600;margin-bottom:10px}
.next p{margin:0 0 12px;color:var(--ink-2);max-width:72ch;font-size:15.5px}
.next p:last-child{margin-bottom:0}
.reply{font-family:"IBM Plex Mono",monospace;font-size:14px;color:var(--accent);background:var(--sunk);
  padding:2px 8px;border-radius:4px;white-space:nowrap}

@media (max-width:640px){
  .find,.q{grid-template-columns:1fr;gap:10px}
  .meta{gap:0 22px}
}
@media (prefers-reduced-motion:reduce){*{animation:none !important;transition:none !important}}
</style>

<div class="wrap">
<header class="top">
  <div class="ticks">${Array.from({ length: 41 }, () => '<i></i>').join('')}</div>
  <p class="eyebrow">Phase 0 · Design Lock v1</p>
  <h1>Locked.</h1>
  <p class="sub">Two tactical faces for the Galaxy&nbsp;Watch Ultra&nbsp;2, drawn at true watch size. <strong>MERIDIAN ships first, SECTOR second.</strong> The heading readout now has a slot on both faces, and night mode is on the toggle. <strong>One caveat on night mode:</strong> Samsung's own is first-party only, so Auto switches on daylight rather than on the light sensor. Detail below.</p>
  <dl class="meta">
    <div><dt>Target</dt><dd>Galaxy Watch Ultra 2</dd></div>
    <div><dt>Format</dt><dd>Watch Face Format v4</dd></div>
    <div><dt>Rendered at</dt><dd>498 × 498</dd></div>
    <div><dt>Faces</dt><dd>2</dd></div>
    <div><dt>Accents</dt><dd>8 + Mono + night</dd></div>
    <div><dt>Gate</dt><dd class="live">Met — Phase 1 next</dd></div>
  </dl>
</header>

<section>
  <div class="sec-head">
    <h2>The two faces</h2>
    <p>Same time, same data, same moment. Both ship free, both support always-on and night mode.</p>
  </div>

  <div class="controls">
    <div class="ctl"><span>Mode</span>
      <div class="seg" id="seg-mode">
        <button data-v="interactive" aria-pressed="true">Interactive</button>
        <button data-v="ambient" aria-pressed="false">Always-on</button>
      </div>
    </div>
    <div class="ctl"><span>Accent</span>
      <div class="seg" id="seg-accent">
        <button data-v="amber" aria-pressed="true"><span class="swatch" style="background:#FFB000"></span>Phosphor Amber</button>
        <button data-v="ice" aria-pressed="false"><span class="swatch" style="background:#9AD8FF"></span>Ice</button>
        <button data-v="night" aria-pressed="false"><span class="swatch" style="background:#B3261E"></span>Night mode</button>
      </div>
    </div>
  </div>

  <div class="dirs">${OPTS.map(faceCard).join('')}</div>
</section>

<section>
  <div class="sec-head">
    <h2>What verification changed</h2>
    <p>Checked against Google's XSD schemas and validator source, not from memory.</p>
  </div>
  <div class="finds">
    ${FINDINGS.map(([k, h, b]) => `<div class="find"><span class="pill ${chip[k][1]}">${chip[k][0]}</span><div><h4>${h}</h4><p>${b}</p></div></div>`).join('')}
  </div>
</section>

<section>
  <div class="sec-head">
    <h2>Night mode</h2>
    <p>You asked for Samsung's. I can get you close, but not identical — here is the gap.</p>
  </div>
  <div class="finds">
    ${NIGHT.map(([k, h, b]) => `<div class="find"><span class="pill c-${k}">${{best:'What you get',warn:'The difference',no:'Not reachable'}[k]}</span><div><h4>${h}</h4><p>${b}</p></div></div>`).join('')}
  </div>
</section>

<section>
  <div class="sec-head">
    <h2>Design Lock v1</h2>
    <p>Every answer, written down. Changes from here become v2.</p>
  </div>
  <div class="lock">
    ${LOCK.map(([k, v, n]) => `<div class="lock-row"><dt>${k}</dt><dd><strong>${v}</strong><span>${n}</span></dd></div>`).join('')}
  </div>
</section>

<div class="next">
  <h2>What happens next</h2>
  <p>Nothing is waiting on you. Design Lock v1 is written and Phase 0 is closed.</p>
  <p>Then Design Lock v1 gets written down and Phase 1 starts on <strong>MERIDIAN</strong>: tooling on your Mac, the emulator, building Google's official sample end to end to prove the pipeline, then the project skeleton and a minimal version of the locked design running on your actual watch. SECTOR follows once MERIDIAN is published — it reuses the same repo, the same keystore, the same fonts and colour system, so the second face is far less work than the first.</p>
  <p>You will have two jobs in Phase 1, and I will write both out step by step for someone who has never done them: approving a couple of installs on the Mac, and turning on wireless debugging on the watch.</p>
</div>
</div>

<script>
(function(){
  var state = { mode:'interactive', accent:'amber' };
  function apply(){
    document.querySelectorAll('.face').forEach(function(img){
      img.hidden = !(img.dataset.mode === state.mode && img.dataset.accent === state.accent);
    });
  }
  ['mode','accent'].forEach(function(key){
    var seg = document.getElementById('seg-' + key);
    seg.addEventListener('click', function(e){
      var btn = e.target.closest('button');
      if(!btn) return;
      state[key] = btn.dataset.v;
      seg.querySelectorAll('button').forEach(function(b){
        b.setAttribute('aria-pressed', String(b === btn));
      });
      apply();
    });
  });
  apply();
})();
</script>`;

fs.writeFileSync('/home/user/MDWeatherAlerts-App/tactical-watchface/phase0-review.html', html);
console.log('bytes', Buffer.byteLength(html));
