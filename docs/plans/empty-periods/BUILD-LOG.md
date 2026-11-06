# Build log: Empty periods in the time series chart

- **T1** `6007883` Slots from range buckets merged with point dates; EMP-1 specs on. Review PASS first round (checked week, month and clock-change compare alignment; a full hourly year builds in about 37 ms). 2543 tests green; API report unchanged.
- **T2** `968ad1e` EMP-5 specs on, no source change (markers, now, unfinished and compare find empty slots via T1). Review PASS; AC1–AC4 confirmed failing on pre-T1 code.
- **T3** `5f07843` spanGaps false on series and compare lines; lone values draw a dot (also on compare lines and inside the incomplete range); dot styling pinned per chart. Review PASS, then one fix round (explicit dot settings, 3 extra specs, end-only clip), re-review PASS. 2558 tests and all screenshots green, no baseline changes; API unchanged.
