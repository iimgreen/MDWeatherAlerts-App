'use strict';
const fs = require('fs'), path = require('path');
const M = '/home/user/MDWeatherAlerts-App/tactical-watchface/mockups';
const d = f => 'data:image/png;base64,' + fs.readFileSync(path.join(M, f)).toString('base64');

const OPTS = [
  {
    k: 'B2', name: 'MERIDIAN', kind: 'Analog field watch', revised: true, ships: 'Ships first',
    before: 'optionB_interactive_amber.png',
    beforeNote: 'The hands crossing the slot labels looked broken because the labels were bare text floating on the dial, with nothing for a hand to pass over. Recessing the slots into sub-dials and framing the date in an aperture seats both in the dial, so a hand crossing them now reads the way it does on a real watch.',
    lede: 'Full 60-tick minute track, hour numerals, hands with a lumed accent tip, two recessed sub-dials at 3 and 9, a framed date aperture at 6, and Zulu above the pivot.',
    reads: [
      ['Sub-dials', 'Both are complication slots, recessed and ringed like a real dial'],
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
    lede: 'Date and day-of-year across the top, Zulu beneath them, the time centred on the vertical axis, and a seated three-compartment band below carrying the values with their own gauges.',
    reads: [
      ['Time', 'Optical centre on the screen centre — its cap is centred on 249 of 498'],
      ['Band', 'Overhangs the case; clipped concentric with the tick track, 6px inside it'],
      ['Gauges', 'Under the number each one measures, inside its own compartment'],
      ['Ambient', 'Twelve majors, the band ground drops away, accent kept on the 12 index'],
    ],
    note: 'The trade for centring the time: three values instead of three plus a separate weather line. The centre compartment is the complication slot; heart rate can take any of the three.',
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

const QS = [
  { n: 0, t: 'Where should this project live?', flag: 'Not in the spec', body: `<p>This branch is on the <strong>MD Weather Alerts</strong> repo, which already holds a different product. A watch-face <code>CLAUDE.md</code> at that root would misdirect every future session there, so for now everything sits in a <code>tactical-watchface/</code> folder.</p>`, rec: `<strong>A new dedicated repo</strong> — the folder moves across wholesale and nothing else changes. You would create the empty repo; I do the rest. Keeping it where it is also works, it is just untidy.` },
  { n: 1, t: 'Which design direction?', answered: true, body: `<p><strong>Both MERIDIAN and SECTOR ship, MERIDIAN first. GRID is dropped</strong> and is not carried forward anywhere.</p>`, rec: `Settled. GRID's renders are removed and it is out of the generator; the reasoning behind it stays in <code>DECISIONS.md</code> as history, including the circular-clip technique it discovered — which is what SECTOR's data band and MERIDIAN's sub-dials now both use.` },
  { n: 2, t: 'What are they called?', flag: 'Now two answers', body: `<p>Two faces means two store names, two on-watch names. They will sit next to each other in your Play account, so they should read as a pair without being cute about it.</p>`, rec: `<strong>MERIDIAN and SECTOR</strong> — the working names already do the job: both single words, both instrument vocabulary, neither says "tactical". VECTOR is the spare if one collides. I will check the Play Store for collisions on whichever two you settle on.` },
  { n: 3, t: 'Default accent colour?', body: `<p>Eight ship regardless — Phosphor Amber, Signal Orange, Safety Yellow, NVG Green, Ice, Cobalt, Coral, Bone — plus a Mono theme. This is just what it looks like out of the box.</p>`, rec: `<strong>Phosphor Amber</strong> if you want this to feel like a family with your Garmin TELEMETRY face; otherwise Signal Orange. Both accents are rendered above — use the toggle.` },
  { n: 4, t: '24-hour default? Seconds shown by default?', rec: `<strong>24-hour, seconds as the sweeping arc.</strong> Both stay configurable — 12/24h, leading zero, and Arc / Digits / Off.` },
  { n: 5, t: 'Secondary time zone — UTC fixed, or selectable offset?', flag: 'Changed by verification', body: `<p>WFF has no second-time-zone data source, so this is expression arithmetic on the epoch timestamp rather than a built-in field. Buildable either way.</p>`, rec: `<strong>Ship UTC/Zulu first, add a selectable offset in Phase 4.</strong> One caveat: I could not confirm whether the timestamp is in milliseconds or seconds, so I verify that on your watch first. Fallback if it turns out unworkable is a World Clock complication — real, but less elegant.` },
  { n: 6, t: 'Which three data fields, and in what order?', flag: 'Changed by verification', body: `<p>The picker list has to shrink to what exists: steps, step goal, heart rate, battery, weather, moon phase, notification count. No calories, distance or floors — those can only arrive through a complication slot.</p>`, rec: `<strong>STEPS · HR · BATT.</strong> Note the order is not the spec's. Listing HR first puts the steps <em>value</em> in the centre while the step <em>gauge</em> sits on the left edge; reordering pairs each gauge with the number directly inboard of it, so an unlabelled arc is unambiguous.` },
  { n: 7, t: 'Left and right gauge defaults?', rec: `<strong>Left = step goal in the accent, right = battery in neutral white,</strong> turning red when low. Both drive natively; no complication needed.` },
  { n: 8, t: 'How many complication slots, and where?', body: `<p>The two faces answer this differently because their layouts do.</p>`, rec: `<strong>MERIDIAN: two, the sub-dials at 3 and 9.</strong> <strong>SECTOR: one, the centre compartment of the data band.</strong> Both are what the layout already supports without crowding. If either feels thin on your wrist we add slots in Phase 4 rather than guessing now.` },
  { n: 9, t: 'Which nice-to-haves do you want?', body: `<p>Night Ops (everything dimmed ~35%, accent shifts to deep red) · Flavors (one-tap presets in the Galaxy Wearable app) · Notification count · Moon phase · Sunrise/sunset · Alarm indicator.</p><p class="q-caveat">Sunrise/sunset is complication-only. I found no alarm data source at all — treat it as unavailable unless it turns up.</p>`, rec: `<strong>Yes to Flavors and Night Ops, yes to notification count; skip moon phase and sunrise/sunset for v1.</strong> They earn their place on a hiking face, less so on this one, and all are easy to add later.` },
  { n: 10, t: 'WFF v4 or v5?', flag: 'Changed by verification', body: `<p>Not really a preference any more — see the validator finding above.</p>`, rec: `<strong>v4.</strong> It also reaches far more devices (Wear OS 6+, so Pixel Watch and Galaxy Watch 4 onward), and none of the v5-only features are needed by any of the three directions. Raising it later is a one-line manifest change plus a re-test.` },
  { n: 11, t: 'Package names?', flag: 'Now two answers', body: `<p>One per face, and <strong>neither can ever be changed after first publish</strong>. Worth a moment.</p>`, rec: `<code>com.mdweatheralerts.watchface.meridian</code> and <code>com.mdweatheralerts.watchface.sector</code> — reusing the domain you already own, which keeps them verifiable and consistent with your existing Play Console app. If you would rather these not sit under the weather brand, give me a domain you own and I will use that for both.` },
  { n: 12, t: 'Broader device QA, or Ultra 2 only for v1?', rec: `<strong>Ultra 2 primary, plus one round Wear OS 6 emulator check before publishing.</strong> The face gets listed for other round devices so it should not look broken on them, but they are not worth a full test matrix for v1.` },
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
    ${['interactive', 'ambient'].map(m => ['amber', 'ice'].map(a => `<img class="face" src="${d(`option${o.k}_${m}_${a}.png`)}" alt="${o.name}, ${m} mode, ${a} accent" data-mode="${m}" data-accent="${a}"${m === 'interactive' && a === 'amber' ? '' : ' hidden'}>`).join('')).join('')}
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
  <p class="eyebrow">Phase 0 · Discovery &amp; design lock</p>
  <h1>Two faces.</h1>
  <p class="sub">Two tactical faces for the Galaxy&nbsp;Watch Ultra&nbsp;2, drawn at true watch size. <strong>MERIDIAN ships first, SECTOR second.</strong> GRID is dropped. Both seat their data in the dial and let the case shape it — sub-dials and an aperture on one, a clipped band on the other — and everything on both is a real data source verified against Google's own schemas.</p>
  <dl class="meta">
    <div><dt>Target</dt><dd>Galaxy Watch Ultra 2</dd></div>
    <div><dt>Format</dt><dd>Watch Face Format v4</dd></div>
    <div><dt>Rendered at</dt><dd>498 × 498</dd></div>
    <div><dt>Faces</dt><dd>2</dd></div>
    <div><dt>Play listings</dt><dd>2</dd></div>
    <div><dt>Gate</dt><dd class="live">Open — needs you</dd></div>
  </dl>
</header>

<section>
  <div class="sec-head">
    <h2>The two faces</h2>
    <p>Same time, same data, same moment. Both ship free, both support always-on.</p>
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
    <h2>Thirteen questions</h2>
    <p>Answer any subset. Anything you skip, I take the recommendation.</p>
  </div>
  <div class="qs">
    ${QS.map(q => `<div class="q">
      <div class="qn">${String(q.n).padStart(2, '0')}</div>
      <div>
        <h3>${q.t}${q.answered ? '<span class="q-flag q-done">Answered</span>' : ''}${q.flag ? `<span class="q-flag">${q.flag}</span>` : ''}</h3>
        ${q.body || ''}
        <div class="rec"><span class="eyebrow">Recommendation</span><p>${q.rec}</p></div>
      </div>
    </div>`).join('')}
  </div>
</section>

<div class="next">
  <h2>What happens next</h2>
  <p>Reply <span class="reply">go with your recommendations</span> and I will take every default above — or answer the ones you care about and I will take the rest.</p>
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
