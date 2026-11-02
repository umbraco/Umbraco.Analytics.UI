/// <reference types="vite/client" />
// T56 — The custom chart example (a product's own doughnut on the shared Chart.js) in the package's look.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import { Chart, uauiChartColors, type ArcElement } from "@umbraco/analytics-ui/external/chart.js";
import { axeRun } from "../internal/test/a11y.js";
import { renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./custom-chart.story.js";

const slices = [
    { label: "Desktop", value: 5820 },
    { label: "Mobile", value: 4310 },
    { label: "Tablet", value: 960 },
];

describe("Feature: the custom chart example", () => {
    let el: UauiTestElement;
    let chart: Chart<"doughnut">;
    beforeEach(async () => {
        el = await renderElement(
            html`<example-device-doughnut label="Visitors by device" .slices=${slices}></example-device-doughnut>`,
            "example-device-doughnut",
        );
        chart = Chart.getChart(shadow(el).querySelector("canvas")!) as Chart<"doughnut">;
    });

    it("has no accessibility violations", async () => {
        expect(await axeRun(el)).toHaveNoViolations();
    });

    it("colours the slices with the package's series colours", () => {
        const colors = uauiChartColors(el);
        expect(chart.data.datasets[0].backgroundColor).toEqual(slices.map((_, i) => colors.series[i].bar));
    });

    it("draws in the package look: no axes, legend off, surface hairlines between slices", () => {
        const colors = uauiChartColors(el);
        expect(Object.keys(chart.scales)).toEqual([]);
        expect(chart.options.plugins?.legend?.display).toBe(false);
        expect((chart.getDatasetMeta(0).data[0] as ArcElement).options.borderColor).toBe(colors.surface);
    });

    describe("Scenario: the theme changes", () => {
        let theme: HTMLStyleElement;
        afterEach(() => theme.remove());

        it("recolours the slices", async () => {
            theme = document.createElement("style");
            theme.textContent = darkCss;
            document.head.appendChild(theme);
            const dark = uauiChartColors(el);
            await expect.poll(() => chart.data.datasets[0].backgroundColor).toEqual(slices.map((_, i) => dark.series[i].bar));
        });
    });

    it("stops and destroys the chart when disconnected, and draws again when reconnected", async () => {
        const canvas = shadow(el).querySelector("canvas")!;
        const parent = el.parentElement!;
        el.remove();
        expect(Chart.getChart(canvas)).toBeUndefined();
        parent.appendChild(el);
        await el.updateComplete;
        expect(Chart.getChart(shadow(el).querySelector("canvas")!)).toBeDefined();
    });
});
