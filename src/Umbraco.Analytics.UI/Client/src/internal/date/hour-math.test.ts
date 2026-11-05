import { describe, expect, it } from "vitest";
import { hoursBetween, hourStart, isRepeatedHour, nextHour, parseMoment, wallClockHourOffset } from "./hour-math.js";
import { bucketEnd } from "./date-math.js";
import { hoursOf25Oct } from "../../chart/internal/hourly-fixtures.js";

// The test browser runs in Europe/Copenhagen (vite.config.ts): UTC+1 in winter, UTC+2 in summer.
describe("Feature: hour maths", () => {
    describe("Scenario: parsing a moment", () => {
        it("reads Z as an instant", () => {
            expect(parseMoment("2026-11-05T13:00:00Z")?.toISOString()).toBe("2026-11-05T13:00:00.000Z");
        });
        it("reads an offset as an instant", () => {
            expect(parseMoment("2026-11-05T14:00:00+01:00")?.toISOString()).toBe("2026-11-05T13:00:00.000Z");
        });
        it("reads a date-time without an offset as local time", () => {
            expect(parseMoment("2026-11-05T14:00")?.toISOString()).toBe("2026-11-05T13:00:00.000Z");
        });
        it("reads a plain date as local midnight", () => {
            expect(parseMoment("2026-11-05")?.toISOString()).toBe("2026-11-04T23:00:00.000Z");
        });
        it("returns undefined for text that isn't a date", () => {
            expect(parseMoment("nope")).toBe(undefined);
            expect(parseMoment(undefined)).toBe(undefined);
        });
        it("returns undefined for a day or time that doesn't exist", () => {
            expect(parseMoment("2026-02-30")).toBe(undefined);
            expect(parseMoment("2026-11-05T25:00")).toBe(undefined);
        });
    });

    describe("Scenario: an ordinary day, 05-11-2026", () => {
        it("starts the hour at the top of the local hour, as a UTC instant", () => {
            expect(hourStart("2026-11-05T13:45:30Z")).toBe("2026-11-05T13:00:00.000Z");
        });
        it("ends the hour one hour later", () => {
            expect(nextHour("2026-11-05T13:00:00.000Z")).toBe("2026-11-05T14:00:00.000Z");
        });
        it("counts wall-clock hours from a local date", () => {
            expect(wallClockHourOffset("2026-11-05", "2026-11-06T13:00:00Z")).toBe(38);
        });
        it("returns undefined offsets for invalid input", () => {
            expect(wallClockHourOffset("2026-11-05", "nope")).toBe(undefined);
        });
    });

    describe("Scenario: the day clocks go forward, 29-03-2026 (23 hours)", () => {
        it("has no 2 AM: 00:59Z is 1 AM, 01:00Z is already 3 AM", () => {
            expect(hourStart("2026-03-29T00:30:00Z")).toBe("2026-03-29T00:00:00.000Z");
            expect(hourStart("2026-03-29T01:30:00Z")).toBe("2026-03-29T01:00:00.000Z");
        });
        it("counts 3 AM as wall-clock hour 3, as on any other day", () => {
            expect(wallClockHourOffset("2026-03-29", "2026-03-29T01:00:00Z")).toBe(3);
        });
        it("keeps 2 PM of the next day at wall-clock hour 38", () => {
            expect(wallClockHourOffset("2026-03-29", "2026-03-30T12:00:00Z")).toBe(38);
        });
    });

    describe("Scenario: the day clocks go back, 25-10-2026 (25 hours)", () => {
        it("keeps the two 2 AM hours as two buckets", () => {
            expect(hourStart("2026-10-25T00:20:00Z")).toBe("2026-10-25T00:00:00.000Z");
            expect(hourStart("2026-10-25T01:20:00Z")).toBe("2026-10-25T01:00:00.000Z");
        });
        it("gives the first 2 AM an end at the second 2 AM", () => {
            expect(nextHour("2026-10-25T00:00:00.000Z")).toBe("2026-10-25T01:00:00.000Z");
        });
        it("gives both 2 AM hours the same wall-clock hour", () => {
            expect(wallClockHourOffset("2026-10-25", "2026-10-25T00:00:00Z")).toBe(2);
            expect(wallClockHourOffset("2026-10-25", "2026-10-25T01:00:00Z")).toBe(2);
        });
        it("keeps 2 PM of the next day at wall-clock hour 38", () => {
            expect(wallClockHourOffset("2026-10-25", "2026-10-26T13:00:00Z")).toBe(38);
        });
    });

    describe("Scenario: local text on a clock-change day", () => {
        it("puts 02:30 on the forward day (a time that doesn't exist) in the 03:00 CEST hour", () => {
            expect(hourStart("2026-03-29T02:30")).toBe("2026-03-29T01:00:00.000Z");
        });
        it("puts 02:30 on the back day (a time that happens twice) in the first, CEST, 2 AM hour", () => {
            expect(hourStart("2026-10-25T02:30")).toBe("2026-10-25T00:00:00.000Z");
        });
    });

    describe("Scenario: bucketEnd routes hour", () => {
        it("ends an hour bucket one hour later", () => {
            expect(bucketEnd("2026-11-05T13:00:00.000Z", "hour")).toBe("2026-11-05T14:00:00.000Z");
        });
        it("hands back invalid input as it is", () => {
            expect(bucketEnd("nope", "hour")).toBe("nope");
        });
    });

    // On 25 Oct 2026 (Copenhagen) hours 2 and 3 of the day's 25 are both 2 AM.
    describe("Scenario: the repeated hour", () => {
        it("is the first 2 AM", () => expect(isRepeatedHour(hoursOf25Oct[2])).toBe(true));
        it("is the second 2 AM", () => expect(isRepeatedHour(hoursOf25Oct[3])).toBe(true));
        it("is not the hour before", () => expect(isRepeatedHour(hoursOf25Oct[1])).toBe(false));
        it("is not the hour after", () => expect(isRepeatedHour(hoursOf25Oct[4])).toBe(false));
    });

    describe("Scenario: the hours between two dates", () => {
        it("is empty for an invalid date", () => {
            expect(hoursBetween("nope", "2026-11-06")).toEqual([]);
        });
        it("is empty when the end date is the start date", () => {
            expect(hoursBetween("2026-11-05", "2026-11-05")).toEqual([]);
        });
        it("is empty when the end date is before the start date", () => {
            expect(hoursBetween("2026-11-05", "2026-11-04")).toEqual([]);
        });
    });
});
