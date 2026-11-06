// T58 — Time-series chart for Workflow: bars and a line in one chart (a series' `kind`), a now line (`now`) for
// dates that run past today, and a log y-axis (`y-scale="log"`).
// Canvas outcomes are read from the Chart.js chart (datasets, scales, element positions) and checked with screenshots.
import { Chart } from "@umbraco/analytics-ui/external/chart.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { screenshotIt } from "../internal/test/screenshot.js";
import { deepQuery, deepQueryAll, deepText, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import { logScale } from "./internal/log-scale.js";
import type { UauiSeries } from "./types.js";
import "./time-series-chart.element.js";

const dates = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04"];
const previousDates = ["2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04"];
const seriesOf = (id: string, label: string, values: number[], extra: Partial<UauiSeries> = {}, on = dates): UauiSeries => ({
    id,
    label,
    points: on.map((date, i) => ({ date, value: values[i] })),
    ...extra,
});

// Workflow's approval activity: statuses as daily bars, pending as a running total line.
const approved = seriesOf("approved", "Approved", [5, 8, 6, 3], { color: "positive" });
const cancelled = seriesOf("cancelled", "Cancelled", [1, 0, 2, 1], { color: "default" });
const errored = seriesOf("errored", "Errored", [0, 1, 0, 2], { color: "danger" });
const pending = seriesOf("pending", "Pending", [10, 14, 20, 22], { color: "warning", kind: "line" });
const activity = [approved, cancelled, errored, pending];

const previousApproved = seriesOf("approved", "Approved", [4, 4, 4, 4], {}, previousDates);
const previousErrored = seriesOf("errored", "Errored", [1, 1, 1, 1], {}, previousDates);
const previousPending = seriesOf("pending", "Pending", [8, 9, 9, 12], {}, previousDates);

type ChartOptions = { kind?: string; series?: UauiSeries[]; compare?: UauiSeries[]; now?: string; yScale?: string; groupBy?: string; height?: string };
const chart = ({ kind = "bar", series = activity, compare, now, yScale, groupBy = "day", height }: ChartOptions = {}) =>
    renderElement(
        html`<uaui-time-series-chart kind=${kind} y-scale=${yScale ?? "linear"} group-by=${groupBy} .now=${now} .series=${series}
            .compareSeries=${compare ?? []} style="width:400px${height ? `; --uaui-chart-height: ${height}` : ""}"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );

const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
const datasetTypes = (el: Element) => chartOf(el).data.datasets.map((set) => (set as { type?: string }).type);
const tooltip = (el: Element) => shadow(el).querySelector("uaui-chart-tooltip") as HTMLElement;
const hiddenTable = (el: Element) => deepQuery<HTMLTableElement>(shadow(el), "table")!;
const headers = (el: Element) => [...hiddenTable(el).querySelectorAll("thead th")].map((th) => th.textContent!.trim());
const rowHeaders = (el: Element) => [...hiddenTable(el).querySelectorAll("tbody th")].map((th) => th.textContent!.trim());
const yTickLabels = (el: Element) => chartOf(el).scales["y"].ticks.map((tick) => String(tick.label));
const hoverDate = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const x = chartOf(el).getDatasetMeta(0).data[index].x;
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
    await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
};
const last = <T>(items: T[]): T => items[items.length - 1];
const pointY = (el: Element, dataset: number, index: number) => chartOf(el).getDatasetMeta(dataset).data[index].y;

describe("Feature: bars and a line in one chart", () => {
    describe("Scenario: a bar chart with a series of kind line", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart();
        });

        it("draws the bar series as bars and the line series as a line", () => {
            expect(datasetTypes(el)).toEqual(["bar", "bar", "bar", "line"]);
        });

        it("draws the line over the bars", () => {
            // Chart.js draws the sorted metas from last to first, so the first is drawn on top.
            expect(chartOf(el).getSortedVisibleDatasetMetas()[0].type).toBe("line");
        });

        it("puts the line's points over the middle of each date", () => {
            const line = chartOf(el).getDatasetMeta(3).data.map((p) => p.x);
            const x = chartOf(el).scales["x"];
            expect(line).toEqual(dates.map((_, i) => x.getPixelForValue(i)));
        });

        it("scales the one y-axis to the line when it is the highest", () => {
            expect(chartOf(el).scales["y"].max).toBeGreaterThanOrEqual(22);
        });

        it("shows squares for the bars and a line for the line series in the legend", () => {
            expect(deepQueryAll(shadow(el), ".legend-swatch")).toHaveLength(3);
            expect(deepQueryAll(shadow(el), ".legend-line")).toHaveLength(1);
        });

        it("shows squares for the bars and a dot for the line in the tooltip", async () => {
            await hoverDate(el, 1);
            const swatches = deepQueryAll(tooltip(el).shadowRoot!, ".tooltip-series .swatch");
            expect(swatches.map((s) => s.classList.contains("swatch-square"))).toEqual([true, true, true, false]);
        });

        it("lists every series in the hidden table", () => {
            expect(headers(el)).toEqual(["Date", "Approved", "Cancelled", "Errored", "Pending"]);
        });
    });

    describe("Scenario: a line chart with a series of kind bar", () => {
        it("draws that series as bars, and the rest as lines", async () => {
            const el = await chart({ kind: "line", series: [{ ...approved, kind: "bar" }, { ...pending, kind: undefined }] });
            expect(datasetTypes(el)).toEqual(["bar", "line"]);
        });

        it("fills the lines in an area chart, but not the bars", async () => {
            const el = await chart({ kind: "area", series: [{ ...approved, kind: "bar" }, { ...pending, kind: undefined }] });
            expect((chartOf(el).data.datasets[1] as { fill?: unknown }).fill).toBe("origin");
            expect((chartOf(el).data.datasets[0] as { fill?: unknown }).fill).toBeUndefined();
        });
    });

    describe("Scenario: every series overrides the bar kind with line", () => {
        it("draws a line chart", async () => {
            const el = await chart({ series: [{ ...approved, kind: "line" }, pending] });
            expect(datasetTypes(el)).toEqual(["line", "line"]);
            expect((chartOf(el).config as { type?: string }).type).toBe("line");
        });
    });

    describe("Scenario: a series with an unknown kind", () => {
        it("is drawn as the chart's kind says", async () => {
            const el = await chart({ series: [approved, { ...pending, kind: "pie" as never }] });
            expect(datasetTypes(el)).toEqual(["bar", "bar"]);
        });
    });

    describe("Scenario: a stacked bar chart with a line series", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ kind: "stacked-bar" });
        });

        it("stacks the bars", () => {
            // The second bar of the first date sits on top of the first.
            const first = chartOf(el).getDatasetMeta(0).data[0] as unknown as { y: number };
            const second = chartOf(el).getDatasetMeta(1).data[0] as unknown as { base: number };
            expect(second.base).toBeCloseTo(first.y, 0);
        });

        it("doesn't stack the line on the bars: each point is at its own value", () => {
            const y = chartOf(el).scales["y"];
            pending.points.forEach((p, i) => expect(pointY(el, 3, i)).toBeCloseTo(y.getPixelForValue(p.value), 0));
        });

        it("totals the bars only, in the tooltip and the hidden table", async () => {
            expect(headers(el)).toContain("Total");
            const totals = [...hiddenTable(el).querySelectorAll("tbody tr")].map((tr) => tr.lastElementChild!.textContent!.trim());
            expect(totals).toEqual(["6", "9", "8", "6"]);
            await hoverDate(el, 1);
            expect(deepText(tooltip(el))).toMatch(/9\s*Total/);
        });

        it("scales the y-axis to the highest of the stacked bars and the line", async () => {
            const tall = seriesOf("approved", "Approved", [40, 1, 1, 1]);
            const tallEl = await chart({ kind: "stacked-bar", series: [tall, cancelled, pending] });
            expect(chartOf(tallEl).scales["y"].max).toBeGreaterThanOrEqual(41);
        });
    });

    describe("Scenario: a stacked bar chart whose series are all lines", () => {
        it("draws each line at its own value, inside the axis", async () => {
            const a = seriesOf("a", "A", [10, 10, 10, 10], { kind: "line" });
            const b = seriesOf("b", "B", [10, 10, 10, 10], { kind: "line" });
            const el = await chart({ kind: "stacked-bar", series: [a, b] });
            const y = chartOf(el).scales["y"];
            expect(y.max).toBe(10);
            [0, 1].forEach((set) => dates.forEach((_, i) => expect(pointY(el, set, i)).toBeCloseTo(y.getPixelForValue(10), 0)));
        });
    });

    describe("Scenario: a stacked bar chart with two line series", () => {
        it("stacks the bars but neither line, with the bars or each other", async () => {
            const a = seriesOf("a", "A", [3, 3, 3, 3], { kind: "line" });
            const b = seriesOf("b", "B", [4, 4, 4, 4], { kind: "line" });
            const el = await chart({ kind: "stacked-bar", series: [approved, cancelled, a, b] });
            const y = chartOf(el).scales["y"];
            dates.forEach((_, i) => {
                expect(pointY(el, 2, i)).toBeCloseTo(y.getPixelForValue(3), 0);
                expect(pointY(el, 3, i)).toBeCloseTo(y.getPixelForValue(4), 0);
            });
        });
    });

    describe("Scenario: a mixed chart with compare series", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ compare: [previousApproved, previousErrored, previousPending] });
        });

        it("draws the line's compare series as its dashed line, matched by id", () => {
            const sets = chartOf(el).data.datasets as { type?: string; borderDash?: number[]; data: unknown[] }[];
            const dashed = sets.filter((set) => set.borderDash?.length);
            expect(dashed).toHaveLength(1);
            expect(dashed[0].data).toEqual([8, 9, 9, 12]);
        });

        it("adds up the bars' compare series into one compare bar, without the line's", () => {
            const compareBar = last(chartOf(el).data.datasets) as { type?: string; data: unknown[] };
            expect(compareBar.type).toBe("bar");
            expect(compareBar.data).toEqual([5, 5, 5, 5]);
        });

        it("lists the line's compare column and the compare total in the hidden table", () => {
            expect(headers(el)).toEqual(["Date", "Approved", "Cancelled", "Errored", "Pending", "Pending (compare)", "Total", "Total (compare)"]);
        });

        it("shows a bar and a dashed line in the legend's compare entry", () => {
            const entry = last(deepQueryAll(shadow(el), "li"));
            expect(entry.querySelectorAll(".legend-compare-swatch")).toHaveLength(1);
            expect(entry.querySelectorAll(".legend-compare")).toHaveLength(1);
        });

        it("shows the line's compare value under it, and the compare total, in the tooltip", async () => {
            await hoverDate(el, 1);
            const compares = deepQueryAll(tooltip(el).shadowRoot!, ".swatch-compare");
            expect(compares.map((s) => s.classList.contains("swatch-square"))).toEqual([false, true]);
        });
    });

    describe("Scenario: a line chart with a bar series and compare series", () => {
        it("compares the bar against the compare bar and each line against its own", async () => {
            const el = await chart({ kind: "line", series: [{ ...approved, kind: "bar" }, { ...pending, kind: undefined }], compare: [previousApproved, previousPending] });
            const sets = chartOf(el).data.datasets as { type?: string; borderDash?: number[]; data: unknown[] }[];
            expect(sets.map((s) => s.type)).toEqual(["bar", "line", "line", "bar"]);
            expect(sets[3].data).toEqual([4, 4, 4, 4]);
        });
    });

    describe("Scenario: a bar chart with no line series", () => {
        it("compares every compare series as one total, as before", async () => {
            const el = await chart({ series: [approved, errored], compare: [previousApproved, previousErrored, previousPending] });
            expect((last(chartOf(el).data.datasets) as { data: unknown[] }).data).toEqual([13, 14, 14, 17]);
        });
    });
});

describe("Feature: today's line", () => {
    const future = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"];
    const reviews = seriesOf("reviews", "Reviews due", [2, 0, 3, 1, 4], {}, future);

    describe("Scenario: dates that run past today", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ kind: "bar", series: [reviews], now: "2026-11-02" });
            await settle(el);
        });

        it("plots the dates after today", () => {
            expect(chartOf(el).data.labels).toHaveLength(5);
        });

        it("names today's date in the hidden table", () => {
            const rows = rowHeaders(el);
            expect(rows[1]).toMatch(/\(today\)$/);
            expect(rows.filter((r) => r.includes("(today)"))).toHaveLength(1);
        });

        it("names today's date in the tooltip", async () => {
            await hoverDate(el, 1);
            expect(deepText(tooltip(el))).toContain("(today)");
            await hoverDate(el, 2);
            expect(deepText(tooltip(el))).not.toContain("(today)");
        });

        it("leaves room above the plot for the label", () => {
            expect(chartOf(el).chartArea.top).toBeGreaterThan(20);
        });

        it("is not focusable: there's no button for it", () => {
            expect(deepQueryAll(shadow(el), "button")).toHaveLength(0);
        });

        screenshotIt("draws a thin labelled line at today", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-today");
        });
    });

    describe("Scenario: today isn't among the chart's dates", () => {
        it("draws no now line and names no date as today", async () => {
            const el = await chart({ kind: "bar", series: [reviews], now: "2026-12-24" });
            expect(rowHeaders(el).some((r) => r.includes("today"))).toBe(false);
        });

        it("keeps the label's room, so the plot doesn't move between date ranges", async () => {
            const inRange = await chart({ kind: "bar", series: [reviews], now: "2026-11-02" });
            const outOfRange = await chart({ kind: "bar", series: [reviews], now: "2026-12-24" });
            expect(chartOf(outOfRange).chartArea.top).toBe(chartOf(inRange).chartArea.top);
        });
    });

    describe("Scenario: no today", () => {
        it("leaves the plot where it was, with no room for a label", async () => {
            const el = await chart({ kind: "bar", series: [reviews] });
            expect(chartOf(el).chartArea.top).toBeLessThan(20);
        });
    });

    describe("Scenario: grouped by week", () => {
        it("names the week that contains today as including it", async () => {
            const weekly = seriesOf("w", "Reviews due", [3, 5, 2], {}, ["2026-10-26", "2026-11-02", "2026-11-09"]);
            const el = await chart({ kind: "bar", series: [weekly], now: "2026-11-04", groupBy: "week" });
            const rows = rowHeaders(el);
            expect(rows.findIndex((r) => r.endsWith("(includes today)"))).toBe(1);
            expect(rows.some((r) => r.endsWith("(today)"))).toBe(false);
        });
    });

    describe("Scenario: today is set later", () => {
        it("redraws with the line and names the date", async () => {
            const el = await chart({ kind: "line", series: [reviews] });
            expect(rowHeaders(el).some((r) => r.includes("(today)"))).toBe(false);
            el.now = "2026-11-03";
            await settle(el);
            expect(rowHeaders(el)[2]).toMatch(/\(today\)$/);
            expect(chartOf(el).chartArea.top).toBeGreaterThan(20);
        });
    });
});

describe("Feature: a log y-axis", () => {
    const wide = seriesOf("approved", "Approved", [0, 3, 40, 900]);

    describe("Scenario: values that span widely, with a 0", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ kind: "line", series: [wide], yScale: "log" });
        });

        it("ticks at 0 and each power of ten, formatted in the user's culture", () => {
            expect(yTickLabels(el)).toEqual(["0", "1", "10", "100", "1,000"]);
        });

        it("gives each power of ten above the first the same height", () => {
            const y = chartOf(el).scales["y"];
            const [zero, one, ten, hundred, thousand] = y.ticks.map((t) => y.getPixelForValue(t.value));
            // Within 4% of a decade from 10 up; the first decade is a little shorter as the axis bends down to 0.
            expect((ten - hundred) / (hundred - thousand)).toBeGreaterThan(0.96);
            const heightOf = (v: number) => Math.log10(1 + v);
            const decade = (hundred - thousand) / (heightOf(1000) - heightOf(100));
            expect((one - ten) / decade).toBeCloseTo(heightOf(10) - heightOf(1), 2);
            expect((zero - one) / decade).toBeCloseTo(heightOf(1), 2);
        });

        it("draws a 0 on the axis line", () => {
            expect(pointY(el, 0, 0)).toBeCloseTo(chartOf(el).scales["y"].bottom, 0);
        });

        it("shows the real values in the tooltip and the hidden table", async () => {
            const cells = [...hiddenTable(el).querySelectorAll("tbody td")].map((td) => td.textContent!.trim());
            expect(cells).toEqual(["0", "3", "40", "900"]);
            await hoverDate(el, 3);
            expect(deepText(tooltip(el))).toContain("900");
        });

        screenshotIt("draws on a log axis", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-log");
        });
    });

    describe("Scenario: the hidden table of a log chart", () => {
        it("says in its caption that the scale is logarithmic", async () => {
            const el = await chart({ kind: "line", series: [wide], yScale: "log" });
            expect(hiddenTable(el).caption!.textContent!.trim()).toBe("Chart data (logarithmic scale)");
            const linear = await chart({ kind: "line", series: [wide] });
            expect(hiddenTable(linear).caption!.textContent!.trim()).toBe("Chart data");
        });
    });

    describe("Scenario: nine decades, 1 to 1e9", () => {
        const huge = seriesOf("b", "Bytes", [1, 1e3, 1e6, 1e9]);
        const tickPixels = (el: Element) => {
            const y = chartOf(el).scales["y"];
            return y.ticks.map((t) => y.getPixelForValue(t.value));
        };
        const powersShown = (el: Element) => {
            const log = logScale(1e9, 1);
            const values = chartOf(el).scales["y"].ticks.map((t) => t.value);
            return log.ticks.flatMap((v, i) => (values.some((h) => Math.abs(h - log.toAxis(v)!) < 1e-9) ? [i] : []));
        };

        it.each([
            ["the default height", undefined],
            ["a short axis", "120px"],
            ["a very short axis", "70px"],
        ])("keeps labels apart at %s, with 0, the top and a regular step of powers", async (_name, height) => {
            const el = await chart({ kind: "line", series: [huge], yScale: "log", height });
            const pixels = tickPixels(el);
            pixels.slice(1).forEach((p, i) => expect(pixels[i] - p).toBeGreaterThanOrEqual(18 - 0.5));
            const shown = powersShown(el);
            expect(shown[0]).toBe(0);
            expect(shown[shown.length - 1]).toBe(10);
            const powers = shown.slice(1);
            const steps = new Set(powers.slice(1).map((p, i) => p - powers[i]));
            expect(steps.size).toBeLessThanOrEqual(1);
            expect(chartOf(el).scales["y"].ticks.every((t) => String(t.label) !== "")).toBe(true);
        });

        it("shows more powers on a taller axis than on a short one", async () => {
            const tall = await chart({ kind: "line", series: [huge], yScale: "log" });
            const short = await chart({ kind: "line", series: [huge], yScale: "log", height: "120px" });
            expect(powersShown(tall).length).toBeGreaterThan(powersShown(short).length);
        });
    });

    describe("Scenario: bars on a log axis", () => {
        it("gives the smallest value's bar a height", async () => {
            const el = await chart({ kind: "bar", series: [seriesOf("e", "Errored", [1, 0, 500, 2])], yScale: "log" });
            const bar = chartOf(el).getDatasetMeta(0).data[0] as unknown as { y: number; base: number };
            expect(bar.base - bar.y).toBeGreaterThan(5);
        });
    });

    describe("Scenario: values below 1", () => {
        it("starts the ticks at the power of ten below the smallest value", async () => {
            const el = await chart({ kind: "line", series: [seriesOf("r", "Rate", [0.02, 0.5, 0.07, 0])], yScale: "log" });
            expect(yTickLabels(el)).toEqual(["0", "0.01", "0.02", "0.05", "0.1", "0.2", "0.5", "1"]);
        });
    });

    describe("Scenario: a log axis with a compare series", () => {
        it("draws the compare line on the same log heights", async () => {
            const previous = seriesOf("approved", "Approved", [10, 10, 10, 10], {}, previousDates);
            const el = await chart({ kind: "line", series: [wide], compare: [previous], yScale: "log" });
            const ten = chartOf(el).scales["y"].ticks.find((t) => t.label === "10")!;
            expect(pointY(el, 1, 0)).toBeCloseTo(chartOf(el).scales["y"].getPixelForValue(ten.value), 0);
        });
    });

    describe("Scenario: a mixed chart on a log axis", () => {
        it("draws the bars and the line on the one log axis", async () => {
            const el = await chart({ kind: "bar", yScale: "log" });
            expect(datasetTypes(el)).toEqual(["bar", "bar", "bar", "line"]);
            expect(yTickLabels(el)).toEqual(["0", "1", "2", "5", "10", "20", "50", "100"]);
        });
    });

    describe("Scenario: stacked bars on a log axis", () => {
        afterEach(() => vi.restoreAllMocks());

        it("keeps a linear axis and warns once", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const el = await chart({ kind: "stacked-bar", series: [approved, cancelled], yScale: "log" });
            // Linear: even steps up to the highest stack (8 + 0).
            expect(yTickLabels(el)).toEqual(["0", "2", "4", "6", "8"]);
            el.series = [approved, errored];
            await settle(el);
            expect(warn.mock.calls.filter(([message]) => String(message).includes('y-scale="log"'))).toHaveLength(1);
        });
    });

    describe("Scenario: an unknown y-scale", () => {
        it("is linear", async () => {
            const el = await chart({ kind: "line", series: [wide], yScale: "cubic" });
            expect(yTickLabels(el)).toEqual(["0", "200", "400", "600", "800", "1,000"]);
        });
    });
});

describe("Feature: Workflow's activity chart", () => {
    // 28 days back and 7 ahead of today, with zeros where nothing happened.
    const days = Array.from({ length: 35 }, (_, i) => new Date(Date.UTC(2026, 9, 6 + i)).toISOString().slice(0, 10));
    const wave = (scale: number, phase: number) => days.map((_, i) => (i > 27 ? 0 : Math.max(0, Math.round(scale * (1 + Math.sin(i / 3 + phase))))));
    const workflow: UauiSeries[] = [
        seriesOf("approved", "Approved", wave(4, 0), { color: "positive" }, days),
        seriesOf("cancelled", "Cancelled", wave(1, 1), { color: "default" }, days),
        seriesOf("errored", "Errored", wave(0.6, 2), { color: "danger" }, days),
        seriesOf("pending", "Pending", days.map((_, i) => (i > 27 ? 0 : 6 + (i % 7))), { color: "warning", kind: "line" }, days),
    ];

    async function themed(themeCss?: string) {
        const theme = document.createElement("style");
        if (themeCss) {
            theme.textContent = themeCss;
            document.head.appendChild(theme);
        }
        const host = render(
            html`<div style="background: var(--uui-color-surface); width: 400px">
                <uaui-time-series-chart kind="bar" now="2026-11-02" .series=${workflow}></uaui-time-series-chart>
            </div>`,
        ).container.querySelector("div")!;
        await settle(host.querySelector("uaui-time-series-chart")!);
        return { host, theme };
    }

    let theme: HTMLStyleElement | undefined;
    afterEach(() => theme?.remove());

    screenshotIt("draws status bars, the pending line and today's line in the light theme", async () => {
        const result = await themed();
        theme = result.theme;
        await expect.element(page.elementLocator(result.host)).toMatchScreenshot("chart-workflow");
    });

    screenshotIt("draws status bars, the pending line and today's line in the dark theme", async () => {
        const result = await themed(darkCss);
        theme = result.theme;
        await expect.element(page.elementLocator(result.host)).toMatchScreenshot("chart-workflow-dark");
    });

    it("passes an a11y audit in the light theme", async () => {
        const result = await themed();
        theme = result.theme;
        expect(await axeRun(result.host)).toHaveNoViolations();
    });

    it("passes an a11y audit in the dark theme", async () => {
        const result = await themed(darkCss);
        theme = result.theme;
        expect(await axeRun(result.host)).toHaveNoViolations();
    });

    it("passes an a11y audit in the high contrast theme", async () => {
        const result = await themed(highContrastCss);
        theme = result.theme;
        expect(await axeRun(result.host)).toHaveNoViolations();
    });

    it("passes an a11y audit on a log axis with compare", async () => {
        const el = await chart({ kind: "bar", yScale: "log", now: "2026-06-02", compare: [previousApproved, previousPending] });
        expect(await axeRun(el)).toHaveNoViolations();
    });
});
