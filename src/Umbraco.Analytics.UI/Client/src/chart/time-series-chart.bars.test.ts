// CHT-3 — Bar and stacked bar chart
// Canvas-only outcomes are checked with screenshot comparison (toMatchScreenshot): see screenshotIt.
import { Chart } from "chart.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { screenshotIt } from "../internal/test/screenshot.js";
import { renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";
import type { UaxDeltaBadgeElement } from "../delta-badge/delta-badge.element.js";
import "./time-series-chart.element.js";

const returning = { id: "r", label: "Returning visitor", points: [
    { date: "2026-06-01", value: 1 }, { date: "2026-06-02", value: 2 }, { date: "2026-06-03", value: 0 },
] };
const newVisitors = { id: "n", label: "New visitor", points: [
    { date: "2026-06-01", value: 3 }, { date: "2026-06-02", value: 1 }, { date: "2026-06-03", value: 2 },
] };
// Last period, one series per part: the compare total of a date is the sum of both.
const previousReturning = { id: "r", label: "Returning visitor", points: [
    { date: "2026-05-01", value: 1 }, { date: "2026-05-02", value: 1 }, { date: "2026-05-03", value: 1 },
] };
const previousNew = { id: "n", label: "New visitor", points: [
    { date: "2026-05-01", value: 1 }, { date: "2026-05-02", value: 2 }, { date: "2026-05-03", value: 0 },
] };
const previousTotals = { id: "total", label: "Visitors", points: [
    { date: "2026-05-01", value: 2 }, { date: "2026-05-02", value: 4 }, { date: "2026-05-03", value: 1 },
] };

const chart = (kind: string, series: unknown[], compare?: unknown[]) =>
    renderElement(
        html`<uax-time-series-chart kind=${kind} .series=${series} .compareSeries=${compare} style="width:400px"></uax-time-series-chart>`,
        "uax-time-series-chart",
    );

const tooltip = (el: Element) => shadow(el).querySelector(".tooltip") as HTMLElement;
const hiddenTable = (el: Element) => shadow(el).querySelector("table") as HTMLTableElement;
const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
// Moves the pointer onto the nth date, at the x Chart.js drew that bar.
const hoverDate = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const x = chartOf(el).getDatasetMeta(0).data[index].x;
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
    await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
};
const drawnTypes = (el: Element) => chartOf(el).getSortedVisibleDatasetMetas().map((meta) => meta.type);

