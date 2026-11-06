// HRS-1 — Buckets for a range. Runs with the browser's time zone pinned to Europe/Copenhagen.
import { describe, expect, it } from "vitest";
import { uauiBucketsFor } from "./index.js";

describe("Feature: buckets for a range", () => {
    describe("Scenario: one day by hour", () => {
        const range = { from: "2026-11-05", to: "2026-11-05" };

        it("returns 24 buckets", () => {
            expect(uauiBucketsFor(range, "hour")).toHaveLength(24);
        });

        it("starts the first hour at local midnight, as a UTC instant", () => {
            expect(uauiBucketsFor(range, "hour")[0]).toMatchObject({ start: "2026-11-04T23:00:00.000Z", end: "2026-11-05T00:00:00.000Z" });
        });

        it("names the local day of every hour", () => {
            expect(new Set(uauiBucketsFor(range, "hour").map((b) => b.days.join()))).toEqual(new Set(["2026-11-05"]));
        });
    });

    describe("Scenario: day and month buckets gain an end", () => {
        it("ends a day bucket on the next day", () => {
            expect(uauiBucketsFor({ from: "2026-11-01", to: "2026-11-03" }, "day")[0].end).toBe("2026-11-02");
        });

        it("ends a month bucket on the 1st of the next month", () => {
            expect(uauiBucketsFor({ from: "2026-01-15", to: "2026-02-10" }, "month")[0].end).toBe("2026-02-01");
        });
    });

    describe("Scenario: sad path, days the clocks change", () => {
        it("returns 23 buckets on the day clocks go forward", () => {
            expect(uauiBucketsFor({ from: "2026-03-29", to: "2026-03-29" }, "hour")).toHaveLength(23);
        });

        it("returns 25 buckets on the day clocks go back", () => {
            expect(uauiBucketsFor({ from: "2026-10-25", to: "2026-10-25" }, "hour")).toHaveLength(25);
        });
    });

    describe("Scenario: two days by hour", () => {
        const buckets = uauiBucketsFor({ from: "2026-11-05", to: "2026-11-06" }, "hour");

        it("returns 48 buckets", () => {
            expect(buckets).toHaveLength(48);
        });

        it("gives the last bucket the last local date", () => {
            expect(buckets[47].days).toEqual(["2026-11-06"]);
        });

        it("ends the last bucket at the midnight after the range", () => {
            expect(buckets[47].end).toBe("2026-11-06T23:00:00.000Z");
        });
    });

    describe("Scenario: a clipped first week", () => {
        const first = uauiBucketsFor({ from: "2026-11-04", to: "2026-11-20" }, "week", { weekStart: 1 })[0];

        it("starts on the week's first day, before the range", () => {
            expect(first.start).toBe("2026-11-02");
        });

        it("ends seven days after its start", () => {
            expect(first.end).toBe("2026-11-09");
        });
    });
});
