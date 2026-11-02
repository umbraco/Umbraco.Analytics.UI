# Brief

## Problem

Engage, Commerce and Umbraco AI each have an analytics section in the backoffice, and each builds its own charts, tables, KPI tiles and date filters. Umbraco Forms and Umbraco Workflow have their own too (added 02-11-2026). All of them use Lit, UUI and Chart.js 4, but they look different, and every redesign has to be done once per product. Engage has a new design, "Analytics Redesign, Phase 1" (in [`docs/design/phase-1`](../../design/phase-1/README.md)). Commerce has been asked to match it.

**Who uses it:**

- **Product developers** on Engage, Commerce, AI, Forms and Workflow. They build their analytics screens from these elements and pass in their own data.
- **Editors and shop managers.** They read the screens. They need the same controls to behave the same in every product.

**What exists today (sources to lift from):**

| Product | Where | What it has |
|---|---|---|
| Engage (`v18/dev`) | `src/Umbraco.Engage.StaticAssets/src/analytics/components`, `src/core` | Chart with comparison and annotations, table with deltas, share bars and paging, date range modal, donut, heatmap |
| Commerce (`main`) | `Core/src/Umbraco.Commerce.Cms.Web.StaticAssets/Client/src/analytics` | Line chart, masonry layout, timeframe modal, 14 widgets |
| Umbraco AI (`v18/dev`) | `Umbraco.AI/src/Umbraco.AI.Web.StaticAssets/Client/src/analytics` | Summary (KPI) cards, stacked time-series chart, breakdown table, dashboard header |
| Umbraco Forms (`v19/dev`) | `src/Umbraco.Forms.StaticAssets/src/section/analytics`, `section/forms/analytics`, `components/analytics-*` | A fork of Engage's older analytics: submissions chart with compare and group-by, submissions by hour of day (bars), origins (one line per page), overview, workflows and pages tables; bundles Chart.js and chartjs-plugin-annotation |
| Umbraco Workflow (`v19/dev`) | `src/Umbraco.Workflow.StaticAssets/src/core/components/charts`, `content-approvals`, `content-reviews` | Approval activity and content review charts (bars and a running-total line, days ahead of today, log scale), coloured status tiles that open filtered lists, fastest/slowest/average approval, filtered history tables; re-exports its own Chart.js |

**Success looks like:**

- Engage's Pageviews and Visitors views, and Commerce's analytics section, render with these elements and match the Phase 1 screenshots.
- Umbraco AI's usage dashboard can switch to them without losing anything it shows today.
- Umbraco Forms' and Umbraco Workflow's analytics can switch to them without losing anything they show today (user decision 02-11-2026).
- A site with all these products installed loads one copy of the package, and one copy of Chart.js.

**Constraints:**

- Targets Umbraco CMS 19. The package major follows the CMS major (`19.x`).
- Only one version runs on a site, so the public API (element names, properties, events, types) can't break within a major.
- Elements draw only. Products fetch their own data.
- `--uui-*` tokens only, so light, dark and high-contrast themes all work.

**Riskiest unknowns:**

- TODO: Owner, final package name and element prefix (`uaui-` is a working name).
- > ASSUMPTION: Engage moves to the package first, then Commerce, then AI, as in the proposal.

## Non-goals

- **Data fetching, caching or API clients.** Each product owns its data.
- **Engage's annotation editing** (the notes dropdown, list and edit modal). The chart only shows markers the product passes in.
- **Engage's page heatmap, side panes and profile modals.** Only Engage needs them.
- **New icons** (orders, cart, coins and others in `ds-contribution/`). They belong in the backoffice icon set.
- **Donut chart.** It's not in Phase 1 and only Engage uses one today.
- **Page-level layout** (section header, tabs, sub-navigation). That stays in each product.
