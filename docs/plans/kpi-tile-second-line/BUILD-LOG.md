# Build log: KPI tile second line

- **T1** 6f1fd5b: `figure()` takes `{ compact: true }`. Reviewer PASS; format, kpi-tile and stat tests green (263), lint clean. No entry point uses it yet.
- **T2** ed234b7: `uaui-figure-detail` with story and tests. Reviewer FAIL (styles on inner span, no story, R0/R17 untested), fixed, re-review PASS. internal + lang tests green (338), lint clean.
- **T3** 6284d44: tile gains `detail`, `detail-value`, `detail-format`; API report adds the three. Reviewer FAIL (empty line host when `{0}` had no number), fixed with shared `hasFigureDetail`, re-review PASS. kpi-tile, internal and stat tests green (545, 13 pending for T4/T5), tsc, lint and check:api clean.
