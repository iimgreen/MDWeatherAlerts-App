/*
 * MD Weather Alerts - icon clipping audit (Phase 3 regression guard)
 *
 * Walks every screen of the app in a headless browser and reports any icon
 * whose glyph is cut off: by its own box, by an ancestor that clips overflow,
 * or by a rounded corner mask. It runs the pass at several viewport widths and
 * across the app's appearance settings (dark mode, large text, compact cards,
 * classic and high contrast styles).
 *
 * Usage:
 *   npx playwright install chromium      # once
 *   python3 -m http.server 8901          # from the repo root, in another shell
 *   node tools/icon-audit.js             # exits non-zero if anything is clipped
 *
 * Optional: BASE_URL=http://localhost:8901 node tools/icon-audit.js
 * Optional: CHROMIUM_PATH=/path/to/chrome node tools/icon-audit.js
 */

const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL || "http://localhost:8901";
const SCREENS = ["home", "forecast", "reports", "radar", "alerts", "more"];
const WIDTHS = [360, 393, 430];

const VARIANTS = [
  { name: "default", settings: {} },
  { name: "dark", settings: { mdwa_dark_mode: "dark" } },
  { name: "large text", settings: { mdwa_text_size: "large" } },
  { name: "compact cards", settings: { mdwa_compact_cards: "on" } },
  { name: "classic", settings: { mdwa_ui_style: "classic" } },
  { name: "high contrast", settings: { mdwa_ui_style: "high-contrast" } },
];

function auditIcons() {
  const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2190}-\u{2BFF}\u{2600}-\u{27BF}\u{FE0F}\u{23E9}-\u{23FA}]/u;
  const results = [];

  for (const el of Array.from(document.querySelectorAll("body *"))) {
    const styles = getComputedStyle(el);
    if (styles.display === "none" || styles.visibility === "hidden" || styles.opacity === "0") continue;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    const cls = typeof el.className === "string" ? el.className : "";
    const ownText = Array.from(el.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.nodeValue)
      .join("");

    const looksLikeIcon = EMOJI.test(ownText) || /icon|pin|dot|mark/i.test(cls);
    if (!looksLikeIcon) continue;

    const issues = [];

    if (el.scrollWidth - el.clientWidth > 1 && styles.overflowX !== "visible") {
      issues.push(`content is ${el.scrollWidth - el.clientWidth}px wider than its box`);
    }
    if (el.scrollHeight - el.clientHeight > 1 && styles.overflowY !== "visible") {
      issues.push(`content is ${el.scrollHeight - el.clientHeight}px taller than its box`);
    }

    // Measure the glyph itself rather than the element, so a line box that is
    // too short for an emoji shows up even when nothing else is wrong.
    let glyph = null;
    const textNode = Array.from(el.childNodes).find(
      (node) => node.nodeType === 3 && node.nodeValue.trim() && EMOJI.test(node.nodeValue)
    );
    if (textNode) {
      const range = document.createRange();
      range.selectNodeContents(textNode);
      glyph = range.getBoundingClientRect();

      const top = rect.top + parseFloat(styles.borderTopWidth);
      const bottom = rect.bottom - parseFloat(styles.borderBottomWidth);
      const left = rect.left + parseFloat(styles.borderLeftWidth);
      const right = rect.right - parseFloat(styles.borderRightWidth);
      const over = [];
      if (glyph.top < top - 0.5) over.push(`top ${(top - glyph.top).toFixed(1)}px`);
      if (glyph.bottom > bottom + 0.5) over.push(`bottom ${(glyph.bottom - bottom).toFixed(1)}px`);
      if (glyph.left < left - 0.5) over.push(`left ${(left - glyph.left).toFixed(1)}px`);
      if (glyph.right > right + 0.5) over.push(`right ${(glyph.right - right).toFixed(1)}px`);
      if (over.length) issues.push(`glyph paints outside its own box (${over.join(", ")})`);
    }

    const probe = glyph || rect;
    let parent = el.parentElement;
    while (parent && parent !== document.body) {
      const parentStyles = getComputedStyle(parent);
      const clips =
        parentStyles.overflow !== "visible" ||
        parentStyles.overflowX !== "visible" ||
        parentStyles.overflowY !== "visible";

      if (clips) {
        const parentRect = parent.getBoundingClientRect();
        const parentName = `${parent.tagName.toLowerCase()}.${
          typeof parent.className === "string" ? parent.className.split(" ")[0] : ""
        }`;
        const cut = [];
        if (probe.top < parentRect.top - 0.5) cut.push(`top ${(parentRect.top - probe.top).toFixed(1)}px`);
        if (probe.bottom > parentRect.bottom + 0.5) cut.push(`bottom ${(probe.bottom - parentRect.bottom).toFixed(1)}px`);
        if (probe.left < parentRect.left - 0.5) cut.push(`left ${(parentRect.left - probe.left).toFixed(1)}px`);
        if (probe.right > parentRect.right + 0.5) cut.push(`right ${(probe.right - parentRect.right).toFixed(1)}px`);
        if (cut.length) issues.push(`clipped by ${parentName} (${cut.join(", ")})`);

        const radius = parseFloat(parentStyles.borderTopLeftRadius) || 0;
        if (radius > 6) {
          const insetX = Math.min(probe.left - parentRect.left, parentRect.right - probe.right);
          const insetY = Math.min(probe.top - parentRect.top, parentRect.bottom - probe.bottom);
          if (insetX >= 0 && insetY >= 0 && insetX < radius && insetY < radius) {
            if (Math.hypot(radius - insetX, radius - insetY) > radius + 0.5) {
              issues.push(`corner of ${parentName} masks the glyph (radius ${radius}px)`);
            }
          }
        }
      }
      parent = parent.parentElement;
    }

    if (issues.length) {
      results.push({
        selector: `${el.tagName.toLowerCase()}${cls ? "." + cls.trim().split(/\s+/).join(".") : ""}${el.id ? "#" + el.id : ""}`,
        text: (ownText.trim() || el.textContent.trim()).slice(0, 24),
        size: `${Math.round(rect.width)}x${Math.round(rect.height)}`,
        fontSize: styles.fontSize,
        lineHeight: styles.lineHeight,
        issues,
      });
    }
  }

  return results;
}

