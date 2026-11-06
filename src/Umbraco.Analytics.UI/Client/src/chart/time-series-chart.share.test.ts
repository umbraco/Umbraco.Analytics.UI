// T59 — 100% share view: each date's series as its share of that date's total (`stack="percent"`).
// Canvas-only outcomes are checked with screenshot comparison (toMatchScreenshot): see screenshotIt.
import { Chart, uauiChartColors } from "@umbraco/analytics-ui/external/chart.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { screenshotIt } from "../internal/test/screenshot.js";
import { deepQuery, deepQueryAll, deepText, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import type { UauiChartKind, UauiSeries } from "./types.js";
import "./time-series-chart.element.js";

const dates = ["2026-06-01", "2026-06-02", "2026-06-03"];
const seriesOf = (id: string, label: string, values: (number | undefined)[], extra: Partial<UauiSeries> = {}): UauiSeries => ({
    id,
    label,
    points: dates.flatMap((date, i) => (values[i] === undefined ? [] : [{ date, value: values[i]! }])),
    ...extra,
});

// 2 Jun has no entries at all: its total is 0, so it has no shares.
const home = seriesOf("home", "Home", [30, 0, 10]);
const events = seriesOf("events", "Events", [10, 0, 30]);
const blog = seriesOf("blog", "Blog", [10, 0, undefined]);
const pages = [home, events, blog];

/** A week for the screenshots: the bands need dates either side of the empty one (the 4th, with no entries). */
const week = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-04", "2026-06-05", "2026-06-06", "2026-06-07"];
const weekOf = (id: string, label: string, values: number[]): UauiSeries => ({ id, label, points: week.map((date, i) => ({ date, value: values[i] })) });
const weekPages = [
    weekOf("home", "Home", [30, 24, 18, 0, 22, 26, 20]),
    weekOf("events", "Events", [10, 16, 20, 0, 18, 12, 24]),
    weekOf("blog", "Blog", [10, 8, 12, 0, 6, 10, 8]),
];

const chart = (attrs: { kind: UauiChartKind; stack?: string; series?: UauiSeries[]; compare?: UauiSeries[]; yScale?: string }) =>
    renderElement(
        html`<uaui-time-series-chart
            kind=${attrs.kind}
            stack=${attrs.stack ?? "percent"}
            y-scale=${attrs.yScale ?? "linear"}
            .series=${attrs.series ?? pages}
            .compareSeries=${attrs.compare ?? []}
            style="width:400px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );

const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
const tooltip = (el: Element) => shadow(el).querySelector("uaui-chart-tooltip") as HTMLElement;
const hiddenTable = (el: Element) => deepQuery<HTMLTableElement>(shadow(el), "table")!;
const bodyRows = (el: Element) => [...hiddenTable(el).tBodies[0].rows].map((row) => [...row.cells].map((cell) => cell.textContent!.trim()));
const hoverDate = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    // Inside the plot: the first date sits on its left edge, which a whole-pixel pointer can miss.
    const { left, right } = chartOf(el).chartArea;
    const x = Math.min(Math.max(chartOf(el).getDatasetMeta(0).data[index].x, left + 1), right - 1);
    // The pointer may already be where the last spec left it, which raises no move: start from outside the canvas.
    await userEvent.hover(page.elementLocator(document.body), { position: { x: 1, y: 1 } });
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
    await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
};
const tooltipRows = (el: Element) =>
    deepQueryAll<HTMLElement>(tooltip(el).shadowRoot!, ".tooltip-series").map((row) =>
        [".tooltip-value", ".tooltip-label", ".tooltip-amount"].map((s) => row.querySelector(s)?.textContent?.trim() ?? ""),
    );
const warnings = (warn: { mock: { calls: unknown[][] } }, text: string) => warn.mock.calls.filter(([message]) => String(message).includes(text));

describe("Feature: 100% share view", () => {
    for (const kind of ["stacked-bar", "area"] as const) {
        describe(`Scenario: stack="percent" with kind="${kind}"`, () => {
            let el: UauiTestElement;
            beforeEach(async () => {
                el = await chart({ kind });
            });

            it("reflects stack to its attribute", () => {
                expect(el.getAttribute("stack")).toBe("percent");
            });

            it("draws each value as its share of its date's total", () => {
                const c = chartOf(el);
                expect(c.data.datasets.map((set) => set.data[0])).toEqual([0.6, 0.2, 0.2]);
                // Blog has no point on 3 Jun: no segment in stacked bars, a band of no thickness in an area (see below).
                expect(c.data.datasets.map((set) => set.data[2])).toEqual([0.25, 0.75, kind === "area" ? 0 : null]);
            });

            it("stacks every series on one y-axis from 0 to 100%", () => {
                const y = chartOf(el).options.scales!["y"] as { stacked?: boolean; min?: number; max?: number };
                expect(y).toMatchObject({ stacked: true, min: 0, max: 1 });
                expect(chartOf(el).scales["y"].ticks.map((t) => t.label)).toEqual(["0%", "25%", "50%", "75%", "100%"]);
            });

            it("draws nothing on a date whose total is 0, rather than NaN", () => {
                const day2 = chartOf(el).data.datasets.map((set) => set.data[1]);
                expect(day2).toEqual([null, null, null]);
            });

            it("shows each share with its value in the hidden table, and the total", () => {
                expect(hiddenTable(el).caption!.textContent!.trim()).toBe("Chart data (each value with its share of the date's total)");
                expect([...hiddenTable(el).tHead!.rows[0].cells].map((c) => c.textContent!.trim())).toEqual(["Date", "Home", "Events", "Blog", "Total"]);
                expect(bodyRows(el)[0].slice(1)).toEqual(["60% (30)", "20% (10)", "20% (10)", "50"]);
                expect(bodyRows(el)[1].slice(1)).toEqual(["0", "0", "0", "0"]);
                expect(bodyRows(el)[2].slice(1)).toEqual(["25% (10)", "75% (30)", "No data", "40"]);
            });

            it("shows each share, its label and its value in the tooltip, and the total", async () => {
                await hoverDate(el, 0);
                // Stack order, top first: the last series is on top.
                expect(tooltipRows(el)).toEqual([
                    ["20%", "Blog", "10"],
                    ["20%", "Events", "10"],
                    ["60%", "Home", "30"],
                ]);
                expect(deepText(deepQuery(tooltip(el).shadowRoot!, ".tooltip-total")!)).toContain("50");
            });

            it("uses square swatches in the bar colours in the legend", () => {
                expect(deepQueryAll(shadow(el), ".legend-swatch")).toHaveLength(3);
            });

            it("passes an a11y audit", async () => {
                expect(await axeRun(el)).toHaveNoViolations();
            });
        });
    }

    describe("Scenario: hovering a date whose total is 0", () => {
        it("shows the values without a share", async () => {
            const el = await chart({ kind: "stacked-bar", series: [seriesOf("a", "A", [1, 0, 1]), seriesOf("b", "B", [1, 0, 1])] });
            const canvas = shadow(el).querySelector("canvas")!;
            const x = chartOf(el).scales["x"].getPixelForValue(1);
            await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
            expect(tooltipRows(el)).toEqual([
                ["0", "B", ""],
                ["0", "A", ""],
            ]);
        });
    });

    describe("Scenario: an area share view", () => {
        it("fills each band down to the one below, the first to the axis", async () => {
            const el = await chart({ kind: "area" });
            expect(chartOf(el).data.datasets.map((set) => (set as { fill?: unknown }).fill)).toEqual(["origin", "-1", "-1"]);
        });

        it("leaves a date with no total empty rather than bridging it", async () => {
            const el = await chart({ kind: "area" });
            expect(chartOf(el).data.datasets.every((set) => (set as { spanGaps?: unknown }).spanGaps === false)).toBe(true);
        });
    });

    describe("Scenario: values below 0", () => {
        it("counts them as 0 in the share and the total, and shows them as they are in the table", async () => {
            const el = await chart({ kind: "stacked-bar", series: [seriesOf("a", "A", [3, 1, 1]), seriesOf("b", "B", [-1, 1, 1])] });
            expect(chartOf(el).data.datasets.map((set) => set.data[0])).toEqual([1, 0]);
            // The total is 3, not 2: the shares add up to it.
            expect(bodyRows(el)[0].slice(1)).toEqual(["100% (3)", "0% (-1)", "3"]);
        });
    });

    describe("Scenario: a series with no point on a date that has a total", () => {
        // Events has no point on 2 Jun, between Home and Blog, while the date has a total.
        const sparse = [seriesOf("home", "Home", [30, 20, 10]), seriesOf("events", "Events", [10, undefined, 30]), seriesOf("blog", "Blog", [10, 20, 10])];

        it("draws its area band at 0 there, so the band above has no hole", async () => {
            const el = await chart({ kind: "area", series: sparse });
            expect(chartOf(el).data.datasets.map((set) => set.data[1])).toEqual([0.5, 0, 0.5]);
        });

        it("fills the band above down to it: the band above covers the plot there", async () => {
            const el = await chart({ kind: "area", series: sparse });
            const c = chartOf(el);
            const x = Math.round(c.scales["x"].getPixelForValue(1));
            // Halfway up Blog's band (50% to 100%) on 2 Jun, a canvas pixel in Blog's bar colour, not the surface.
            const y = Math.round(c.scales["y"].getPixelForValue(0.75));
            const ratio = c.currentDevicePixelRatio;
            const [r, g, b] = c.ctx.getImageData(x * ratio, y * ratio, 1, 1).data;
            expect(`rgb(${r}, ${g}, ${b})`).toBe(uauiChartColors(el).series[2].bar);
        });

        it("says No data for it in the hidden table", async () => {
            const el = await chart({ kind: "area", series: sparse });
            expect(bodyRows(el)[1].slice(1)).toEqual(["50% (20)", "No data", "50% (20)", "40"]);
        });

        it("says No data for it in the tooltip, with no share or amount", async () => {
            const el = await chart({ kind: "area" });
            // Blog has no point on 3 Jun; the stack lists it first, on top.
            await hoverDate(el, 2);
            expect(tooltipRows(el)[0]).toEqual(["No data", "Blog", ""]);
        });

        it("leaves stacked bars as they are: no segment, no 0", async () => {
            const el = await chart({ kind: "stacked-bar", series: sparse });
            expect(chartOf(el).data.datasets.map((set) => set.data[1])).toEqual([0.5, null, 0.5]);
        });
    });

    describe("Scenario: switching stack back to normal", () => {
        it("draws the values again", async () => {
            const el = await chart({ kind: "stacked-bar" });
            el.setAttribute("stack", "normal");
            await settle(el);
            await expect.poll(() => chartOf(el).data.datasets[0].data[0]).toBe(30);
        });
    });

    describe("Scenario: what the share view ignores", () => {
        let warn: ReturnType<typeof vi.spyOn>;
        beforeEach(() => {
            warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        });
        afterEach(() => warn.mockRestore());

        for (const kind of ["line", "bar"] as const) {
            it(`ignores stack="percent" with kind="${kind}" and warns once`, async () => {
                const el = await chart({ kind });
                expect(chartOf(el).data.datasets[0].data[0]).toBe(30);
                (el as unknown as { requestUpdate: (name: string) => void }).requestUpdate("series");
                await settle(el);
                expect(warnings(warn, 'stack="percent" is ignored')).toHaveLength(1);
            });
        }

        it("draws no compare and warns once", async () => {
            const previous = [seriesOf("home", "Home", [5, 5, 5])];
            const el = await chart({ kind: "stacked-bar", compare: previous });
            expect(chartOf(el).data.datasets).toHaveLength(3);
            expect(deepText(deepQuery(shadow(el), "uaui-chart-legend")!)).not.toContain("Comparison");
            expect(hiddenTable(el).tHead!.textContent).not.toContain("(compare)");
            expect(warnings(warn, "compare-series is not drawn")).toHaveLength(1);
        });

        it("keeps a linear axis with y-scale log and warns once", async () => {
            const el = await chart({ kind: "area", yScale: "log" });
            expect(chartOf(el).data.datasets[0].data[0]).toBe(0.6);
            expect(warnings(warn, 'y-scale="log" is ignored with stack="percent"')).toHaveLength(1);
            expect(warnings(warn, 'kind="stacked-bar"')).toHaveLength(0);
        });

        it("draws a series with its own kind as the chart's kind, and warns once", async () => {
            const el = await chart({ kind: "stacked-bar", series: [home, { ...events, kind: "line" }] });
            expect(chartOf(el).getSortedVisibleDatasetMetas().map((meta) => meta.type)).toEqual(["bar", "bar"]);
            expect(warnings(warn, "a series' own kind is ignored")).toHaveLength(1);
        });
    });

    describe("Scenario: screenshots", () => {
        let theme: HTMLStyleElement | undefined;
        afterEach(() => theme?.remove());

        async function themed(kind: UauiChartKind, themeCss?: string) {
            theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            const host = render(
                html`<div style="background: var(--uui-color-surface); width: 400px">
                    <uaui-time-series-chart kind=${kind} stack="percent" .series=${weekPages}></uaui-time-series-chart>
                </div>`,
            ).container.querySelector("div")!;
            await settle(host.querySelector("uaui-time-series-chart")!);
            return host;
        }

        screenshotIt("draws stacked bars to 100%, with an empty date where the total is 0", async () => {
            await expect.element(page.elementLocator(await themed("stacked-bar"))).toMatchScreenshot("chart-share-stacked-bar");
        });

        screenshotIt("draws stacked bands to 100% in the light theme", async () => {
            await expect.element(page.elementLocator(await themed("area"))).toMatchScreenshot("chart-share-area");
        });

        screenshotIt("draws stacked bands to 100% in the dark theme", async () => {
            await expect.element(page.elementLocator(await themed("area", darkCss))).toMatchScreenshot("chart-share-area-dark");
        });

        it("passes an a11y audit in the dark theme", async () => {
            expect(await axeRun(await themed("area", darkCss))).toHaveNoViolations();
        });

        it("passes an a11y audit in the high contrast theme", async () => {
            expect(await axeRun(await themed("stacked-bar", highContrastCss))).toHaveNoViolations();
        });
    });
});
