# Decision log

- **30-10-2026** Skipped `feature-explore`'s interview. The proposal page and the code review of Engage, Commerce and AI already answered it, so `BRIEF.md` was written straight from them.
- **30-10-2026** v1 scope set from the Phase 1 design plus the three products' code. Added `uan-funnel` and selectable KPI tiles. Dropped the donut chart (not in Phase 1, one user) and the notes control (Engage-only).
- **30-10-2026** The Phase 1 export stands in for the devkit's per-screen mockups, because the deliverables are building blocks, not screens. Storybook is where they're reviewed.
- **30-10-2026** Base class `UmbLitElement` instead of `LitElement`, for localization and culture-aware number and date formatting. `uan-delta-badge` moves over.
- **30-10-2026** Charts and tables take numbers plus `Intl.NumberFormatOptions`, not formatter callbacks, so formats show in Storybook and stay consistent across products.
- **30-10-2026** Table supports both client and server paging. Engage needs server mode, and the smaller Commerce and AI tables shouldn't have to write paging code.
- **30-10-2026** KPI tile has one style and no `layout` property: the card with the icon in a pink square. Every Phase 1 screenshot uses it. The "filled-left" rail is only in the design notes and base CSS, never on a page, so it was dropped. An `inline` style for table totals was dropped too: a total is just a label and a number, so the product writes it in the table's `toolbar` slot. Adding a `layout` property later is non-breaking.
- **30-10-2026** No `uan-panel`. Panes are the backoffice's own `uui-box`, which has the headline, header actions, divider and padding control the design needs. A Storybook recipe keeps products consistent. The design's square 3px corners are dropped too: v18+ panels are rounded, so everything takes its radius from `--uui-border-radius-*` tokens.
- **30-10-2026** Conversion funnel parked, out of v1. No product would use it yet: Engage's is on Campaign Reporting (design only), and Commerce's cart conversion is a line chart that would need redesigning. It was also the most custom piece. Notes kept in SPEC.md "Later".
- **30-10-2026** Chart, compare, bars and markers are four sequential tasks (T9–T12), not parallel ones, because they all change `uan-time-series-chart`. The same goes for the table tasks (T15–T20).
- **30-10-2026** Specs for canvas-only chart outcomes (fills, dashes, bars) use Vitest's `toMatchScreenshot`, since a canvas has no DOM to assert on. Everything else asserts on the DOM, the hidden data table, the tooltip or events.
- **30-10-2026** Pending specs render elements by tag name and don't import element modules, so the suite compiles before the elements exist. A builder adds the static import when it turns a spec on.
- **30-10-2026** INT-1 has no Vitest spec. Its acceptance is a real CMS 19 backoffice (T21), since the import map and manifests only exist there.
