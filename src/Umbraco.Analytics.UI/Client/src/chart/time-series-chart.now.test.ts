// HRS-4 — The now line.
// The line's word is drawn on the canvas, so it's read from the canvas's fillText calls.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import { page, userEvent } from "vitest/browser";
import { deepText, shadow } from "../internal/test/dom.js";
import { chartOf, hourlyChart, hoursOf25Oct, hoursOf4Nov, hoursOf5Nov, rowHeaders, seriesAt } from "./internal/hourly-fixtures.js";
import { UauiTimeSeriesChartElement } from "./time-series-chart.element.js";

const nowRow = (el: Element) => rowHeaders(el).find((r) => r.includes("(now)") || r.includes("(today)"));
const days = ["2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"];

describe("Feature: the now line", () => {
    const previousLanguage = umbLocalizationManager.documentLanguage;
    let drawn: string[];
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
        drawn = [];
        const fillText = CanvasRenderingContext2D.prototype.fillText;
        vi.spyOn(CanvasRenderingContext2D.prototype, "fillText").mockImplementation(function (this: CanvasRenderingContext2D, text: string, x: number, y: number) {
            drawn.push(text);
            fillText.call(this, text, x, y);
        });
    });
    afterEach(() => {
        umbLocalizationManager.documentLanguage = previousLanguage;
        vi.restoreAllMocks();
    });

    describe("Scenario: by hour", () => {
        it("is in the hour that contains now", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)], now: "2026-11-05T14:23" });
            expect(nowRow(el)).toBe("Nov 5, 2026, 2 PM (now)");
        });

        it("reads a UTC now in local time", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)], now: "2026-11-05T13:23:00Z" });
            expect(nowRow(el)).toBe("Nov 5, 2026, 2 PM (now)");
        });

        it("marks the second 2 AM when now is in the repeated hour", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf25Oct)], now: "2026-10-25T02:30+01:00" });
            expect(rowHeaders(el).findIndex((r) => r.includes("(now)"))).toBe(3);
        });

        it("labels the line Now", async () => {
            await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)], now: "2026-11-05T14:23" });
            expect(drawn).toContain("Now");
        });

        it("names the now hour in the tooltip", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)], now: "2026-11-05T14:23" });
            const canvas = shadow(el).querySelector("canvas")!;
            const x = chartOf(el).getDatasetMeta(0).data[14].x;
            await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
            await expect.poll(() => deepText(shadow(el).querySelector("uaui-chart-tooltip")!)).toContain("Nov 5, 2026, 2 PM (now)");
        });
    });

    describe("Scenario: by day", () => {
        it("labels the line Today", async () => {
            await hourlyChart({ groupBy: "day", series: [seriesAt("requests", days)], now: "2026-11-05" });
            expect(drawn).toContain("Today");
        });

        it("reads a UTC now as the local day", async () => {
            const el = await hourlyChart({ groupBy: "day", series: [seriesAt("requests", days)], now: "2026-11-04T23:30:00Z" });
            expect(nowRow(el)).toMatch(/^Nov 5, 2026/);
        });
    });

    describe("Scenario: sad path", () => {
        it("draws no line when now is outside the dates", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf4Nov)], now: "2026-11-05T14:23" });
            expect(nowRow(el)).toBeUndefined();
        });

        it("has no today property", () => {
            expect("today" in UauiTimeSeriesChartElement.prototype).toBe(false);
        });
    });
});
