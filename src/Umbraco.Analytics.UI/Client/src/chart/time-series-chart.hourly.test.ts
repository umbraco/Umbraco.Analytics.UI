// HRS-2 — One bar per hour. Pending until T6 (docs/plans/hourly-buckets/PLAN.md).
import { describe, expect, it } from "vitest";
import { axeRun } from "../internal/test/a11y.js";
import { chartOf, hourlyChart, hoursOf5Nov, rowHeaders, seriesAt } from "./internal/hourly-fixtures.js";

describe("Feature: one bar per hour", () => {
    describe("Scenario: a day of UTC hourly points", () => {
        it.skip("has one date per hour", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)] });
            expect(chartOf(el).data.labels).toHaveLength(24);
        });

        it.skip("has no axe violations", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)] });
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: how a point's date is read", () => {
        it.skip("puts a UTC point in the local hour", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", ["2026-11-05T13:00:00Z"])] });
            expect(rowHeaders(el)).toEqual(["Nov 5, 2026, 2 PM"]);
        });

        it.skip("puts a point with an offset in the local hour", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", ["2026-11-05T14:00:00+01:00"])] });
            expect(rowHeaders(el)).toEqual(["Nov 5, 2026, 2 PM"]);
        });

        it.skip("reads a point with no offset as local time", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", ["2026-11-05T14:00"])] });
            expect(rowHeaders(el)).toEqual(["Nov 5, 2026, 2 PM"]);
        });
    });

    describe("Scenario: two points in one hour", () => {
        it.skip("adds them into one bar", async () => {
            const el = await hourlyChart({ series: [{ id: "requests", label: "Requests", points: [{ date: "2026-11-05T14:00", value: 3 }, { date: "2026-11-05T14:30", value: 4 }] }] });
            expect(chartOf(el).data.datasets[0].data).toEqual([7]);
        });
    });

    describe("Scenario: day grouping doesn't change", () => {
        it.skip("cuts a date-time to the day it starts with", async () => {
            const el = await hourlyChart({ groupBy: "day", series: [seriesAt("requests", ["2026-06-11T00:00:00Z"])] });
            expect(chartOf(el).data.labels).toEqual(["2026-06-11"]);
        });
    });

    describe("Scenario: sad path", () => {
        it.skip("reads a plain date as local midnight", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", ["2026-11-05"])] });
            expect(rowHeaders(el)).toEqual(["Nov 5, 2026, 12 AM"]);
        });

        it.skip("keeps the repeated hour as two bars on the day clocks go back", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", ["2026-10-25T00:00:00Z", "2026-10-25T01:00:00Z"])] });
            expect(chartOf(el).data.labels).toHaveLength(2);
        });
    });
});
