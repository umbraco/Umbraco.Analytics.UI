import { describe, expect, it } from "vitest";
import type { UaxCompare } from "../date-range/types.js";
import {
    uaxCompareFor,
    uaxDateBuckets,
    uaxDaysIn,
    uaxFormatDateRange,
    uaxPreviousPeriod,
    uaxPreviousYear,
} from "./index.js";

// Stands in for a localization controller: real dates, and the "{0} to {1}" term the package ships.
const localize = {
    date: (date: Date, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", options).format(date),
    term: (key: string, ...args: unknown[]) => (key === "uaxAnalytics_dateRangeRange" ? `${args[0]} to ${args[1]}` : key),
};

describe("Feature: public date helpers", () => {
    describe("Scenario: the previous period", () => {
        it("is the same number of days straight before the range", () => {
            expect(uaxPreviousPeriod({ from: "2026-05-25", to: "2026-06-23" })).toEqual({ from: "2026-04-25", to: "2026-05-24" });
        });
        it("is undefined for a range that isn't valid", () => {
            expect(uaxPreviousPeriod({ from: "2026-06-23", to: "2026-05-25" })).toBe(undefined);
        });
    });

    describe("Scenario: the previous year", () => {
        it("is the same dates one year earlier", () => {
            expect(uaxPreviousYear({ from: "2026-05-25", to: "2026-06-23" })).toEqual({ from: "2025-05-25", to: "2025-06-23" });
        });
    });

    describe("Scenario: the compare range for a mode", () => {
        it("gives a UaxCompare with the previous period's dates", () => {
            expect(uaxCompareFor("previous-period", { from: "2026-05-25", to: "2026-06-23" })).toEqual({
                mode: "previous-period",
                from: "2026-04-25",
                to: "2026-05-24",
            });
        });
        it("gives a UaxCompare with the previous year's dates", () => {
            expect(uaxCompareFor("previous-year", { from: "2026-05-25", to: "2026-06-23" })).toEqual({
                mode: "previous-year",
                from: "2025-05-25",
                to: "2025-06-23",
            });
        });
        it("is undefined for a custom comparison, which has no dates of its own", () => {
            expect(uaxCompareFor("custom", { from: "2026-05-25", to: "2026-06-23" })).toBe(undefined);
        });
    });

    describe("Scenario: the days in a range", () => {
        it("lists every day, both ends included", () => {
            expect(uaxDaysIn({ from: "2026-06-29", to: "2026-07-02" })).toEqual(["2026-06-29", "2026-06-30", "2026-07-01", "2026-07-02"]);
        });
        it("is empty for a range that isn't valid", () => {
            expect(uaxDaysIn({ from: "2026-07-02", to: "2026-06-29" })).toEqual([]);
        });
    });

    describe("Scenario: splitting a range into buckets", () => {
        const range = { from: "2026-06-03", to: "2026-07-05" };

        it("gives one bucket per day, starting on that day", () => {
            expect(uaxDateBuckets({ from: "2026-06-03", to: "2026-06-05" }, "day").map((b) => b.start)).toEqual(["2026-06-03", "2026-06-04", "2026-06-05"]);
        });
        it("starts each week bucket on its Monday, even before the range starts", () => {
            expect(uaxDateBuckets(range, "week").map((b) => b.start)).toEqual(["2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29"]);
        });
        it("starts each month bucket on the 1st", () => {
            expect(uaxDateBuckets(range, "month").map((b) => b.start)).toEqual(["2026-06-01", "2026-07-01"]);
        });
        it("holds only the days of the range in each bucket", () => {
            expect(uaxDateBuckets(range, "week")[0].days).toEqual(["2026-06-03", "2026-06-04", "2026-06-05", "2026-06-06", "2026-06-07"]);
        });
        it("gives no buckets for a range that isn't valid", () => {
            expect(uaxDateBuckets({ from: "2026-07-05", to: "2026-06-03" }, "week")).toEqual([]);
        });
    });

    describe("Scenario: formatting a range as a label", () => {
        it("shows both dates in the localizer's medium style", () => {
            expect(uaxFormatDateRange(localize, { from: "2026-05-25", to: "2026-06-23" })).toBe("May 25, 2026 to Jun 23, 2026");
        });
        it("accepts a UaxCompare", () => {
            const compare: UaxCompare = { mode: "previous-period", from: "2026-04-25", to: "2026-05-24" };
            expect(uaxFormatDateRange(localize, compare)).toBe("Apr 25, 2026 to May 24, 2026");
        });
        it("leaves the year off when asked", () => {
            expect(uaxFormatDateRange(localize, { from: "2026-05-25", to: "2026-06-23" }, { showYear: false })).toBe("May 25 to Jun 23");
        });
    });
});
