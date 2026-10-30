# Brief

## Problem

Engage, Commerce and Umbraco AI each have an analytics section in the backoffice, and each builds its own charts, tables, KPI tiles and date filters. All three use Lit, UUI and Chart.js 4, but they look different, and every redesign has to be done three times. Engage has a new design, "Analytics Redesign, Phase 1" (in [`docs/design/phase-1`](../../design/phase-1/README.md)). Commerce has been asked to match it.

**Who uses it:**

- **Product developers** on Engage, Commerce and AI. They build their analytics screens from these elements and pass in their own data.
- **Editors and shop managers.** They read the screens. They need the same controls to behave the same in every product.

**What exists today (sources to lift from):**

| Product | Where | What it has |
|---|---|---|
| Engage (`v18/dev`) | `src/Umbraco.Engage.StaticAssets/src/analytics/components`, `src/core` | Chart with comparison and annotations, table with deltas, share bars and paging, date range modal, donut, heatmap |
| Commerce (`main`) | `Core/src/Umbraco.Commerce.Cms.Web.StaticAssets/Client/src/analytics` | Line chart, masonry layout, timeframe modal, 14 widgets |
| Umbraco AI (`v18/dev`) | `Umbraco.AI/src/Umbraco.AI.Web.StaticAssets/Client/src/analytics` | Summary (KPI) cards, stacked time-series chart, breakdown table, dashboard header |

**Success looks like:**

- Engage's Pageviews and Visitors views, and Commerce's analytics section, render with these elements and match the Phase 1 screenshots.
- Umbraco AI's usage dashboard can switch to them without losing anything it shows today.
- A site with all three products installed loads one copy of the package.

**Constraints:**

- Targets Umbraco CMS 19. The package major follows the CMS major (`19.x`).
- Only one version runs on a site, so the public API (element names, properties, events, types) can't break within a major.
- Elements draw only. Products fetch their own data.
- `--uui-*` tokens only, so light, dark and high-contrast themes all work.

**Riskiest unknowns:**

- TODO: Owner, final package name and element prefix (`uan-` is a working name).
- > ASSUMPTION: Engage moves to the package first, then Commerce, then AI, as in the proposal.

## Non-goals

- **Data fetching, caching or API clients.** Each product owns its data.
- **Engage's annotation editing** (the notes dropdown, list and edit modal). The chart only shows markers the product passes in.
- **Engage's page heatmap, side panes and profile modals.** Only Engage needs them.
- **New icons** (orders, cart, coins and others in `ds-contribution/`). They belong in the backoffice icon set.
- **Donut chart.** It's not in Phase 1 and only Engage uses one today.
- **Conversion funnel.** Parked until a product commits to it: Engage's is on a page that only exists in the design, and Commerce would need to redesign its cart conversion widget. See SPEC.md, "Later".
- **Page-level layout** (section header, tabs, sub-navigation). That stays in each product.
