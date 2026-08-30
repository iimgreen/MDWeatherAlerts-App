'use strict';
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { svg, S } = require('./faces');

const FONTS = path.resolve(__dirname, '../fonts');
const OUT = process.argv[2] || path.resolve(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const b64 = p => fs.readFileSync(path.join(FONTS, p)).toString('base64');
const face = (fam, file, weight) =>
  `@font-face{font-family:${fam};font-weight:${weight};font-style:normal;src:url(data:font/ttf;base64,${b64(file)}) format('truetype');}`;

const CSS = [
  face('BarlowSC', 'BarlowSemiCondensed-Regular.ttf', 400),
  face('BarlowSC', 'BarlowSemiCondensed-Medium.ttf', 500),
  face('BarlowSC', 'BarlowSemiCondensed-SemiBold.ttf', 600),
  face('IBMPlexMono', 'IBMPlexMono-Regular.ttf', 400),
  face('IBMPlexMono', 'IBMPlexMono-Medium.ttf', 500),
].join('\n');

const page = body => `<!doctype html><meta charset="utf-8"><style>
${CSS}
html,body{margin:0;padding:0;background:#000;}
#w{width:${S}px;height:${S}px;}
</style><div id="w">${body}</div>`;

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--force-device-scale-factor=1', '--disable-lcd-text', '--font-render-hinting=none'],
  });
  const ctx = await browser.newContext({ viewport: { width: S, height: S }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage();

  const jobs = [];
  for (const opt of ['A', 'B', 'C'])
    for (const acc of ['amber', 'ice'])
      for (const amb of [false, true])
        jobs.push({ opt, acc, amb });

  for (const j of jobs) {
    await pg.setContent(page(svg(j.opt, j.acc, j.amb)), { waitUntil: 'load' });
    await pg.evaluate(() => document.fonts.ready);
    const name = `option${j.opt}_${j.amb ? 'ambient' : 'interactive'}_${j.acc}.png`;
    await pg.locator('#w').screenshot({ path: path.join(OUT, name) });
    console.log('wrote', name);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
