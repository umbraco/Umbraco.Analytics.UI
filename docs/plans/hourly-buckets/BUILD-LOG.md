# Build log

- **T1** `efbc6de` Hour maths in `internal/date/hour-math.ts`; `bucket*` take "hour"; test browser pinned to Europe/Copenhagen. Review PASS. 90 date tests green; full suite 2442 passed, 0 failed.
- **T2** `8e5584d` `uauiTimeBuckets` with `end` and hour buckets; HRS-1 specs on. Review FAIL (missing tests), fixed in one round, then PASS. 143 date tests green; API report changed (needs sign-off).
- **T3** `207d0af` `today` and `yesterday` built-in presets, off by default; HRS-8 specs on. Review PASS. Full suite 2466 passed, 0 failed; no API report change.
- **T4** `0355f9b` One-day range reads as one date (helper, button, compare line, accessible name); HRS-9 specs on. Review PASS. 134 date tests green; no API report change.
