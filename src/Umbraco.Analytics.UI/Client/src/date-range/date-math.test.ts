import { describe, expect, it } from "vitest";
import { addDays, builtInPresetRange, isoToDate, parseIso, todayIso } from "./date-math.js";

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
});
