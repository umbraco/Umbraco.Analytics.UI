# Build log

- **T1** `efbc6de` Hour maths in `internal/date/hour-math.ts`; `bucket*` take "hour"; test browser pinned to Europe/Copenhagen. Review PASS. 90 date tests green; full suite 2442 passed, 0 failed.
- **T2** `8e5584d` `uauiTimeBuckets` with `end` and hour buckets; HRS-1 specs on. Review FAIL (missing tests), fixed in one round, then PASS. 143 date tests green; API report changed (needs sign-off).
- **T3** `207d0af` `today` and `yesterday` built-in presets, off by default; HRS-8 specs on. Review PASS. Full suite 2466 passed, 0 failed; no API report change.
- **T4** `0355f9b` One-day range reads as one date (helper, button, compare line, accessible name); HRS-9 specs on. Review PASS. 134 date tests green; no API report change.
- **T5** `3907371` Chart `today` renamed `now` (plugin, stories, tests, examples); HRS-4 AC9 on. Review FAIL (Engage date picker renamed by mistake), fixed in one round, then PASS. 862 chart/example/date-range tests green; API report: `today` out, `now` in.
- **T6** `dfadc8d` Hour keys in chart data, hour tooltip/table format, By hour story; HRS-2 and HRS-6 AC4–AC5 on. Review FAIL (weakened AC6 assertion, wrong marker doc), fixed in one round, then PASS. Full suite 2483 passed, 0 failed; check:size 128.0 of 130 KB; API report: `UauiGroupBy` gains "hour".
- **T7** `140d904` Hour-level compare by wall-clock offset; HRS-3 specs on, plus data tests for the repeated hour, bar totals and no range. Review PASS. 647 chart/date tests green; no API change; check:size 128.0 of 130 KB.
- **T8** `4921f8b` `now`/`incomplete-from` as moments, Now line and wording at hour level, hour-level markers, Today by hour so far story; HRS-4 and HRS-5 on. Review FAIL (no tests for hour-level markers), fixed in one round, then PASS. 949 chart/lang/date/example tests green; no API change; check:size 128.3 of 130 KB.
- **T9** `6daf797` Hour x-axis ticks by width, bold date per day, zone name on the repeated hour; HRS-6 on; 400px screenshots (one day, two days). Review FAIL (labels overlap on narrow charts, missing clock-change specs), fixed in one round, then PASS. 584 chart tests green; full container run 2543 passed; check:size 128.8 of 130 KB.
