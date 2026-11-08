// CHT-7 — The package's look for a product's own Chart.js charts (`uauiChartColors`, `uauiChartOptions`,
// `uauiWatchTheme` from `@umbraco/analytics-ui/external/chart.js`).
/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { css, html, LitElement } from "#platform/lit";
import lightCss from "@umbraco-ui/uui/themes/light.css?inline";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import {
    ArcElement,
    CategoryScale,
    Chart,
    DoughnutController,
    LinearScale,
    LineController,
    LineElement,
    PointElement,
    uauiChartColors,
    uauiChartOptions,
    uauiWatchTheme,
    type CartesianScaleOptions,
    type UauiChartColors,
} from "@umbraco/analytics-ui/external/chart.js";
import { UauiPaletteStyles } from "../../theme/index.js";
import { renderElement, type UauiTestElement } from "../../internal/test/dom.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, DoughnutController, ArcElement);

/** A product's own chart element: the palette in its styles and a canvas. */
class TestProductChartElement extends LitElement {
    override render() {
        return html`<div class="canvas"><canvas></canvas></div>`;
    }

    static override styles = [
        UauiPaletteStyles,
        css`
            :host {
                display: block;
            }
            .canvas {
                position: relative;
                width: 300px;
                height: 160px;
            }
        `,
    ];
}
customElements.define("test-product-chart", TestProductChartElement);

/** The same, without the palette. */
class TestBareElement extends LitElement {
    override render() {
        return html`<span></span>`;
    }
}
customElements.define("test-bare-element", TestBareElement);

const themes = { light: lightCss, dark: darkCss, "high contrast": highContrastCss };

const renderHost = (style = "") =>
    renderElement(html`<div style=${style}><test-product-chart></test-product-chart></div>`, "test-product-chart");

/** `value` applied as the host's `color` and read back: how the host itself resolves it. */
const resolved = (host: HTMLElement, value: string) => {
    host.style.color = value;
    const color = getComputedStyle(host).color;
    host.style.color = "";
    return color;
};

const canvasOf = (host: HTMLElement) => host.shadowRoot!.querySelector("canvas")!;

/** A drawn axis' resolved options. */
const axis = (chart: Pick<Chart, "scales">, id: string) => chart.scales[id].options as unknown as CartesianScaleOptions;

const lineChart = (host: HTMLElement, colors: UauiChartColors, options = uauiChartOptions(host, "line", colors)) =>
    new Chart(canvasOf(host), {
        type: "line",
        data: { labels: ["a", "b", "c"], datasets: [{ data: [1, 3, 2], borderColor: colors.series[0].line }] },
        options,
    });

