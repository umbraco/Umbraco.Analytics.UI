// Incomplete period — `incomplete-from` marks the latest dates as not final: the series draw see-through there over a
// hatched band, and the tooltip and the hidden table name those dates as incomplete.
// Canvas outcomes are read from the Chart.js chart (dataset options, pixels), as the other time-series chart specs do.
import { Chart } from "@umbraco/analytics-ui/external/chart.js";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQuery, deepText, renderElement, settle, shadow } from "../internal/test/dom.js";
import { firstIncompleteIndex } from "./internal/incomplete-index.js";
import type { UauiSeries } from "./types.js";
import "./time-series-chart.element.js";

const days = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"];
const weeks = ["2026-10-26", "2026-11-02", "2026-11-09"];
const seriesOf = (id: string, values: number[], on = days): UauiSeries => ({
    id,
    label: id,
    points: on.map((date, i) => ({ date, value: values[i] })),
});
const reviews = seriesOf("reviews", [4, 6, 5, 7, 2]);
const approvals = seriesOf("approvals", [1, 2, 2, 1, 1]);
const previous = seriesOf("reviews", [3, 4, 4, 5, 5], ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]);

type Options = { kind?: string; series?: UauiSeries[]; compare?: UauiSeries[]; today?: string; incompleteFrom?: string; groupBy?: string; height?: string; lowerIsBetter?: boolean };
const chart = ({ kind = "line", series = [reviews], compare, today, incompleteFrom, groupBy = "day", height, lowerIsBetter }: Options = {}) =>
    renderElement(
        html`<uaui-time-series-chart kind=${kind} group-by=${groupBy} .lowerIsBetter=${lowerIsBetter ?? false} .today=${today} .incompleteFrom=${incompleteFrom} .series=${series}
            .compareSeries=${compare ?? []} style="width:400px${height ? `; --uaui-chart-height: ${height}` : ""}"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );

const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
const tooltip = (el: Element) => shadow(el).querySelector("uaui-chart-tooltip") as HTMLElement;
const rowHeaders = (el: Element) => [...deepQuery<HTMLTableElement>(shadow(el), "table")!.querySelectorAll("tbody th")].map((th) => th.textContent!.trim());
const hoverDate = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const x = chartOf(el).getDatasetMeta(0).data[index].x;
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
    await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
};
type Dataset = {
    segment?: { borderColor: (ctx: { p1DataIndex: number }) => string | undefined; backgroundColor: (ctx: { p1DataIndex: number }) => string | undefined };
    backgroundColor: string | ((ctx: { dataIndex: number }) => string);
    borderColor: string;
    pointBackgroundColor: string | ((ctx: { dataIndex: number }) => string);
};
const datasetOf = (el: Element, i: number) => chartOf(el).data.datasets[i] as unknown as Dataset;
const pluginIds = (el: Element) => ((chartOf(el).config as unknown as { plugins: { id: string }[] }).plugins ?? []).map((p) => p.id);

describe("Feature: marking the incomplete part of a time series chart", () => {
    describe("Scenario: which dates are incomplete", () => {
        it("starts at the day that contains the date, by day", () => {
            expect(firstIncompleteIndex("2026-11-04", days, "day")).toBe(3);
        });

        it("starts at the week that contains the date, by week", () => {
            expect(firstIncompleteIndex("2026-11-04", weeks, "week")).toBe(1);
        });

        it("starts at the month that contains the date, by month", () => {
            expect(firstIncompleteIndex("2026-11-20", ["2026-10-01", "2026-11-01"], "month")).toBe(1);
        });

        it("makes everything incomplete when the date is before the first", () => {
            expect(firstIncompleteIndex("2026-10-01", days, "day")).toBe(0);
        });

        it("makes nothing incomplete when the date is after the last bucket", () => {
            expect(firstIncompleteIndex("2026-11-06", days, "day")).toBeUndefined();
            expect(firstIncompleteIndex("2026-11-16", weeks, "week")).toBeUndefined();
        });

        it("reads a date-time as the day it starts with", () => {
            expect(firstIncompleteIndex("2026-11-04T13:00:00Z", days, "day")).toBe(3);
        });

        it("starts at the next date when the date falls in a gap", () => {
            expect(firstIncompleteIndex("2026-11-02", ["2026-11-01", "2026-11-05"], "day")).toBe(1);
        });

        it("names the dates from the date onward in the hidden table", async () => {
            const el = await chart({ incompleteFrom: "2026-11-04" });
            await settle(el);
            expect(rowHeaders(el).map((r) => r.endsWith("(incomplete)"))).toEqual([false, false, false, true, true]);
        });

        it("names the weeks from the one that contains the date", async () => {
            const el = await chart({ kind: "bar", groupBy: "week", series: [seriesOf("reviews", [3, 4, 5], weeks)], incompleteFrom: "2026-11-04" });
            await settle(el);
            expect(rowHeaders(el).map((r) => r.endsWith("(incomplete)"))).toEqual([false, true, true]);
        });

        it("names nothing when the date is after the last bucket or not set", async () => {
            const after = await chart({ incompleteFrom: "2026-12-24" });
            const unset = await chart();
            await settle(after);
            await settle(unset);
            expect(rowHeaders(after).some((r) => r.includes("incomplete"))).toBe(false);
            expect(rowHeaders(unset).some((r) => r.includes("incomplete"))).toBe(false);
        });

        it("names the dates when the date is set later", async () => {
            const el = await chart();
            await settle(el);
            (el as unknown as { incompleteFrom: string }).incompleteFrom = "2026-11-05";
            await settle(el);
            expect(rowHeaders(el).filter((r) => r.endsWith("(incomplete)"))).toHaveLength(1);
        });
    });

    describe("Scenario: a line with an incomplete tail", () => {
        it("fades the segments that end at an incomplete date only", async () => {
            const el = await chart({ incompleteFrom: "2026-11-04" });
            await settle(el);
            const { segment, borderColor } = datasetOf(el, 0);
            expect([1, 2, 3, 4].map((i) => segment!.borderColor({ p1DataIndex: i }))).toEqual([undefined, undefined, expect.any(String), expect.any(String)]);
            expect(segment!.borderColor({ p1DataIndex: 3 })).not.toBe(borderColor);
        });

        it("fades the area of those segments too", async () => {
            const el = await chart({ kind: "area", incompleteFrom: "2026-11-04" });
            await settle(el);
            const { segment } = datasetOf(el, 0);
            expect(segment!.backgroundColor({ p1DataIndex: 2 })).toBeUndefined();
            expect(segment!.backgroundColor({ p1DataIndex: 3 })).toEqual(expect.any(String));
        });

        it("draws the points at incomplete dates hollow", async () => {
            const el = await chart({ incompleteFrom: "2026-11-04" });
            await settle(el);
            const fill = datasetOf(el, 0).pointBackgroundColor as (ctx: { dataIndex: number }) => string;
            expect(fill({ dataIndex: 3 })).not.toBe(fill({ dataIndex: 2 }));
        });

        it("fades nothing without the property", async () => {
            const el = await chart();
            await settle(el);
            expect(datasetOf(el, 0).segment).toBeUndefined();
        });

        it("leaves the compare line as it was", async () => {
            const el = await chart({ compare: [previous], incompleteFrom: "2026-11-04" });
            await settle(el);
            const compare = datasetOf(el, 1);
            expect(compare.segment).toBeUndefined();
            expect(typeof compare.borderColor).toBe("string");
        });
    });

    describe("Scenario: the gap to the compare line", () => {
        const high = seriesOf("reviews", [10, 10, 10, 10, 10]);
        const low = seriesOf("reviews", [2, 2, 2, 2, 2], previous.points.map((p) => p.date));
        // The colour of the gap between the lines, halfway between dates `at` and `at + 1`.
        const gapPixel = (el: Element, at: number) => {
            const chart = chartOf(el);
            const canvas = shadow(el).querySelector("canvas")!;
            const ratio = canvas.width / canvas.getBoundingClientRect().width;
            const points = chart.getDatasetMeta(0).data;
            const x = (points[at].x + points[at + 1].x) / 2;
            const y = chart.scales["y"].getPixelForValue(6);
            const [r, g, b, a] = canvas.getContext("2d")!.getImageData(Math.round(x * ratio), Math.round(y * ratio), 1, 1).data;
            return { r, g, b, a };
        };
        const gap = async (at: number, options: Options) => {
            const el = await chart({ series: [high], compare: [low], height: "300px", ...options });
            await settle(el);
            return gapPixel(el, at);
        };

        it.each([false, true])("keeps its colour in a complete span with incomplete-from set (lower is better: %s)", async (lowerIsBetter) => {
            const plain = await gap(0, { lowerIsBetter });
            expect(plain.a).toBeGreaterThan(0);
            expect(await gap(0, { lowerIsBetter, incompleteFrom: "2026-11-04" })).toEqual(plain);
        });

        // The series is above its compare: green when that is better, red when lower is better.
        it.each([
            ["a complete", 0],
            ["an incomplete", 3],
        ])("tells a gain from a loss in %s span", async (_name, at) => {
            const options = { incompleteFrom: "2026-11-04" };
            const gain = await gap(at, { ...options, lowerIsBetter: false });
            const loss = await gap(at, { ...options, lowerIsBetter: true });
            expect(gain.g).toBeGreaterThan(gain.r);
            expect(loss.r).toBeGreaterThan(loss.g);
        });
    });

    describe("Scenario: bars with an incomplete tail", () => {
        it.each(["bar", "stacked-bar"])("fades the %s at incomplete dates only", async (kind) => {
            const el = await chart({ kind, series: [reviews, approvals], incompleteFrom: "2026-11-04" });
            await settle(el);
            for (const i of [0, 1]) {
                const fill = datasetOf(el, i).backgroundColor as (ctx: { dataIndex: number }) => string;
                expect(fill({ dataIndex: 2 })).not.toBe(fill({ dataIndex: 3 }));
                expect(fill({ dataIndex: 3 })).toBe(fill({ dataIndex: 4 }));
            }
        });

        it("leaves the compare bar as it was", async () => {
            const el = await chart({ kind: "bar", compare: [previous], incompleteFrom: "2026-11-04" });
            await settle(el);
            expect(typeof datasetOf(el, 1).backgroundColor).toBe("string");
        });
    });

    describe("Scenario: incomplete-from is cleared", () => {
        it("draws plainly again and drops the table labels", async () => {
            const el = await chart({ incompleteFrom: "2026-11-04" });
            await settle(el);
            expect(datasetOf(el, 0).segment).toBeDefined();
            (el as unknown as { incompleteFrom?: string }).incompleteFrom = undefined;
            await settle(el);
            expect(datasetOf(el, 0).segment).toBeUndefined();
            expect(typeof datasetOf(el, 0).pointBackgroundColor).toBe("string");
            expect(rowHeaders(el).some((r) => r.includes("incomplete"))).toBe(false);
        });
    });

    describe("Scenario: a series is hidden from the legend", () => {
        it("still marks the incomplete dates, on the series left", async () => {
            const el = await chart({ kind: "bar", series: [reviews, approvals], incompleteFrom: "2026-11-04" });
            await settle(el);
            const legend = deepQuery<HTMLElement>(shadow(el), "uaui-chart-legend")!;
            [...legend.shadowRoot!.querySelectorAll<HTMLButtonElement>("button.legend-entry")].find((b) => b.textContent!.trim() === "reviews")!.click();
            await settle(el);
            expect(chartOf(el).data.datasets).toHaveLength(1);
            const fill = datasetOf(el, 0).backgroundColor as (ctx: { dataIndex: number }) => string;
            expect(fill({ dataIndex: 2 })).not.toBe(fill({ dataIndex: 3 }));
            expect(rowHeaders(el).filter((r) => r.endsWith("(incomplete)"))).toHaveLength(2);
        });
    });

    describe("Scenario: the hatched band", () => {
        it("is a plugin of each chart, before the today line, and never registered globally", async () => {
            const first = await chart({ incompleteFrom: "2026-11-04", today: "2026-11-04" });
            const second = await chart({ incompleteFrom: "2026-11-04" });
            await settle(first);
            await settle(second);
            expect(pluginIds(first).indexOf("uauiIncomplete")).toBeGreaterThan(-1);
            expect(pluginIds(first).indexOf("uauiIncomplete")).toBeLessThan(pluginIds(first).indexOf("uauiToday"));
            const instance = (el: Element) => (chartOf(el).config as unknown as { plugins: { id: string }[] }).plugins.find((p) => p.id === "uauiIncomplete");
            expect(instance(first)).not.toBe(instance(second));
            expect(Object.keys((Chart.registry.plugins as unknown as { items: object }).items)).not.toContain("uauiIncomplete");
        });

        // The last slot has no bar (value 0), so any pixel there above the grid is the hatch.
        const hatchPixels = (el: Element) => {
            const chart = chartOf(el);
            const canvas = shadow(el).querySelector("canvas")!;
            const ratio = canvas.width / canvas.getBoundingClientRect().width;
            const { left, right, top } = chart.chartArea;
            const slot = (right - left) / 5;
            const data = canvas.getContext("2d")!.getImageData(Math.round((right - slot + 2) * ratio), Math.round((top + 2) * ratio), Math.round((slot - 4) * ratio), Math.round(40 * ratio)).data;
            let drawn = 0;
            for (let i = 3; i < data.length; i += 4) if (data[i] > 0) drawn++;
            return drawn;
        };

        it("shades the incomplete slots of bars", async () => {
            const series = [seriesOf("reviews", [4, 6, 5, 7, 0])];
            const plain = await chart({ kind: "bar", series, height: "300px" });
            const marked = await chart({ kind: "bar", series, incompleteFrom: "2026-11-05", height: "300px" });
            await settle(plain);
            await settle(marked);
            // The grid line at the plot's top is in both; the hatch only in the marked chart.
            expect(hatchPixels(marked)).toBeGreaterThan(hatchPixels(plain));
        });

        it("shades nothing when no date is incomplete", async () => {
            const series = [seriesOf("reviews", [4, 6, 5, 7, 0])];
            const a = await chart({ kind: "bar", series, height: "300px" });
            const b = await chart({ kind: "bar", series, incompleteFrom: "2026-12-24", height: "300px" });
            await settle(a);
            await settle(b);
            expect(hatchPixels(b)).toBe(hatchPixels(a));
        });
    });

    describe("Scenario: the tooltip and the hidden table", () => {
        it("names an incomplete date in the tooltip", async () => {
            const el = await chart({ incompleteFrom: "2026-11-04" });
            await settle(el);
            await hoverDate(el, 3);
            expect(deepText(tooltip(el))).toContain("(incomplete)");
            await hoverDate(el, 1);
            expect(deepText(tooltip(el))).not.toContain("(incomplete)");
        });

        it("names a date that is today and incomplete with one phrase", async () => {
            const el = await chart({ today: "2026-11-04", incompleteFrom: "2026-11-04" });
            await settle(el);
            const rows = rowHeaders(el);
            expect(rows[3]).toMatch(/\(today, incomplete\)$/);
            expect(rows[4]).toMatch(/\(incomplete\)$/);
            expect(rows[4]).not.toContain("today");
        });

        it("names today when only today is set", async () => {
            const el = await chart({ today: "2026-11-04" });
            await settle(el);
            expect(rowHeaders(el)[3]).toMatch(/\(today\)$/);
        });

        it("names a week that contains today and is incomplete with one phrase", async () => {
            const el = await chart({ kind: "bar", groupBy: "week", series: [seriesOf("reviews", [3, 4, 5], weeks)], today: "2026-11-04", incompleteFrom: "2026-11-04" });
            await settle(el);
            const rows = rowHeaders(el);
            expect(rows[1]).toMatch(/\(includes today, incomplete\)$/);
            expect(rows[2]).toMatch(/\(incomplete\)$/);
        });
    });

    describe("Scenario: accessibility", () => {
        it("has no accessibility violations", async () => {
            const el = await chart({ kind: "bar", series: [reviews, approvals], compare: [previous], today: "2026-11-04", incompleteFrom: "2026-11-04" });
            await settle(el);
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });
});
