// FND-3 — Empty and loading states (AC2 to AC6 on the chart), plus the chart's own plumbing:
// accessibility, cleanup on disconnect and redrawing when the theme changes.
/// <reference types="vite/client" />
import { Chart } from "chart.js";
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQuery, renderElement, shadow, type UaxTestElement } from "../internal/test/dom.js";
import "./time-series-chart.element.js";

const series = [
    {
        id: "pv",
        label: "Pageviews",
        points: [
            { date: "2026-06-01", value: 40 },
            { date: "2026-06-02", value: 120 },
            { date: "2026-06-03", value: 280 },
        ],
    },
];
const canvas = (el: Element) => shadow(el).querySelector("canvas")!;

describe("Feature: chart empty and loading states", () => {
    describe("Scenario: no data and no text set", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-time-series-chart .series=${[]}></uax-time-series-chart>`, "uax-time-series-chart");
        });

        it("shows the empty state with the default text", () => {
            expect(shadow(el).querySelector("uax-empty-state")?.shadowRoot?.textContent).toContain("No data yet");
        });
    });

    describe("Scenario: no data, with the product's text", () => {
        it("passes the text to the empty state", async () => {
            const el = await renderElement(
                html`<uax-time-series-chart .series=${[]} empty-headline="No pageviews yet"></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
            expect(shadow(el).querySelector("uax-empty-state")?.shadowRoot?.textContent).toContain("No pageviews yet");
        });
    });

    describe("Scenario: first load", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-time-series-chart loading .series=${[]}></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
        });

        it("shows a skeleton", () => {
            expect(shadow(el).querySelector("uax-skeleton")).not.toBe(null);
        });

        it("shows no empty state", () => {
            expect(shadow(el).querySelector("uax-empty-state")).toBe(null);
        });

        it("takes the height of the loaded chart", async () => {
            const loadingHeight = el.getBoundingClientRect().height;
            el.series = series;
            el.loading = false;
            await el.updateComplete;
            expect(el.getBoundingClientRect().height).toBe(loadingHeight);
        });
    });

    describe("Scenario: reloading with data shown", () => {
        let el: UaxTestElement;
        let chart: Chart | undefined;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-time-series-chart .series=${series}></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
            chart = Chart.getChart(canvas(el));
            el.loading = true;
            await el.updateComplete;
        });

        it("keeps the old data visible", () => {
            expect(shadow(el).querySelector(".plot")!.hasAttribute("hidden")).toBe(false);
        });

        it("shows a loading bar", () => {
            expect(shadow(el).querySelector("uax-loading-bar")).not.toBe(null);
        });

        it("shows no skeleton", () => {
            expect(shadow(el).querySelector("uax-skeleton")).toBe(null);
        });

        it("puts the loading bar on the top edge", () => {
            expect(shadow(el).querySelector("uax-loading-bar")!.getBoundingClientRect().top).toBe(el.getBoundingClientRect().top);
        });

        it("spans the loading bar across the full width, ignoring the padding", () => {
            expect(shadow(el).querySelector("uax-loading-bar")!.getBoundingClientRect().width).toBe(el.getBoundingClientRect().width);
        });

        it("keeps the same chart instead of building a new one", () => {
            expect(Chart.getChart(canvas(el))).toBe(chart);
        });
    });
});

describe("Feature: chart accessibility and cleanup", () => {
    let el: UaxTestElement;
    beforeEach(async () => {
        el = await renderElement(
            html`<uax-time-series-chart .series=${series}></uax-time-series-chart>`,
            "uax-time-series-chart",
        );
    });

    it("hides the canvas from assistive tech", () => {
        expect(canvas(el).getAttribute("aria-hidden")).toBe("true");
    });

    it("labels the chart region", () => {
        expect(shadow(el).querySelector("[role='figure']")!.getAttribute("aria-label")).toBe("Chart");
    });

    it("captions the data table", () => {
        expect(deepQuery(shadow(el), "caption")!.textContent!.trim()).toBe("Chart data");
    });

    it("destroys the chart when disconnected", () => {
        const c = canvas(el);
        el.remove();
        expect(Chart.getChart(c)).toBeUndefined();
    });

    it("draws again when reconnected", async () => {
        const parent = el.parentElement!;
        el.remove();
        parent.appendChild(el);
        await el.updateComplete;
        expect(Chart.getChart(canvas(el))).toBeDefined();
    });

    it("redraws with the new colours when the theme changes", async () => {
        const before = canvas(el).toDataURL();
        const theme = document.createElement("style");
        theme.textContent = darkCss;
        document.head.appendChild(theme);
        try {
            await expect.poll(() => canvas(el).toDataURL()).not.toBe(before);
        } finally {
            theme.remove();
        }
    });

    describe("Scenario: a11y audit", () => {
        // Renders the chart on the surface, optionally under a UUI theme.
        async function audit(themeCss?: string, compare = false) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); width: 400px">
                        <uax-time-series-chart
                            .series=${[...series, { ...series[0], id: "b", label: "Sessions" }]}
                            .compareSeries=${compare ? [{ ...series[0], id: "pv" }] : []}
                            compare-label=${compare ? "Previous period" : ""}></uax-time-series-chart>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uax-time-series-chart")!.updateComplete;
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        it("passes in the light theme", async () => {
            expect(await audit()).toHaveNoViolations();
        });

        it("passes in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });

        it("passes in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });

        it("passes with a compare series in the light theme", async () => {
            expect(await audit(undefined, true)).toHaveNoViolations();
        });

        it("passes with a compare series in the dark theme", async () => {
            expect(await audit(darkCss, true)).toHaveNoViolations();
        });

        it("passes with a compare series in the high contrast theme", async () => {
            expect(await audit(highContrastCss, true)).toHaveNoViolations();
        });
    });
});
