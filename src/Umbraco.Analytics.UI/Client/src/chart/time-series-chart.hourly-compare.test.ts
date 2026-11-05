// HRS-3 — Compare hour for hour. Pending until T7 (docs/plans/hourly-buckets/PLAN.md).
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { deepText, shadow } from "../internal/test/dom.js";
import { buildChartData } from "./internal/chart-data.js";
import { chartOf, hourlyChart, hoursOf25Oct, hoursOf26Oct, hoursOf4Nov, hoursOf5Nov, seriesAt } from "./internal/hourly-fixtures.js";

// "hour" isn't a bucket unit until T1, so it's passed through a cast until then.
const hour = "hour" as Parameters<typeof buildChartData>[2];
const twoPm = (hours: string[]) => [hours[14]];

describe("Feature: compare hour for hour", () => {
    describe("Scenario: today against yesterday", () => {
        it.skip("puts yesterday's 2 PM under today's 2 PM", () => {
            const data = buildChartData([seriesAt("r", twoPm(hoursOf5Nov), () => 10)], [seriesAt("r", twoPm(hoursOf4Nov), () => 8)], hour, { from: "2026-11-05", compareFrom: "2026-11-04" });
            expect(data.series[0].compare).toEqual([8]);
        });

        it.skip("names the compare point's own date and hour in the tooltip", async () => {
            const el = await hourlyChart({
                kind: "line",
                series: [seriesAt("requests", hoursOf5Nov)],
                compareSeries: [seriesAt("requests", hoursOf4Nov)],
                range: { from: "2026-11-05", to: "2026-11-05" },
                compare: { mode: "custom", from: "2026-11-04", to: "2026-11-04" },
            });
            const canvas = shadow(el).querySelector("canvas")!;
            const x = chartOf(el).getDatasetMeta(0).data[13].x;
            await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
            await expect.poll(() => deepText(shadow(el).querySelector("uaui-chart-tooltip")!)).toContain("Nov 4, 2026, 1 PM");
        });
    });

    describe("Scenario: sad path, across the day clocks go back", () => {
        it.skip("still puts 2 PM under 2 PM", () => {
            const data = buildChartData([seriesAt("r", twoPm(hoursOf26Oct), () => 10)], [seriesAt("r", [hoursOf25Oct[15]], () => 8)], hour, { from: "2026-10-26", compareFrom: "2026-10-25" });
            expect(data.series[0].compare).toEqual([8]);
        });

        it.skip("adds up the two compare points in the repeated hour", () => {
            const current = [seriesAt("r", [hoursOf26Oct[2]], () => 1)];
            const compare = [{ id: "r", label: "r", points: [{ date: hoursOf25Oct[2], value: 5 }, { date: hoursOf25Oct[3], value: 6 }] }];
            const data = buildChartData(current, compare, hour, { from: "2026-10-26", compareFrom: "2026-10-25" });
            expect(data.series[0].compare).toEqual([11]);
        });
    });
});
