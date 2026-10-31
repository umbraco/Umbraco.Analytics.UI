# Analytics UI v1

Read these in order:

1. [x] [BRIEF.md](./BRIEF.md) — One shared set of analytics charts, tables, KPI tiles and filters for Engage, Commerce and Umbraco AI, matching the Engage Phase 1 design.
2. [x] [ARCHITECTURE.md](./ARCHITECTURE.md) — Lit elements on `UmbLitElement`, loaded once via the import map; Chart.js inside for the time-series chart; data in by property, events out.
3. [x] [SPEC.md](./SPEC.md) — The 7 v1 elements, plus a `uui-box` recipe for panes, with their properties, events and states, checked against the Phase 1 screenshots.
4. [x] [STORIES.md](./STORIES.md) — 19 stories, 100 criteria, in 6 areas.
5. [x] [PLAN.md](./PLAN.md) — 24 tasks in 6 areas; 89 pending specs in place (INT-1 is checked on a real site instead).
6. [ ] [BUILD-LOG.md](./BUILD-LOG.md) — <pending>

See [DECISION-LOG.md](./DECISION-LOG.md) for why things changed along the way.

> The design reference that SPEC.md links to (`docs/design/phase-1`) is kept out of this public repo until Engage's Phase 1 design is public. Ask the Commerce team for a copy and drop it in that folder locally; a `docs/design/phase-1/` line in `.git/info/exclude` keeps it out of commits. Other folders under `docs/design/` (such as `funnel`) are committed.
