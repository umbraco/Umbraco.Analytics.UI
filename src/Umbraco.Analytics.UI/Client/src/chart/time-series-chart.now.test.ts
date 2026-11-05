// HRS-4 — The now line. Pending until T5 (AC9) and T8 (AC1–AC8) (docs/plans/hourly-buckets/PLAN.md).
// The line's word is drawn on the canvas, so it's read from the canvas's fillText calls.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { deepText, shadow } from "../internal/test/dom.js";
import { chartOf, hourlyChart, hoursOf4Nov, hoursOf5Nov, rowHeaders, seriesAt } from "./internal/hourly-fixtures.js";
import { UauiTimeSeriesChartElement } from "./time-series-chart.element.js";

const nowRow = (el: Element) => rowHeaders(el).find((r) => r.includes("(now)") || r.includes("(today)"));
const days = ["2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"];

describe("Feature: the now line", () => {
    let drawn: string[];
    beforeEach(() => {
        drawn = [];
        const fillText = CanvasRenderingContext2D.prototype.fillText;
        vi.spyOn(CanvasRenderingContext2D.prototype, "fillText").mockImplementation(function (this: CanvasRenderingContext2D, text: string, x: number, y: number) {
            drawn.push(text);
            fillText.call(this, text, x, y);
        });
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Scenario: by hour", () => {
        it.skip("is in the hour that contains now", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)], now: "2026-11-05T14:23" });
            expect(nowRow(el)).toBe("Nov 5, 2026, 2 PM (now)");
        });

        it.skip("reads a UTC now in local time", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)], now: "2026-11-05T13:23:00Z" });
            expect(nowRow(el)).toBe("Nov 5, 2026, 2 PM (now)");
        });

        it.skip("labels the line Now", async () => {
            await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)], now: "2026-11-05T14:23" });
            expect(drawn).toContain("Now");
        });

        it.skip("names the now hour in the tooltip", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)], now: "2026-11-05T14:23" });
            const canvas = shadow(el).querySelector("canvas")!;
            const x = chartOf(el).getDatasetMeta(0).data[14].x;
            await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
            await expect.poll(() => deepText(shadow(el).querySelector("uaui-chart-tooltip")!)).toContain("Nov 5, 2026, 2 PM (now)");
        });
    });

    describe("Scenario: by day", () => {
        it.skip("labels the line Today", async () => {
            await hourlyChart({ groupBy: "day", series: [seriesAt("requests", days)], now: "2026-11-05" });
            expect(drawn).toContain("Today");
        });

        it.skip("reads a UTC now as the local day", async () => {
            const el = await hourlyChart({ groupBy: "day", series: [seriesAt("requests", days)], now: "2026-11-04T23:30:00Z" });
            expect(nowRow(el)).toMatch(/^Nov 5, 2026/);
        });
    });

    describe("Scenario: sad path", () => {
        it.skip("draws no line when now is outside the dates", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf4Nov)], now: "2026-11-05T14:23" });
            expect(nowRow(el)).toBeUndefined();
        });

        it("has no today property", () => {
            expect("today" in UauiTimeSeriesChartElement.prototype).toBe(false);
        });
    });
});
