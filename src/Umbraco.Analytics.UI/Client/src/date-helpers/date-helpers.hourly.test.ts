// HRS-1 — Time buckets for a range. Pending until T2 (docs/plans/hourly-buckets/PLAN.md).
// Runs with the browser's time zone pinned to Europe/Copenhagen (T1). `uauiTimeBuckets` doesn't exist yet, so it's read
// from the module namespace; T2 swaps this for a plain named import from "./index.js" when it turns the specs on.
import { describe, expect, it } from "vitest";
import * as helpers from "./index.js";

type Bucket = { start: string; end: string; days: string[] };
const { uauiTimeBuckets } = helpers as unknown as { uauiTimeBuckets: (range: { from: string; to: string }, unit: string) => Bucket[] };

describe("Feature: time buckets for a range", () => {
    describe("Scenario: one day by hour", () => {
        const range = { from: "2026-11-05", to: "2026-11-05" };

        it.skip("returns 24 buckets", () => {
            expect(uauiTimeBuckets(range, "hour")).toHaveLength(24);
        });

        it.skip("starts the first hour at local midnight, as a UTC instant", () => {
            expect(uauiTimeBuckets(range, "hour")[0]).toMatchObject({ start: "2026-11-04T23:00:00.000Z", end: "2026-11-05T00:00:00.000Z" });
        });

        it.skip("names the local day of every hour", () => {
            expect(new Set(uauiTimeBuckets(range, "hour").map((b) => b.days.join()))).toEqual(new Set(["2026-11-05"]));
        });
    });

    describe("Scenario: day and month buckets gain an end", () => {
        it.skip("ends a day bucket on the next day", () => {
            expect(uauiTimeBuckets({ from: "2026-11-01", to: "2026-11-03" }, "day")[0].end).toBe("2026-11-02");
        });

        it.skip("ends a month bucket on the 1st of the next month", () => {
            expect(uauiTimeBuckets({ from: "2026-01-15", to: "2026-02-10" }, "month")[0].end).toBe("2026-02-01");
        });
    });

    describe("Scenario: sad path, days the clocks change", () => {
        it.skip("returns 23 buckets on the day clocks go forward", () => {
            expect(uauiTimeBuckets({ from: "2026-03-29", to: "2026-03-29" }, "hour")).toHaveLength(23);
        });

        it.skip("returns 25 buckets on the day clocks go back", () => {
            expect(uauiTimeBuckets({ from: "2026-10-25", to: "2026-10-25" }, "hour")).toHaveLength(25);
        });
    });
});
