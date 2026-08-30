# CLAUDE.md — tactical watch face

**Read `TACTICAL_WATCHFACE_SPEC.md` in full before doing anything. Follow Section 0.**

That document is the single source of truth for this project. It is not a summary to skim — §0.2
sets a mandatory re-read cadence:

1. At the start of every session.
2. At the start of every Phase (§6).
3. Before every deployment to the physical watch.
4. Any time you are unsure what "done" or "good" means for the current task.
5. Every ~10 tool calls or ~30 minutes of work — §5 (Design Brief) and §7 (Quality Bars) at minimum.

Log every re-read as a one-line entry in `PROGRESS.md`. If you drift from the spec, the drift is
the bug, not the spec.

## Before you start

- Run on Claude Opus 5 (§0.1). If you are not, stop and tell Vince to switch with `/model`.
- Check `PROGRESS.md` for the current phase and gate state. Do not start a phase whose predecessor's
  gate is unsatisfied (§6).
- Check `DECISIONS.md` for the current Design Lock and for engineering choices already made — do
  not re-litigate them.
- `PLATFORM_FACTS.md` holds the verified WFF data-source inventory, complication types, and version
  matrix. **Use it instead of writing XML from memory** (§3.3). Anything it marks UNVERIFIED is
  still an open question, not a fact.

## Question policy (§0.3)

Ask Vince about design, data, naming, and priorities. Decide engineering matters yourself, record
them in `DECISIONS.md`, and move on. Batch questions — never one at a time — and give a
recommendation for each. Vince has very little coding knowledge: when he has to do something
technical, write it for someone who has never done it before.

## The standard (§0.5)

It has to look like Samsung or Google shipped it. Every element on screen is real data or real
function — no decorative readouts of any kind. Never claim something works on-device unless it has
actually been deployed and observed there, and never describe a screenshot you have not opened and
looked at.
