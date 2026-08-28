# Tools

Development helpers. Nothing in this folder ships with the app or is cached by
the service worker.

## icon-audit.js

Phase 3 regression guard for the app-wide icon system. It loads every screen in
a headless browser and fails if any icon glyph is cut off - by its own line box,
by an ancestor that clips overflow, or by a rounded corner mask. Each pass runs
at 360 / 393 / 430px wide and across the app's appearance settings (dark mode,
large text, compact cards, classic, high contrast).

```bash
npm install playwright && npx playwright install chromium   # once
python3 -m http.server 8901                                 # repo root, separate shell
node tools/icon-audit.js
```

Exits non-zero and prints the offending selector, its size and what is cutting
it off. Icon sizing rules live in the "Phase 3: app-wide icon system" section at
the end of `css/main.css` - fix icons there rather than screen by screen.