describe("Feature: the package's look for a product's own chart", () => {
    let themeStyle: HTMLStyleElement;
    beforeEach(() => {
        themeStyle = document.createElement("style");
        themeStyle.textContent = lightCss;
        document.head.appendChild(themeStyle);
    });
    afterEach(() => themeStyle.remove());

    for (const [theme, themeCss] of Object.entries(themes)) {
        describe(`Scenario: uauiChartColors in the ${theme} theme`, () => {
            let host: UauiTestElement;
            let colors: UauiChartColors;
            beforeEach(async () => {
                themeStyle.textContent = themeCss;
                host = await renderHost();
                colors = uauiChartColors(host);
            });

            it("gives the eight series slots in order, as the palette resolves them", () => {
                expect(colors.series).toHaveLength(8);
                colors.series.forEach((slot, i) => {
                    expect(slot.line).toBe(resolved(host, `var(--uaui-color-series-${i + 1})`));
                    expect(slot.bar).toBe(resolved(host, `var(--uaui-color-bar-${i + 1})`));
                    expect(slot.fill).toBe(resolved(host, `color-mix(in srgb, var(--uaui-color-fill-${i + 1}) 12%, transparent)`));
                });
            });

            it("gives the four status colours, as the palette resolves them (T57)", () => {
                expect(Object.keys(colors.status)).toEqual(["default", "positive", "warning", "danger"]);
                for (const [status, shades] of Object.entries(colors.status)) {
                    expect(shades.line).toBe(resolved(host, `var(--uaui-color-series-${status})`));
                    expect(shades.bar).toBe(resolved(host, `var(--uaui-color-bar-${status})`));
                    expect(shades.fill).toBe(resolved(host, `color-mix(in srgb, var(--uaui-color-fill-${status}) 12%, transparent)`));
                }
            });

            it("gives the compare, grid, text and surface colours", () => {
                expect(colors.compare).toBe(resolved(host, "var(--uaui-color-compare)"));
                expect(colors.compareBar).toBe(resolved(host, "var(--uaui-color-compare-bar)"));
                expect(colors.grid).toBe(resolved(host, "var(--uui-color-divider-standalone)"));
                expect(colors.text).toBe(resolved(host, "var(--uui-color-text-alt)"));
                expect(colors.surface).toBe(resolved(host, "var(--uui-color-surface)"));
            });

            it("gives real colours, not the light-dark() tokens", () => {
                for (const value of [colors.series[0].line, colors.compare, colors.grid, colors.text]) {
                    expect(value).toMatch(/^(rgb|color)\(/);
                }
            });

            it("gives the host's font family", () => {
                expect(colors.fontFamily).toBe(getComputedStyle(host).fontFamily);
                expect(colors.fontFamily).not.toBe("");
            });

            it("leaves no probe behind", () => {
                expect(host.shadowRoot!.querySelectorAll("span")).toHaveLength(0);
            });
        });
    }

    describe("Scenario: switching theme", () => {
        it("gives different series 1 and surface colours in light and dark", async () => {
            const host = await renderHost();
            const light = uauiChartColors(host);
            themeStyle.textContent = darkCss;
            const dark = uauiChartColors(host);
            expect(dark.series[0].line).not.toBe(light.series[0].line);
            expect(dark.surface).not.toBe(light.surface);
        });
    });

    describe("Scenario: a product overrides --uaui-series-1 on an ancestor", () => {
        it("gives the override for slot 1", async () => {
            const host = await renderHost("--uaui-series-1: rgb(1, 2, 3)");
            expect(uauiChartColors(host).series[0].line).toBe("rgb(1, 2, 3)");
        });
    });

    describe("Scenario: a product overrides --uaui-series-danger on an ancestor", () => {
        it("gives the override for the danger status", async () => {
            const host = await renderHost("--uaui-series-danger: rgb(1, 2, 3)");
            expect(uauiChartColors(host).status.danger.line).toBe("rgb(1, 2, 3)");
        });
    });

    describe("Scenario: a host without UauiPaletteStyles", () => {
        it("warns once that the palette is missing", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            try {
                const host = await renderElement(html`<test-bare-element></test-bare-element>`, "test-bare-element");
                uauiChartColors(host);
                uauiChartColors(host);
                expect(warn).toHaveBeenCalledTimes(1);
                expect(String(warn.mock.calls[0][0])).toContain("UauiPaletteStyles");
            } finally {
                warn.mockRestore();
            }
        });
    });

    describe("Scenario: uauiChartOptions for a line chart", () => {
        let host: UauiTestElement;
        let colors: UauiChartColors;
        beforeEach(async () => {
            host = await renderHost();
            colors = uauiChartColors(host);
        });

        it("is responsive, fills its box, doesn't animate and has the legend and title off", () => {
            const options = uauiChartOptions(host, "line", colors);
            expect(options).toMatchObject({
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: { legend: { display: false }, title: { display: false }, subtitle: { display: false } },
            });
            expect(options.events).toEqual(["mousemove", "mouseout", "click", "touchstart", "touchmove"]);
        });

        it("styles x and y as uaui-time-series-chart does", () => {
            const font = { family: colors.fontFamily, size: 11, style: "normal", weight: "normal", lineHeight: 1.2 };
            const { scales } = uauiChartOptions(host, "line", colors);
            expect(scales?.x).toMatchObject({
                position: "bottom",
                grid: { display: false },
                border: { display: true, color: colors.grid, width: 1 },
                ticks: { color: colors.text, font, padding: 3 },
            });
            expect(scales?.y).toMatchObject({
                position: "left",
                grid: { display: true, color: colors.grid, drawTicks: false },
                border: { display: false },
                ticks: { color: colors.text, font, padding: 8 },
            });
        });

        it("resolves the colours itself when none are passed", () => {
            expect(uauiChartOptions(host, "line")).toEqual(uauiChartOptions(host, "line", colors));
        });

        it("returns a new object each call", () => {
            const a = uauiChartOptions(host, "line", colors);
            const b = uauiChartOptions(host, "line", colors);
            expect(a).not.toBe(b);
            expect(a.plugins).not.toBe(b.plugins);
            expect(a.scales?.x).not.toBe(b.scales?.x);
        });
    });

    describe("Scenario: uauiChartOptions for charts without x and y", () => {
        it("gives a doughnut no scales, so Chart.js draws no axes", async () => {
            const host = await renderHost();
            expect(uauiChartOptions(host, "doughnut")).not.toHaveProperty("scales");
            expect(uauiChartOptions(host, "pie")).not.toHaveProperty("scales");
        });

        it("gives a radar chart its one radial axis", async () => {
            const host = await renderHost();
            expect(Object.keys(uauiChartOptions(host, "radar").scales ?? {})).toEqual(["r"]);
        });

        it("draws a doughnut with no axes", async () => {
            const host = await renderHost();
            const chart = new Chart(canvasOf(host), {
                type: "doughnut",
                data: { labels: ["a", "b"], datasets: [{ data: [1, 2] }] },
                options: uauiChartOptions(host, "doughnut"),
            });
            try {
                expect(Object.keys(chart.scales)).toEqual([]);
            } finally {
                chart.destroy();
            }
        });
    });

    describe("Scenario: another product changed Chart.defaults", () => {
        const saved = {
            family: Chart.defaults.font.family,
            size: Chart.defaults.font.size,
            color: Chart.defaults.color,
            borderColor: Chart.defaults.borderColor,
            animation: Chart.defaults.animation,
            responsive: Chart.defaults.responsive,
        };
        beforeEach(() => {
            Chart.defaults.font.family = "Comic Sans MS";
            Chart.defaults.font.size = 40;
            Chart.defaults.color = "rgb(255, 0, 0)";
            Chart.defaults.borderColor = "rgb(0, 255, 0)";
            Chart.defaults.responsive = false;
        });
        afterEach(() => {
            Chart.defaults.font.family = saved.family;
            Chart.defaults.font.size = saved.size;
            Chart.defaults.color = saved.color;
            Chart.defaults.borderColor = saved.borderColor;
            Chart.defaults.responsive = saved.responsive;
        });

        it("builds the options without anything from Chart.defaults", async () => {
            const host = await renderHost();
            const text = JSON.stringify(uauiChartOptions(host, "line"));
            for (const value of ["Comic Sans MS", "rgb(255, 0, 0)", "rgb(0, 255, 0)", ":40"]) {
                expect(text).not.toContain(value);
            }
        });

        it("doesn't change Chart.defaults", async () => {
            const host = await renderHost();
            const before = JSON.stringify({ font: Chart.defaults.font, color: Chart.defaults.color, plugins: Chart.defaults.plugins });
            uauiChartOptions(host, "line");
            const chart = lineChart(host, uauiChartColors(host));
            uauiWatchTheme(host, chart)();
            chart.destroy();
            expect(JSON.stringify({ font: Chart.defaults.font, color: Chart.defaults.color, plugins: Chart.defaults.plugins })).toBe(before);
        });

        it("draws a chart in the package's font and colours, not the defaults", async () => {
            const host = await renderHost();
            const colors = uauiChartColors(host);
            const chart = lineChart(host, colors);
            try {
                expect(axis(chart, "x").ticks.color).toBe(colors.text);
                expect(axis(chart, "x").ticks.font).toMatchObject({ family: colors.fontFamily, size: 11 });
                expect(axis(chart, "y").grid.color).toBe(colors.grid);
                expect(chart.options.responsive).toBe(true);
            } finally {
                chart.destroy();
            }
        });
    });

    describe("Scenario: uauiWatchTheme started while the host is disconnected", () => {
        it("puts the colours in the options once the host is connected", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            const host = await renderHost();
            const parent = host.parentElement!;
            host.remove();
            const empty = uauiChartColors(host);
            const chart = lineChart(host, empty);
            const onChange = vi.fn();
            const stop = uauiWatchTheme(host, chart, onChange);
            try {
                expect(empty.text).toBe("");
                expect(String(warn.mock.calls[0]?.[0])).toContain("not connected");
                parent.appendChild(host);
                await expect.poll(() => onChange.mock.calls.length).toBe(1);
                expect(axis(chart, "x").ticks.color).toBe(uauiChartColors(host).text);
            } finally {
                stop();
                chart.destroy();
                warn.mockRestore();
            }
        });
    });

    describe("Scenario: uauiWatchTheme", () => {
        let host: UauiTestElement;
        let chart: Chart<"line">;
        let stop: () => void;
        let onChange: ReturnType<typeof vi.fn<(colors: UauiChartColors, chart: Chart<"line">) => void>>;
        beforeEach(async () => {
            host = await renderHost();
            const colors = uauiChartColors(host);
            const options = uauiChartOptions(host, "line", colors);
            // The product's own choice, which the watch must keep.
            options.scales!.y!.ticks!.color = "rgb(9, 9, 9)";
            chart = lineChart(host, colors, options);
            onChange = vi.fn((next: UauiChartColors, changed: Chart<"line">) => {
                changed.data.datasets[0].borderColor = next.series[0].line;
            });
            stop = uauiWatchTheme(host, chart, onChange);
        });
        afterEach(() => {
            stop();
            chart.destroy();
        });

        /** Lets the shared stylesheet watch run (it waits 30ms after a change). */
        const tick = () => new Promise((resolve) => setTimeout(resolve, 120));

        it("puts the new theme's colours in the chart's options and calls onChange", async () => {
            themeStyle.textContent = darkCss;
            const dark = uauiChartColors(host);
            await expect.poll(() => onChange.mock.calls.length).toBe(1);
            expect(onChange.mock.calls[0][0]).toEqual(dark);
            expect(onChange.mock.calls[0][1]).toBe(chart);
            expect(axis(chart, "x").ticks.color).toBe(dark.text);
            expect(axis(chart, "x").border.color).toBe(dark.grid);
            expect(axis(chart, "y").grid.color).toBe(dark.grid);
            expect(chart.data.datasets[0].borderColor).toBe(dark.series[0].line);
        });

        it("keeps an option the product set itself", async () => {
            themeStyle.textContent = darkCss;
            await expect.poll(() => onChange.mock.calls.length).toBe(1);
            expect(axis(chart, "y").ticks.color).toBe("rgb(9, 9, 9)");
        });

        it("does nothing when a stylesheet changes but the colours don't", async () => {
            const unrelated = document.createElement("style");
            unrelated.textContent = ".unrelated { color: red; }";
            document.head.appendChild(unrelated);
            await tick();
            unrelated.remove();
            expect(onChange).not.toHaveBeenCalled();
        });

        it("stops when told to", async () => {
            stop();
            themeStyle.textContent = darkCss;
            await tick();
            expect(onChange).not.toHaveBeenCalled();
            expect(() => stop()).not.toThrow();
        });

        it("waits while the host is disconnected, then catches up once it is back", async () => {
            const parent = host.parentElement!;
            host.remove();
            themeStyle.textContent = darkCss;
            await tick();
            expect(onChange).not.toHaveBeenCalled();
            parent.appendChild(host);
            const dark = uauiChartColors(host);
            await expect.poll(() => onChange.mock.calls.length).toBe(1);
            expect(axis(chart, "x").ticks.color).toBe(dark.text);
        });

        it("runs no timer while the host is away", async () => {
            const realSetTimeout = window.setTimeout.bind(window);
            const wait = (ms: number) => new Promise((resolve) => realSetTimeout(resolve, ms));
            const parent = host.parentElement!;
            host.remove();
            themeStyle.textContent = darkCss;
            // Let the shared stylesheet watch (a 30ms debounce per change) run its check, which finds the host away.
            await wait(120);
            const timeouts = vi.spyOn(window, "setTimeout");
            const intervals = vi.spyOn(window, "setInterval");
            try {
                await wait(600);
                expect(timeouts).not.toHaveBeenCalled();
                expect(intervals).not.toHaveBeenCalled();
                expect(onChange).not.toHaveBeenCalled();
            } finally {
                timeouts.mockRestore();
                intervals.mockRestore();
                parent.appendChild(host);
            }
            await expect.poll(() => onChange.mock.calls.length).toBe(1);
        });

        it("calls onChange when only a colour our own chart draws changes (gap, marker)", async () => {
            const override = document.createElement("style");
            override.textContent = ":root { --uaui-gap-positive: rgb(255, 0, 0); }";
            document.head.appendChild(override);
            try {
                await expect.poll(() => onChange.mock.calls.length).toBe(1);
                override.textContent = ":root { --uaui-gap-positive: rgb(255, 0, 0); --uaui-marker: rgb(0, 160, 0); }";
                await expect.poll(() => onChange.mock.calls.length).toBe(2);
            } finally {
                override.remove();
            }
        });

        it("stops itself once the chart is destroyed", async () => {
            chart.destroy();
            themeStyle.textContent = darkCss;
            await tick();
            expect(onChange).not.toHaveBeenCalled();
        });
    });
});
