'use strict';
const { chromium } = require('playwright-core');
const fs = require('fs'); const path = require('path');
const FONTS = path.resolve(__dirname, '../fonts');
const b64 = p => fs.readFileSync(path.join(FONTS, p)).toString('base64');
const face = (fam, file, w) => `@font-face{font-family:${fam};font-weight:${w};src:url(data:font/ttf;base64,${b64(file)}) format('truetype');}`;
const CSS = [
  face('BarlowSC', 'BarlowSemiCondensed-Regular.ttf', 400),
  face('BarlowSC', 'BarlowSemiCondensed-Medium.ttf', 500),
  face('BarlowSC', 'BarlowSemiCondensed-SemiBold.ttf', 600),
  face('IBMPlexMono', 'IBMPlexMono-Regular.ttf', 400),
  face('IBMPlexMono', 'IBMPlexMono-Medium.ttf', 500),
].join('\n');

const CASES = [
  ['14:38', 'BarlowSC', 110, 600, 0], ['14:38', 'BarlowSC', 96, 600, 0],
  ['14:38', 'BarlowSC', 86, 600, 0], ['23:59', 'BarlowSC', 110, 600, 0],
  ['18:38', 'BarlowSC', 32, 500, 0], ['18:38', 'BarlowSC', 28, 500, 0],
  ['8,420', 'BarlowSC', 36, 600, 0], ['100,000', 'BarlowSC', 36, 600, 0],
  ['100,000', 'BarlowSC', 30, 600, 0], ['12,345', 'BarlowSC', 36, 600, 0],
  ['86%', 'BarlowSC', 36, 600, 0], ['100%', 'BarlowSC', 36, 600, 0],
  ['72', 'BarlowSC', 36, 600, 0], ['199', 'BarlowSC', 36, 600, 0],
  ['74°', 'BarlowSC', 38, 600, 0], ['-12°', 'BarlowSC', 38, 600, 0],
  ['SUN 30 AUG', 'IBMPlexMono', 19, 400, 1.6], ['SUN 30 AUG', 'IBMPlexMono', 17, 400, 1.6],
  ['DOY 242', 'IBMPlexMono', 19, 400, 1.6], ['DOY 242', 'IBMPlexMono', 17, 400, 1.6],
  ['WEATHER', 'IBMPlexMono', 12, 400, 1.8], ['HEART RATE', 'IBMPlexMono', 12, 400, 1.8],
  ['STEPS', 'IBMPlexMono', 14, 400, 1.6], ['BATT', 'IBMPlexMono', 14, 400, 1.6],
  ['Z', 'IBMPlexMono', 17, 400, 1.6],
];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  await p.setContent(`<style>${CSS}</style><svg width="900" height="200"><text id="t"></text></svg>`);
  await p.evaluate(() => document.fonts.ready);
  const out = await p.evaluate(cases => cases.map(([s, fam, size, w, tr]) => {
    const t = document.getElementById('t');
    t.setAttribute('font-family', fam); t.setAttribute('font-size', size);
    t.setAttribute('font-weight', w); t.setAttribute('letter-spacing', tr);
    t.setAttribute('style', "font-variant-numeric:tabular-nums;font-feature-settings:'tnum' 1");
    t.textContent = s;
    const bb = t.getBBox();
    return { s, fam, size, w, tr, adv: Math.round(t.getComputedTextLength() * 100) / 100, ink: Math.round(bb.width * 100) / 100 };
  }), CASES);
  console.log(out.map(o => `${String(o.adv).padStart(7)}  ink ${String(o.ink).padStart(7)}  ${o.fam}/${o.size}/${o.w}/tr${o.tr}  "${o.s}"`).join('\n'));
  await b.close();
})();
