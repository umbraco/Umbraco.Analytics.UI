// CHT-2 — Compare with another period
// Canvas-only outcomes are checked with screenshot comparison (toMatchScreenshot): see screenshotIt.
import { Chart } from "chart.js";
/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import { render } from "vitest-browser-lit";
import { screenshotIt } from "../internal/test/screenshot.js";
import { deepQuery, deepText, renderElement, shadow, type UaxTestElement } from "../internal/test/dom.js";
import type { UaxDeltaBadgeElement } from "../delta-badge/delta-badge.element.js";
import "./time-series-chart.element.js";

const current = { id: "pv", label: "Pageviews", points: [
    { date: "2026-05-25", value: 60 }, { date: "2026-05-26", value: 90 }, { date: "2026-05-27", value: 120 },
] };
const previous = { id: "pv", label: "Pageviews", points: [
    { date: "2026-04-25", value: 50 }, { date: "2026-04-26", value: 70 }, { date: "2026-04-27", value: 110 },
] };
const compareLabel = "Apr 25, 2026 – May 24, 2026";

const renderChart = (kind = "line") =>
    renderElement(
        html`<uax-time-series-chart kind=${kind} .series=${[current]} .compareSeries=${[previous]}
            compare-label=${compareLabel} style="width:400px"></uax-time-series-chart>`,
        "uax-time-series-chart",
    );

const legendText = (el: Element) => deepText(deepQuery(shadow(el), "uax-chart-legend")!);
const tooltip = (el: Element) => shadow(el).querySelector("uax-chart-tooltip") as HTMLElement;

describe("Feature: compare with another period", () => {
    describe("Scenario: a line chart with a compare series", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderChart();
        });

        screenshotIt("draws a dashed --uax-compare line with the gap to the series shaded", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-compare-dashed-gap");
        });

        it("puts the first compare point under the first current point", () => {
            expect(deepQuery<HTMLTableElement>(shadow(el), "table")!.tBodies[0].rows[0].textContent).toMatch(/60[\s\S]*50/);
        });

        it("shows the compare range in the legend", () => {
            expect(legendText(el)).toContain(compareLabel);
        });

        it("names the compare column in the hidden table", () => {
            expect(deepQuery(shadow(el), "table thead")?.textContent).toContain("Pageviews (compare)");
        });
    });

    describe("Scenario: a line chart with a compare series in the dark theme", () => {
        let theme: HTMLStyleElement;
        let host: HTMLElement;
        beforeEach(async () => {
            theme = document.createElement("style");
            theme.textContent = darkCss;
            document.head.appendChild(theme);
            host = render(
                html`<div style="background: var(--uui-color-surface); width: 400px">
                    <uax-time-series-chart kind="line" .series=${[current]} .compareSeries=${[previous]}
                        compare-label=${compareLabel}></uax-time-series-chart>
                </div>`,
            ).container.querySelector("div")!;
            await host.querySelector("uax-time-series-chart")!.updateComplete;
        });
        afterEach(() => theme.remove());

        screenshotIt("shades the gap so it can be seen on the dark surface", async () => {
            await expect.element(page.elementLocator(host)).toMatchScreenshot("chart-compare-gap-dark");
        });
    });

    describe("Scenario: an area chart with a compare series", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderChart("area");
        });

        screenshotIt("shades the gap instead of filling under the line", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-compare-area");
        });
    });

    describe("Scenario: hovering a date while comparing", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderChart();
            const canvas = shadow(el).querySelector("canvas")!;
            const x = Chart.getChart(canvas)!.getDatasetMeta(0).data[2].x;
            await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
        });

        it("shows the current value", () => {
            expect(deepQuery(tooltip(el).shadowRoot!, ".tooltip-value")?.textContent).toBe("120");
        });

        it("shows the compare value", () => {
            expect(deepQuery(tooltip(el).shadowRoot!, ".tooltip-compare .tooltip-value")?.textContent).toBe("110");
        });

        it("names the compare point by its own date", () => {
            expect(deepQuery(tooltip(el).shadowRoot!, ".tooltip-compare .tooltip-sub")?.textContent).toMatch(/Apr.*27|27.*Apr/);
        });

        it("shows the change as a badge", () => {
            const badge = deepQuery(tooltip(el).shadowRoot!, "uax-delta-badge") as UaxDeltaBadgeElement;
            expect(badge.value).toBeCloseTo(9.09, 1);
        });
    });

    describe("Scenario: hovering a date with long series labels", () => {
        it("keeps the labels inside the tooltip", async () => {
            const long = "Pageviews from organic search, paid campaigns and direct visits";
            const el = await renderElement(
                html`<uax-time-series-chart kind="line" .series=${[{ ...current, label: long }, { ...current, id: "b", label: "Sessions" }]}
                    .compareSeries=${[previous]} compare-label=${compareLabel} style="width:400px"></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
            const canvas = shadow(el).querySelector("canvas")!;
            const x = Chart.getChart(canvas)!.getDatasetMeta(0).data[2].x;
            await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
            const label = deepQuery(tooltip(el).shadowRoot!, ".tooltip-label")!.getBoundingClientRect();
            expect(label.right).toBeLessThanOrEqual(tooltip(el).getBoundingClientRect().right);
        });
    });
    describe("Scenario: hovering a week while the compare weeks are offset", () => {
        it("shows the matched compare date", async () => {
            const weeks = { id: "pv", label: "Pageviews", points: [{ date: "2026-06-01", value: 1 }, { date: "2026-06-08", value: 2 }] };
            const before = { id: "pv", label: "Pageviews", points: [{ date: "2026-05-06", value: 5 }, { date: "2026-05-11", value: 6 }] };
            const el = await renderElement(
                html`<uax-time-series-chart kind="line" group-by="week" .series=${[weeks]} .compareSeries=${[before]}
                    style="width:400px"></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
            const canvas = shadow(el).querySelector("canvas")!;
            const x = Chart.getChart(canvas)!.getDatasetMeta(0).data[1].x;
            await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
            expect(deepQuery(tooltip(el).shadowRoot!, ".tooltip-compare .tooltip-sub")?.textContent).toMatch(/May.*11|11.*May/);
        });
    });
});
