# Build log

- **T1** `efbc6de` Hour maths in `internal/date/hour-math.ts`; `bucket*` take "hour"; test browser pinned to Europe/Copenhagen. Review PASS. 90 date tests green; full suite 2442 passed, 0 failed.
- **T2** `8e5584d` `uauiTimeBuckets` with `end` and hour buckets; HRS-1 specs on. Review FAIL (missing tests), fixed in one round, then PASS. 143 date tests green; API report changed (needs sign-off).
