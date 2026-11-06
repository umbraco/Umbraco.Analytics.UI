# Build log: KPI tile second line

- **T1** 6f1fd5b: `figure()` takes `{ compact: true }`. Reviewer PASS; format, kpi-tile and stat tests green (263), lint clean. No entry point uses it yet.
- **T2** ed234b7: `uaui-figure-detail` with story and tests. Reviewer FAIL (styles on inner span, no story, R0/R17 untested), fixed, re-review PASS. internal + lang tests green (338), lint clean.
- **T3** 6284d44: tile gains `detail`, `detail-value`, `detail-format`; API report adds the three. Reviewer FAIL (empty line host when `{0}` had no number), fixed with shared `hasFigureDetail`, re-review PASS. kpi-tile, internal and stat tests green (545, 13 pending for T4/T5), tsc, lint and check:api clean.
- **T4** 3b2fecc: measured grid layout. Reviewer FAIL (long line pushed the badge away; stories said 200px), fixed with `auto minmax(0, 1fr)` and a gap spec, re-review PASS on code. kpi-tile, internal and stat tests green (556, 3 pending for T5) on two runs; reviewer also ran Chromium, Firefox and WebKit.