describe("Feature: bar and stacked bar chart", () => {
    describe("Scenario: a bar chart", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await chart("bar", [returning]);
        });

        screenshotIt("draws each point as a bar", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-bar");
        });

        it("draws no curve or line between bars", () => {
            expect(drawnTypes(el)).toEqual(["bar"]);
        });
    });

    describe("Scenario: a bar chart with two series", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await chart("bar", [returning, newVisitors]);
        });

        it("draws the two series as bars side by side", () => {
            const [first, second] = [0, 1].map((i) => chartOf(el).getDatasetMeta(i).data[0].x);
            expect(first).toBeLessThan(second);
        });

        it("labels the series in the legend with square swatches", () => {
            expect(shadow(el).querySelectorAll(".legend .legend-swatch")).toHaveLength(2);
        });

        it("draws no legend line for a bar series", () => {
            expect(shadow(el).querySelector(".legend .legend-line")).toBeNull();
        });
    });

    describe("Scenario: a series with a palette slot", () => {
        const swatchColors = async (series: unknown[]) => {
            const el = await chart("bar", series);
            return [...shadow(el).querySelectorAll(".legend .legend-swatch")].map((s) => getComputedStyle(s).backgroundColor);
        };
        const a = { ...returning, id: "a" };
        const b = { ...returning, id: "b" };
        const c = { ...returning, id: "c" };

        it("draws with the colour of that slot", async () => {
            const [, , third] = await swatchColors([a, b, c]);
            const [withSlot] = await swatchColors([{ ...a, color: 3 }, b]);
            expect(withSlot).toBe(third);
        });

        it("takes the colour of its position when it has no slot", async () => {
            const defaults = await swatchColors([a, b]);
            const [, second] = await swatchColors([{ ...a, color: 3 }, b]);
            expect(second).toBe(defaults[1]);
        });

        it("takes the colour of its position when the slot is out of range", async () => {
            const defaults = await swatchColors([a, b]);
            const [first] = await swatchColors([{ ...a, color: 9 }, b]);
            expect(first).toBe(defaults[0]);
        });
    });

    describe("Scenario: a bar chart with two series and a compare series", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await chart("bar", [returning, newVisitors], [previousReturning, previousNew]);
        });

        it("adds a total column to the hidden table, next to the compare total", () => {
            expect([...hiddenTable(el).tHead!.rows[0].cells].map((c) => c.textContent?.trim())).toEqual([
                "Date", "Returning visitor", "New visitor", "Total", "Total (compare)",
            ]);
        });

        describe("When hovering a date", () => {
            beforeEach(async () => {
                await hoverDate(el, 0);
            });

            it("shows the total the compare total is compared against", () => {
                expect(tooltip(el).querySelector(".tooltip-total .tooltip-value")?.textContent).toBe("4");
            });

            it("shows the change from the compare total to that total", () => {
                const badge = tooltip(el).querySelector("uax-delta-badge") as UaxDeltaBadgeElement;
                expect(badge.value).toBeCloseTo(100, 5);
            });
        });
    });

    describe("Scenario: a bar chart with two series and no compare series", () => {
        it("shows no total in the hidden table", async () => {
            const el = await chart("bar", [returning, newVisitors]);
            expect(hiddenTable(el).tHead!.textContent).not.toContain("Total");
        });
    });

    describe("Scenario: a bar chart of whole numbers", () => {
        it("puts the y-axis ticks on whole numbers", async () => {
            const el = await chart("bar", [returning]);
            const scale = chartOf(el).scales["y"];
            expect(scale.ticks.map((t) => t.value).every(Number.isInteger)).toBe(true);
        });
    });

    describe("Scenario: a stacked bar chart", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await chart("stacked-bar", [returning, newVisitors]);
        });

        screenshotIt("stacks both series in one bar per date", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-stacked-bar");
        });

        it("puts both series on the same x position", () => {
            const c = chartOf(el);
            expect(c.getDatasetMeta(0).data[0].x).toBe(c.getDatasetMeta(1).data[0].x);
        });

        it("adds a total column to the hidden table", () => {
            expect(hiddenTable(el).tHead!.textContent).toContain("Total");
        });

        it("totals both series in the hidden table", () => {
            expect(hiddenTable(el).tBodies[0].rows[0].cells[3].textContent).toBe("4");
        });

        describe("When hovering a date", () => {
            beforeEach(async () => {
                await hoverDate(el, 1);
            });

            it("shows each series value", () => {
                const values = [...tooltip(el).querySelectorAll(".tooltip-series .tooltip-value")].map((v) => v.textContent);
                expect(values).toEqual(["2", "1"]);
            });

            it("shows the total", () => {
                expect(tooltip(el).querySelector(".tooltip-total .tooltip-value")?.textContent).toBe("3");
            });
        });
    });

    describe("Scenario: a stacked bar chart with a compare series", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await chart("stacked-bar", [returning, newVisitors], [previousTotals]);
        });

        screenshotIt("draws the compare total behind each current bar", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-stacked-bar-compare");
        });

        it("draws the compare bars first, so they sit behind the current bars", () => {
            expect(chartOf(el).getSortedVisibleDatasetMetas().slice(-1)[0].index).toBe(2);
        });

        it("sizes each compare bar to the compare total", () => {
            const bars = chartOf(el).getDatasetMeta(2).data as unknown as { height: number }[];
            expect(bars[1].height / bars[0].height).toBeCloseTo(2, 1);
        });

        it("names the compare range in the legend", () => {
            expect(shadow(el).querySelector(".legend")?.textContent).toContain("Comparison");
        });
    });

    describe("Scenario: compare series that are split into parts", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await chart("stacked-bar", [returning, newVisitors], [previousReturning, previousNew]);
        });

        it("sums the compare series of each date into one compare total", () => {
            const cells = [...hiddenTable(el).tBodies[0].rows].map((row) => row.cells[row.cells.length - 1].textContent);
            expect(cells).toEqual(["2", "3", "1"]);
        });

        it("names the compare total column in the hidden table", () => {
            expect(hiddenTable(el).tHead!.textContent).toContain("Total (compare)");
        });

        describe("When hovering a date", () => {
            beforeEach(async () => {
                await hoverDate(el, 1);
            });

            it("shows the compare total", () => {
                expect(tooltip(el).querySelector(".tooltip-compare .tooltip-value")?.textContent).toBe("3");
            });

            it("shows the change from the compare total to the current total", () => {
                const badge = tooltip(el).querySelector("uax-delta-badge") as UaxDeltaBadgeElement;
                expect(badge.value).toBeCloseTo(0, 5);
            });
        });
    });

    describe("Scenario: changing the kind", () => {
        it("redraws a line chart as bars", async () => {
            const el = await chart("line", [returning, newVisitors]);
            el.setAttribute("kind", "stacked-bar");
            await el.updateComplete;
            await expect.poll(() => drawnTypes(el)).toEqual(["bar", "bar"]);
        });

        it("redraws bars as a line chart", async () => {
            const el = await chart("stacked-bar", [returning, newVisitors]);
            el.setAttribute("kind", "line");
            await el.updateComplete;
            await expect.poll(() => drawnTypes(el)).toEqual(["line", "line"]);
        });
    });

    describe("Scenario: a stacked bar chart with a compare series in the dark theme", () => {
        let theme: HTMLStyleElement;
        let host: HTMLElement;
        beforeEach(async () => {
            theme = document.createElement("style");
            theme.textContent = darkCss;
            document.head.appendChild(theme);
            host = render(
                html`<div style="background: var(--uui-color-surface); width: 400px">
                    <uax-time-series-chart kind="stacked-bar" .series=${[returning, newVisitors]}
                        .compareSeries=${[previousTotals]}></uax-time-series-chart>
                </div>`,
            ).container.querySelector("div")!;
            await host.querySelector("uax-time-series-chart")!.updateComplete;
        });
        afterEach(() => theme.remove());

        screenshotIt("draws the compare bar visibly on the dark surface", async () => {
            await expect.element(page.elementLocator(host)).toMatchScreenshot("chart-stacked-bar-compare-dark");
        });
    });

    describe("Scenario: a11y audit", () => {
        // Renders the chart on the surface, optionally under a UUI theme.
        async function audit(kind: string, themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); width: 400px">
                        <uax-time-series-chart kind=${kind} .series=${[returning, newVisitors]}
                            .compareSeries=${[previousTotals]}></uax-time-series-chart>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uax-time-series-chart")!.updateComplete;
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        it("passes for stacked bars in the light theme", async () => {
            expect(await audit("stacked-bar")).toHaveNoViolations();
        });

        it("passes for stacked bars in the dark theme", async () => {
            expect(await audit("stacked-bar", darkCss)).toHaveNoViolations();
        });

        it("passes for stacked bars in the high contrast theme", async () => {
            expect(await audit("stacked-bar", highContrastCss)).toHaveNoViolations();
        });

        it("passes for bars in the light theme", async () => {
            expect(await audit("bar")).toHaveNoViolations();
        });
    });
});
