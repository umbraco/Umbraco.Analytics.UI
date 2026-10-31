import { describe, expect, it } from "vitest";
import { addDays, bucketOffset, bucketStart, builtInPresetRange, dateOnly, compareRangeFor, firstOfNextMonth, isoToDate, parseIso, previousPeriodRange, previousYearRange, resolveWeekStart, todayIso } from "./date-math.js";

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

describe("firstOfNextMonth", () => {
    it("is the 1st of the next month", () => {
        expect(firstOfNextMonth("2026-06-11")).toBe("2026-07-01");
    });

    it("rolls over the year", () => {
        expect(firstOfNextMonth("2026-12-31")).toBe("2027-01-01");
    });

    it("leaves a date that isn't real as it is", () => {
        expect(firstOfNextMonth("nope")).toBe("nope");
    });
});

describe("compareRangeFor", () => {
    const range = { from: "2026-05-25", to: "2026-06-23" };

    it("gives the previous period", () => {
        expect(compareRangeFor("previous-period", range)).toEqual(previousPeriodRange(range));
    });

    it("gives the previous year", () => {
        expect(compareRangeFor("previous-year", range)).toEqual(previousYearRange(range));
    });

    it("gives nothing for a custom comparison", () => {
        expect(compareRangeFor("custom", range)).toBeUndefined();
    });
});

describe("dateOnly", () => {
    it("keeps the day of a date-time as written, with no timezone shift", () => {
        expect(dateOnly("2026-06-11T00:00:00Z")).toBe("2026-06-11");
    });

    it("leaves a plain date as it is", () => {
        expect(dateOnly("2026-06-11")).toBe("2026-06-11");
    });

    it("leaves text that doesn't start with a date as it is", () => {
        expect(dateOnly("June")).toBe("June");
    });
});

describe("bucketOffset", () => {
    it("counts weeks between the Mondays of two dates", () => {
        expect(bucketOffset("2026-04-29", "2026-05-13", "week")).toBe(2);
    });

    it("counts months across a year end", () => {
        expect(bucketOffset("2025-11-20", "2026-02-01", "month")).toBe(3);
    });

    it("counts days", () => {
        expect(bucketOffset("2026-02-27", "2026-03-02", "day")).toBe(3);
    });

    it("gives nothing for a date that isn't real", () => {
        expect(bucketOffset("2026-02-27", "June", "day")).toBeUndefined();
    });
});

describe("bucketStart for weeks", () => {
    it("starts a week on Monday when no week start is given", () => {
        expect(bucketStart("2026-06-10", "week")).toBe("2026-06-08");
    });

    it("starts a week on Sunday for a week start of 7", () => {
        expect(bucketStart("2026-06-10", "week", 7)).toBe("2026-06-07");
    });

    it("keeps a date that is the week start", () => {
        expect(bucketStart("2026-06-07", "week", 7)).toBe("2026-06-07");
    });

    it("starts a week on Saturday for a week start of 6", () => {
        expect(bucketStart("2026-06-10", "week", 6)).toBe("2026-06-06");
    });

    it("reads a week start of 0 as Monday", () => {
        expect(bucketStart("2026-06-10", "week", 0 as never)).toBe("2026-06-08");
    });

    it("reads a week start of 8 as Monday", () => {
        expect(bucketStart("2026-06-10", "week", 8 as never)).toBe("2026-06-08");
    });
});

describe("bucketOffset for weeks with a week start", () => {
    it("counts weeks between the Sundays of two dates", () => {
        expect(bucketOffset("2026-05-06", "2026-05-10", "week", 7)).toBe(1);
    });

    it("puts a Sunday in the same Monday week as the Wednesday before it", () => {
        expect(bucketOffset("2026-05-06", "2026-05-10", "week")).toBe(0);
    });
});

describe("resolveWeekStart", () => {
    it("keeps a whole number from 1 to 7", () => {
        expect(resolveWeekStart(7)).toBe(7);
    });

    it("reads a fraction as Monday", () => {
        expect(resolveWeekStart(2.5)).toBe(1);
    });

    it("reads NaN as Monday", () => {
        expect(resolveWeekStart(Number.NaN)).toBe(1);
    });

    it("reads a missing value as Monday", () => {
        expect(resolveWeekStart(undefined)).toBe(1);
    });
});
