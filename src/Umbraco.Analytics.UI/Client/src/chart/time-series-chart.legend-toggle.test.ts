// Legend entries show and hide their series: visual only, per chart, with the axis, tooltip, table and shares following.
/// <reference types="vite/client" />
import { Chart } from "@umbraco/analytics-ui/external/chart.js";
import { beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQuery, deepQueryAll, deepText, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import type { UauiChartKind, UauiSeries } from "./types.js";
import "./time-series-chart.element.js";

const dates = ["2026-06-01", "2026-06-02", "2026-06-03"];
const seriesOf = (id: string, label: string, values: number[]): UauiSeries => ({
    id,
    label,
    points: dates.map((date, i) => ({ date, value: values[i] })),
});
const big = seriesOf("big", "Big", [1000, 800, 900]);
const small = seriesOf("small", "Small", [10, 20, 30]);
const third = seriesOf("third", "Third", [5, 5, 5]);
const lastBig = seriesOf("big", "Big", [700, 600, 650]);
const lastSmall = seriesOf("small", "Small", [8, 12, 20]);

type Attrs = { kind?: UauiChartKind; stack?: string; series?: UauiSeries[]; compare?: UauiSeries[]; yScale?: string };
const chart = (attrs: Attrs = {}) =>
    renderElement(
        html`<uaui-time-series-chart
            kind=${attrs.kind ?? "line"}
            stack=${attrs.stack ?? "normal"}
            y-scale=${attrs.yScale ?? "linear"}
            .series=${attrs.series ?? [big, small]}
            .compareSeries=${attrs.compare ?? []}
            compare-label="Last month"
            style="width:400px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );

const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
const legend = (el: Element) => deepQuery<UauiTestElement>(shadow(el), "uaui-chart-legend")!;
const entry = (el: Element, label: string) =>
    [...legend(el).shadowRoot!.querySelectorAll<HTMLButtonElement>("button.legend-entry")].find((b) => b.textContent!.trim() === label)!;
const toggle = async (el: Element, label: string) => {
    entry(el, label).click();
    await settle(el);
};
const tooltip = (el: Element) => shadow(el).querySelector<HTMLElement>("uaui-chart-tooltip");
const hiddenTable = (el: Element) => deepQuery<HTMLTableElement>(shadow(el), "table")!;
const headers = (el: Element) => [...hiddenTable(el).tHead!.rows[0].cells].map((c) => c.textContent!.trim());
const bodyRows = (el: Element) => [...hiddenTable(el).tBodies[0].rows].map((row) => [...row.cells].map((cell) => cell.textContent!.trim()));
const labels = (el: Element) => chartOf(el).data.datasets.map((set) => set.label);
const yMax = (el: Element) => chartOf(el).scales["y"].max;
const hover = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const { left, right } = chartOf(el).chartArea;
    const x = Math.min(Math.max(chartOf(el).getDatasetMeta(0).data[index].x, left + 1), right - 1);
    await userEvent.hover(page.elementLocator(document.body), { position: { x: 1, y: 1 } });
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
    await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
};
const tooltipRows = (el: Element) =>
    deepQueryAll<HTMLElement>(tooltip(el)!.shadowRoot!, ".tooltip-series").map((row) => row.textContent!.replace(/\s+/g, " ").trim());

describe("Feature: legend entries show and hide series", () => {
    describe("Scenario: hiding a series", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart();
            await toggle(el, "Big");
        });

        it("stops drawing it", () => {
            expect(labels(el)).toEqual(["Small"]);
        });

        it("rescales the y-axis to the series that are drawn", () => {
            expect(yMax(el)).toBeLessThan(100);
        });

        it("marks the entry as not pressed, and leaves the other pressed", () => {
            expect(entry(el, "Big").getAttribute("aria-pressed")).toBe("false");
            expect(entry(el, "Small").getAttribute("aria-pressed")).toBe("true");
        });

        it("keeps the other series' colour, as the legend's swatch shows", () => {
            const swatch = getComputedStyle(entry(el, "Small").querySelector(".legend-line")!).borderTopColor;
            expect(chartOf(el).data.datasets[0].borderColor).toBe(swatch);
        });

        it("drops it from the hidden table, so the table describes what is drawn", () => {
            expect(headers(el)).toEqual(["Date", "Small"]);
            expect(bodyRows(el)[0][1]).toBe("10");
        });

        it("drops it from the tooltip, and still names the series left", async () => {
            await hover(el, 1);
            expect(tooltipRows(el)).toHaveLength(1);
            expect(tooltipRows(el)[0]).toContain("Small");
        });

        it("doesn't change the chart's series property", () => {
            expect((el.series as UauiSeries[]).map((s) => s.id)).toEqual(["big", "small"]);
        });

        it("draws it again, and rescales the axis back, when pressed again", async () => {
            const before = yMax(el);
            await toggle(el, "Big");
            expect(labels(el)).toEqual(["Big", "Small"]);
            expect(yMax(el)).toBeGreaterThan(before);
            expect(entry(el, "Big").getAttribute("aria-pressed")).toBe("true");
        });

        it("keeps the series hidden when its data is replaced", async () => {
            el.series = [seriesOf("big", "Big", [1, 2, 3]), seriesOf("small", "Small", [3, 2, 1])];
            await settle(el);
            expect(labels(el)).toEqual(["Small"]);
        });

        it("stays hidden for this chart only", async () => {
            const other = await chart();
            expect(labels(other)).toEqual(["Big", "Small"]);
        });
    });

    describe("Scenario: bars keep their place in the palette", () => {
        it("doesn't recolour the remaining bars when an earlier series is hidden", async () => {
            const el = await chart({ kind: "stacked-bar", series: [big, small, third] });
            const before = chartOf(el).data.datasets.map((set) => set.backgroundColor);
            await toggle(el, "Big");
            expect(chartOf(el).data.datasets.map((set) => set.backgroundColor)).toEqual(before.slice(1));
        });

        it("totals only the series that are drawn", async () => {
            const el = await chart({ kind: "stacked-bar", series: [big, small, third] });
            await toggle(el, "Big");
            expect(headers(el)).toEqual(["Date", "Small", "Third", "Total"]);
            expect(bodyRows(el)[0].slice(1)).toEqual(["10", "5", "15"]);
        });
    });

    describe("Scenario: compare", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [big, small], compare: [lastBig, lastSmall] });
        });

        it("keeps the compare entry, which isn't a button", async () => {
            await toggle(el, "Big");
            expect(deepText(legend(el))).toContain("Last month");
        });

        it("drops a hidden series' compare line with it", async () => {
            await toggle(el, "Big");
            expect(labels(el).filter((label) => label === "Big")).toEqual([]);
            expect(headers(el)).toEqual(["Date", "Small", "Small (compare)"]);
        });

        it("keeps the compare entry with every series hidden", async () => {
            await toggle(el, "Big");
            await toggle(el, "Small");
            expect(deepText(legend(el))).toContain("Last month");
        });
    });

    describe("Scenario: bars compared against a total", () => {
        it("leaves a hidden series' compare out of the compare total", async () => {
            const el = await chart({ kind: "bar", series: [big, small], compare: [lastBig, lastSmall] });
            await toggle(el, "Big");
            expect(yMax(el)).toBeLessThan(100);
        });
    });

    describe("Scenario: every series hidden", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart();
            await toggle(el, "Big");
            await toggle(el, "Small");
        });

        it("keeps the chart, its legend and its axis rather than the empty state", () => {
            expect(shadow(el).querySelector("uaui-empty-state")).toBe(null);
            expect(chartOf(el).data.datasets).toHaveLength(0);
            expect(chartOf(el).data.labels).toHaveLength(3);
            expect(entry(el, "Big")).toBeTruthy();
        });

        it("shows no tooltip on hover", async () => {
            const canvas = shadow(el).querySelector("canvas")!;
            await userEvent.hover(page.elementLocator(canvas), { position: { x: 100, y: 100 } });
            expect(tooltip(el)).toBe(null);
        });

        it("brings the series back when pressed", async () => {
            await toggle(el, "Small");
            expect(labels(el)).toEqual(["Small"]);
        });

        it("passes an a11y audit", async () => {
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: log axis", () => {
        it("draws with every series hidden", async () => {
            const el = await chart({ yScale: "log" });
            await toggle(el, "Big");
            await toggle(el, "Small");
            expect(chartOf(el).data.datasets).toHaveLength(0);
        });
    });

    describe("Scenario: the share view recomputes its shares", () => {
        for (const kind of ["stacked-bar", "area"] as const) {
            it(`makes the remaining series add up to 100% (${kind})`, async () => {
                const el = await chart({ kind, stack: "percent", series: [big, small, third] });
                await toggle(el, "Big");
                const shares = chartOf(el).data.datasets.map((set) => set.data[0]);
                expect(shares[0]).toBeCloseTo(10 / 15);
                expect(shares[1]).toBeCloseTo(5 / 15);
                expect(bodyRows(el)[0].slice(1)).toEqual(["66.7% (10)", "33.3% (5)", "15"]);
                expect(chartOf(el).scales["y"].max).toBe(1);
            });
        }
    });

    describe("Scenario: from the keyboard", () => {
        it("hides a series with Tab then Enter, and keeps focus on its entry", async () => {
            const el = await chart();
            await userEvent.tab();
            expect(legend(el).shadowRoot!.activeElement).toBe(entry(el, "Big"));
            await userEvent.keyboard("{Enter}");
            await settle(el);
            expect(labels(el)).toEqual(["Small"]);
            expect(legend(el).shadowRoot!.activeElement).toBe(entry(el, "Big"));
        });
    });

    describe("Scenario: a series hidden in the fold", () => {
        it("stays hidden when the legend folds again", async () => {
            const many = Array.from({ length: 10 }, (_, i) => seriesOf(`s${i}`, `Series ${i}`, [i + 1, i + 2, i + 3]));
            const el = await chart({ series: many });
            legend(el).shadowRoot!.querySelector<HTMLButtonElement>(".legend-toggle")!.click();
            await legend(el).updateComplete;
            await toggle(el, "Series 9");
            expect(labels(el)).toHaveLength(9);
            legend(el).shadowRoot!.querySelector<HTMLButtonElement>(".legend-toggle")!.click();
            await legend(el).updateComplete;
            expect(labels(el)).toHaveLength(9);
        });
    });
});
