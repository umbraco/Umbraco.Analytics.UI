// CHT-4 — Lower is better
// A metric like refund rate or average duration: a fall is good. The gap shading and the tooltip badges follow.
import { Chart } from "chart.js";
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { deepQuery, renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";
import type { UauiDeltaBadgeElement } from "../delta-badge/delta-badge.element.js";
import type { UauiTimeSeriesChartElement } from "./time-series-chart.element.js";
import "./time-series-chart.element.js";

// Current is below last period on every date: a fall.
const current = { id: "ms", label: "Average duration", points: [
    { date: "2026-05-25", value: 60 }, { date: "2026-05-26", value: 70 }, { date: "2026-05-27", value: 80 },
] };
const previous = { id: "ms", label: "Average duration", points: [
    { date: "2026-04-25", value: 100 }, { date: "2026-04-26", value: 110 }, { date: "2026-04-27", value: 120 },
] };
const stackedA = { id: "a", label: "A", points: [{ date: "2026-05-25", value: 1 }, { date: "2026-05-26", value: 2 }] };
const stackedB = { id: "b", label: "B", points: [{ date: "2026-05-25", value: 1 }, { date: "2026-05-26", value: 1 }] };
const stackedPrevious = { id: "total", label: "Total", points: [{ date: "2026-04-25", value: 8 }, { date: "2026-04-26", value: 9 }] };

const renderChart = (lowerIsBetter: boolean, kind = "line") =>
    renderElement(
        kind === "line"
            ? html`<uaui-time-series-chart kind="line" ?lower-is-better=${lowerIsBetter} .series=${[current]} .compareSeries=${[previous]}
                  style="width:400px"></uaui-time-series-chart>`
            : html`<uaui-time-series-chart kind=${kind} ?lower-is-better=${lowerIsBetter} .series=${[stackedA, stackedB]}
                  .compareSeries=${[stackedPrevious]} style="width:400px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );

const tooltip = (el: Element) => shadow(el).querySelector("uaui-chart-tooltip") as HTMLElement;
const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
const gap = (el: Element) => (chartOf(el).data.datasets[0] as { fill?: unknown }).fill as { above: string; below: string };
const hoverDate = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const x = chartOf(el).getDatasetMeta(0).data[index].x;
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
    await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
};
const badge = (el: Element) => deepQuery(tooltip(el).shadowRoot!, "uaui-delta-badge") as UauiDeltaBadgeElement;

describe("Feature: lower is better", () => {
    describe("Scenario: the attribute", () => {
        it("reflects lower-is-better to the attribute, like uaui-kpi-tile", async () => {
            const el = (await renderChart(false)) as UauiTestElement & UauiTimeSeriesChartElement;
            el.lowerIsBetter = true;
            await el.updateComplete;
            expect(el.hasAttribute("lower-is-better")).toBe(true);
        });

        it("is off by default", async () => {
            const el = (await renderChart(false)) as UauiTestElement & UauiTimeSeriesChartElement;
            expect(el.lowerIsBetter).toBe(false);
        });
    });

    describe("Scenario: the gap between the series and its compare line", () => {
        it("shades above the compare line with the colour that is below it by default, when lower is better", async () => {
            const normal = gap(await renderChart(false));
            const flipped = gap(await renderChart(true));
            expect(flipped.above).toBe(normal.below);
        });

        it("shades below the compare line with the colour that is above it by default, when lower is better", async () => {
            const normal = gap(await renderChart(false));
            const flipped = gap(await renderChart(true));
            expect(flipped.below).toBe(normal.above);
        });

        it("flips when lower-is-better is set after the first draw", async () => {
            const el = (await renderChart(false)) as UauiTestElement & UauiTimeSeriesChartElement;
            const normal = gap(el).above;
            el.lowerIsBetter = true;
            await el.updateComplete;
            expect(gap(el).above).not.toBe(normal);
        });
    });

    describe("Scenario: hovering a date where the series fell against the compare period", () => {
        it("reads the change badge as a decline by default", async () => {
            const el = await renderChart(false);
            await hoverDate(el, 2);
            expect(badge(el).sentiment).toBe("negative");
        });

        it("reads the change badge as an improvement when lower is better", async () => {
            const el = await renderChart(true);
            await hoverDate(el, 2);
            expect(badge(el).sentiment).toBe("positive");
        });

        it("works the change out in the badge from the two values", async () => {
            const el = await renderChart(false);
            await hoverDate(el, 2);
            expect([badge(el).current, badge(el).previous]).toEqual([80, 120]);
        });
    });

    describe("Scenario: hovering a date of a stacked bar chart, whose total fell against the compare total", () => {
        it("reads the total's change badge as a decline by default", async () => {
            const el = await renderChart(false, "stacked-bar");
            await hoverDate(el, 0);
            expect(badge(el).sentiment).toBe("negative");
        });

        it("reads the total's change badge as an improvement when lower is better", async () => {
            const el = await renderChart(true, "stacked-bar");
            await hoverDate(el, 0);
            expect(badge(el).sentiment).toBe("positive");
        });
    });
});