(async () => {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );
  let failures = 0;

  for (const variant of VARIANTS) {
    for (const width of WIDTHS) {
      const context = await browser.newContext({
        viewport: { width, height: 850 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}/index.html`);

      if (Object.keys(variant.settings).length) {
        await page.evaluate((settings) => {
          for (const [key, value] of Object.entries(settings)) localStorage.setItem(key, value);
        }, variant.settings);
        await page.reload();
      }
      await page.waitForTimeout(2000);

      for (const screen of SCREENS) {
        await page.evaluate((id) => {
          const button = document.querySelector(`[data-screen="${id}"]`);
          if (button) button.click();
        }, screen);
        await page.waitForTimeout(450);

        if (screen === "reports") {
          await page.evaluate(() => {
            const panel = document.getElementById("cleanReportPanel");
            if (panel) panel.open = true;
          });
          await page.waitForTimeout(250);
        }

        const found = await page.evaluate(auditIcons);
        for (const result of found) {
          failures += 1;
          console.log(`${variant.name} @ ${width}px / ${screen}`);
          console.log(`  ${result.selector} "${result.text}" ${result.size} font-size:${result.fontSize} line-height:${result.lineHeight}`);
          result.issues.forEach((issue) => console.log(`    - ${issue}`));
        }
      }

      await page.evaluate(() => localStorage.clear());
      await context.close();
    }
  }

  await browser.close();

  if (failures) {
    console.log(`\n${failures} clipped icon(s) found.`);
    process.exit(1);
  }
  console.log("No clipped icons found.");
})();
