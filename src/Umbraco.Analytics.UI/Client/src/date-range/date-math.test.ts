import { describe, expect, it } from "vitest";
import { addDays, builtInPresetRange, isoToDate, parseIso, previousPeriodRange, previousYearRange, todayIso } from "./date-math.js";

describe("Feature: date range maths", () => {
    describe("Scenario: today", () => {
        it("uses the local calendar day, not UTC", () => {
            expect(todayIso(new Date(2026, 5, 23, 23, 59))).toBe("2026-06-23");
        });
    });

    describe("Scenario: adding days", () => {
        it("crosses a month end", () => {
            expect(addDays("2026-06-23", -29)).toBe("2026-05-25");
        });
        it("crosses a year end", () => {
            expect(addDays("2026-01-02", -3)).toBe("2025-12-30");
        });
        it("handles a leap day", () => {
            expect(addDays("2028-03-01", -1)).toBe("2028-02-29");
        });
    });

    describe("Scenario: parsing", () => {
        it("rejects a date that doesn't exist", () => {
            expect(parseIso("2026-02-30")).toBe(undefined);
        });
        it("rejects an empty string", () => {
            expect(parseIso("")).toBe(undefined);
        });
        it("gives local midnight for formatting", () => {
            expect(isoToDate("2026-06-23")?.getDate()).toBe(23);
        });
    });

    describe("Scenario: built-in presets as of 23 Jun 2026", () => {
        it("last 7 days includes today", () => {
            expect(builtInPresetRange("last-7-days", "2026-06-23")).toEqual({ from: "2026-06-17", to: "2026-06-23" });
        });
        it("last 30 days includes today", () => {
            expect(builtInPresetRange("last-30-days", "2026-06-23")).toEqual({ from: "2026-05-25", to: "2026-06-23" });
        });
        it("last month is the previous calendar month", () => {
            expect(builtInPresetRange("last-month", "2026-06-23")).toEqual({ from: "2026-05-01", to: "2026-05-31" });
        });
        it("last month in January is December of the year before", () => {
            expect(builtInPresetRange("last-month", "2026-01-15")).toEqual({ from: "2025-12-01", to: "2025-12-31" });
        });
        it("last month ends on the 29th in a leap February", () => {
            expect(builtInPresetRange("last-month", "2028-03-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
        });
        it("last year is the previous calendar year", () => {
            expect(builtInPresetRange("last-year", "2026-06-23")).toEqual({ from: "2025-01-01", to: "2025-12-31" });
        });
        it("custom has no dates of its own", () => {
            expect(builtInPresetRange("custom", "2026-06-23")).toBe(undefined);
        });
    });

    describe("Scenario: comparison ranges", () => {
        it("takes the same number of days before the range as the previous period", () => {
            expect(previousPeriodRange({ from: "2026-05-25", to: "2026-06-23" })).toEqual({ from: "2026-04-25", to: "2026-05-24" });
        });
        it("takes one day as the day before", () => {
            expect(previousPeriodRange({ from: "2026-03-01", to: "2026-03-01" })).toEqual({ from: "2026-02-28", to: "2026-02-28" });
        });
        it("has no previous period for a range that ends before it starts", () => {
            expect(previousPeriodRange({ from: "2026-06-23", to: "2026-05-25" })).toBeUndefined();
        });
        it("has no previous period for a half-typed date", () => {
            expect(previousPeriodRange({ from: "", to: "2026-05-25" })).toBeUndefined();
        });
        it("moves both dates back one year for the previous year", () => {
            expect(previousYearRange({ from: "2026-05-25", to: "2026-06-23" })).toEqual({ from: "2025-05-25", to: "2025-06-23" });
        });
        it("moves 29 Feb to 28 Feb in a year without a leap day", () => {
            expect(previousYearRange({ from: "2028-02-29", to: "2028-03-10" })).toEqual({ from: "2027-02-28", to: "2027-03-10" });
        });
        it("keeps dates around a leap day as they are when going back into a leap year", () => {
            expect(previousYearRange({ from: "2025-02-01", to: "2025-03-01" })).toEqual({ from: "2024-02-01", to: "2024-03-01" });
        });
    });
});
