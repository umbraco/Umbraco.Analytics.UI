// T57 — Series colours by meaning: a series' `color` takes a status colour (`UauiStatusColor`) as well as a palette slot.
// Canvas colours are read from the drawn Chart.js datasets; swatches from the legend's and tooltip's computed styles.
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import lightCss from "@umbraco-ui/uui/themes/light.css?inline";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { Chart, uauiChartColors } from "@umbraco/analytics-ui/external/chart.js";
import { axeRun } from "../internal/test/a11y.js";
import { deepQuery, deepQueryAll, renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";
import type { UauiChartKind, UauiSeries } from "./types.js";
import "./time-series-chart.element.js";

const dates = ["2026-06-01", "2026-06-02", "2026-06-03"];
const seriesOf = (id: string, label: string, values: number[], color?: unknown): UauiSeries =>
    ({ id, label, points: dates.map((date, i) => ({ date, value: values[i] })), ...(color === undefined ? {} : { color }) }) as UauiSeries;

// Workflow-like: approved, pending, errored and cancelled.
const approved = seriesOf("approved", "Approved", [5, 8, 6], "positive");
const pending = seriesOf("pending", "Pending", [2, 3, 4], "warning");
const errored = seriesOf("errored", "Errored", [1, 0, 2], "danger");
const cancelled = seriesOf("cancelled", "Cancelled", [1, 1, 0], "default");
const previousErrored = { ...seriesOf("errored", "Errored", [2, 1, 1]), points: ["2026-05-01", "2026-05-02", "2026-05-03"].map((date, i) => ({ date, value: [2, 1, 1][i] })) };

const KINDS: UauiChartKind[] = ["line", "area", "bar", "stacked-bar"];
const STATUSES = ["default", "positive", "warning", "danger"] as const;

const chart = (kind: UauiChartKind, series: UauiSeries[], compare?: UauiSeries[]) =>
    renderElement(
        html`<uaui-time-series-chart kind=${kind} .series=${series} .compareSeries=${compare} style="width:400px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );

const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
const isBars = (kind: UauiChartKind) => kind === "bar" || kind === "stacked-bar";
/** What a drawn dataset is coloured with: its line and fill, or its bar. */
const drawn = (el: Element, index: number, kind: UauiChartKind) => {
    const set = chartOf(el).data.datasets[index] as { borderColor?: unknown; backgroundColor?: unknown };
    return isBars(kind) ? { bar: set.backgroundColor } : { line: set.borderColor, fill: set.backgroundColor };
};
const expected = (shades: { line: string; fill: string; bar: string }, kind: UauiChartKind) =>
    isBars(kind) ? { bar: shades.bar } : { line: shades.line, fill: shades.fill };

/** `value` applied as `el`'s `color` and read back: how `el` resolves it. */
const resolvedIn = (el: HTMLElement, value: string) => {
    el.style.color = value;
    const color = getComputedStyle(el).color;
    el.style.color = "";
    return color;
};

const legend = (el: Element) => deepQuery<HTMLElement>(shadow(el), "uaui-chart-legend")!;
const legendSwatches = (el: Element, kind: UauiChartKind) =>
    [...deepQueryAll<HTMLElement>(shadow(el), isBars(kind) ? ".legend-swatch:not(.legend-compare-swatch)" : ".legend-line:not(.legend-compare)")].map((s) =>
        isBars(kind) ? getComputedStyle(s).backgroundColor : getComputedStyle(s).borderTopColor,
    );
const tooltip = (el: Element) => shadow(el).querySelector("uaui-chart-tooltip") as HTMLElement;
const hoverDate = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const x = chartOf(el).getDatasetMeta(0).data[index].x;
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
    await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
};

describe("Feature: series coloured by a status", () => {
    for (const kind of KINDS) {
        describe(`Scenario: a ${kind} chart with a series of each status`, () => {
            let el: UauiTestElement;
            const series = STATUSES.map((status, i) => seriesOf(status, status, [i + 1, i + 2, i + 3], status));
            beforeEach(async () => {
                el = await chart(kind, series);
            });

            it("draws each series in its status colour", () => {
                const colors = uauiChartColors(el);
                STATUSES.forEach((status, i) => expect(drawn(el, i, kind)).toEqual(expected(colors.status[status], kind)));
            });

            it("draws the legend swatches in the status colours", () => {
                const token = isBars(kind) ? "bar" : "series";
                expect(legendSwatches(el, kind)).toEqual(STATUSES.map((status) => resolvedIn(legend(el), `var(--uaui-color-${token}-${status})`)));
            });

            it("draws the tooltip swatches in the status colours", async () => {
                await hoverDate(el, 1);
                const token = isBars(kind) ? "bar" : "series";
                const swatches = [...tooltip(el).shadowRoot!.querySelectorAll<HTMLElement>(".tooltip-series .swatch")].map((s) => getComputedStyle(s).backgroundColor);
                expect(swatches).toEqual(STATUSES.map((status) => resolvedIn(tooltip(el), `var(--uaui-color-${token}-${status})`)));
            });

            it("has no axe violations", async () => {
                expect(await axeRun(el)).toHaveNoViolations();
            });
        });
    }

    describe("Scenario: status colours against the slots, in every theme", () => {
        let themeStyle: HTMLStyleElement;
        beforeEach(() => {
            themeStyle = document.createElement("style");
            document.head.appendChild(themeStyle);
        });
        afterEach(() => themeStyle.remove());

        // Only these pairs draw alike: the palette has no other yellow or red line that clears 3:1.
        const SAME: Record<string, number | undefined> = { default: undefined, positive: undefined, warning: 3, danger: 2 };

        for (const [theme, themeCss] of Object.entries({ light: lightCss, dark: darkCss, "high contrast": highContrastCss })) {
            it(`gives the statuses four line and four bar colours, each unlike every slot but its documented twin (${theme})`, async () => {
                themeStyle.textContent = themeCss;
                const el = await chart("line", [approved]);
                const { status, series } = uauiChartColors(el);
                expect(new Set(STATUSES.map((s) => status[s].line)).size).toBe(4);
                expect(new Set(STATUSES.map((s) => status[s].bar)).size).toBe(4);
                for (const s of STATUSES) {
                    series.forEach((slot, i) => {
                        const twin = SAME[s] === i + 1;
                        expect(status[s].line === slot.line, `${s} line vs slot ${i + 1}`).toBe(twin);
                        expect(status[s].bar === slot.bar, `${s} bar vs slot ${i + 1}`).toBe(twin);
                    });
                }
            });
        }
    });

    describe("Scenario: slot 4 against slot 1 and positive in the dark theme", () => {
        let themeStyle: HTMLStyleElement;
        beforeEach(() => {
            themeStyle = document.createElement("style");
            document.head.appendChild(themeStyle);
        });
        afterEach(() => themeStyle.remove());

        /** A computed `rgb()` or `color(srgb ...)` colour as CIELAB, to compare how far apart two colours look. */
        const lab = (computed: string) => {
            const numbers = computed.match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number);
            const rgb = computed.startsWith("color(srgb") ? numbers.slice(0, 3) : numbers.slice(0, 3).map((c) => c / 255);
            const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
            const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
            const [x, y, z] = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883].map(f);
            return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
        };
        /** CIE76 colour difference. Jungle green, the old dark slot 4, was 16 from positive and read as the same green. */
        const difference = (a: string, b: string) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

        it("draws slot 4 lavender, clearly unlike slot 1's blue and the positive green", async () => {
            themeStyle.textContent = darkCss;
            const el = await chart("line", [approved]);
            const { series, status } = uauiChartColors(el);
            for (const token of ["line", "bar"] as const) {
                expect(difference(series[3][token], series[0][token]), `slot 4 vs slot 1 ${token}`).toBeGreaterThan(30);
                expect(difference(series[3][token], status.positive[token]), `slot 4 vs positive ${token}`).toBeGreaterThan(30);
            }
        });
    });

    describe("Scenario: a chart mixes a status with the slot it looks like", () => {
        let warn: MockInstance<typeof console.warn>;
        beforeEach(() => {
            warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        });
        afterEach(() => warn.mockRestore());
        const clashWarnings = () => warn.mock.calls.filter(([message]) => String(message).includes("look the same"));

        it("warns once, naming the pair", async () => {
            const el = await chart("line", [errored, seriesOf("a", "Views", [1, 2, 3], 2)]);
            el.kind = "bar";
            await el.updateComplete;
            await new Promise((resolve) => requestAnimationFrame(resolve));
            expect(clashWarnings()).toHaveLength(1);
            expect(String(clashWarnings()[0][0])).toContain('"danger" and 2');
        });

        it("doesn't warn for statuses with other slots", async () => {
            await chart("bar", [errored, approved, pending, cancelled, seriesOf("a", "Views", [1, 2, 3], 1), seriesOf("b", "Clicks", [1, 2, 3], 4)]);
            expect(clashWarnings()).toHaveLength(0);
        });
    });

    describe("Scenario: slot and status series mixed", () => {
        for (const kind of KINDS) {
            it(`draws the slot series in its slot and the status series in its status (${kind})`, async () => {
                const el = await chart(kind, [seriesOf("a", "Submissions", [3, 4, 5], 4), errored, seriesOf("b", "Views", [6, 7, 8])]);
                const colors = uauiChartColors(el);
                expect(drawn(el, 0, kind)).toEqual(expected(colors.series[3], kind));
                expect(drawn(el, 1, kind)).toEqual(expected(colors.status.danger, kind));
                // No color: the slot of its position (third).
                expect(drawn(el, 2, kind)).toEqual(expected(colors.series[2], kind));
            });
        }
    });

    describe("Scenario: a color that is neither a slot nor a status", () => {
        for (const color of ["red", "Danger", 0, 9, null]) {
            it(`falls back to the slot of the series' position for ${JSON.stringify(color)}`, async () => {
                const el = await chart("line", [approved, seriesOf("x", "Other", [1, 2, 3], color)]);
                expect(drawn(el, 1, "line")).toEqual(expected(uauiChartColors(el).series[1], "line"));
            });
        }
    });

    describe("Scenario: comparing a status series", () => {
        it("keeps the compare line in the compare colour (line)", async () => {
            const el = await chart("line", [errored], [previousErrored]);
            const colors = uauiChartColors(el);
            expect(drawn(el, 0, "line")).toEqual(expected(colors.status.danger, "line"));
            expect(chartOf(el).data.datasets[1].borderColor).toBe(colors.compare);
            expect(legendSwatches(el, "line")).toEqual([resolvedIn(legend(el), "var(--uaui-color-series-danger)")]);
            const compareLine = deepQuery<HTMLElement>(shadow(el), ".legend-compare")!;
            expect(getComputedStyle(compareLine).borderTopColor).toBe(resolvedIn(legend(el), "var(--uaui-color-compare)"));
        });

        it("keeps the compare bar in the compare colour (bar)", async () => {
            const el = await chart("bar", [errored], [previousErrored]);
            const colors = uauiChartColors(el);
            expect(drawn(el, 0, "bar")).toEqual(expected(colors.status.danger, "bar"));
            expect(chartOf(el).data.datasets[1].backgroundColor).toBe(colors.compareBar);
        });
    });

    describe("Scenario: a product overrides a status colour", () => {
        it("draws with --uaui-series-danger and --uaui-bar-danger from an ancestor", async () => {
            const line = await renderElement(
                html`<div style="--uaui-series-danger: rgb(1, 2, 3)"><uaui-time-series-chart .series=${[errored]} style="width:400px"></uaui-time-series-chart></div>`,
                "uaui-time-series-chart",
            );
            expect(chartOf(line).data.datasets[0].borderColor).toBe("rgb(1, 2, 3)");
            const bar = await renderElement(
                html`<div style="--uaui-bar-danger: rgb(4, 5, 6)"><uaui-time-series-chart kind="bar" .series=${[errored]} style="width:400px"></uaui-time-series-chart></div>`,
                "uaui-time-series-chart",
            );
            expect(chartOf(bar).data.datasets[0].backgroundColor).toBe("rgb(4, 5, 6)");
        });
    });

    describe("Scenario: switching to the dark theme", () => {
        let themeStyle: HTMLStyleElement;
        beforeEach(() => {
            themeStyle = document.createElement("style");
            document.head.appendChild(themeStyle);
        });
        afterEach(() => themeStyle.remove());

        it("redraws a status series in its dark shade", async () => {
            const el = await chart("line", [errored, approved]);
            const light = chartOf(el).data.datasets[1].borderColor;
            themeStyle.textContent = darkCss;
            await expect.poll(() => chartOf(el).data.datasets[1].borderColor).not.toBe(light);
            expect(chartOf(el).data.datasets[1].borderColor).toBe(uauiChartColors(el).status.positive.line);
        });
    });

    describe("Scenario: a Workflow-like chart", () => {
        it("lists the statuses in the legend in their colours, and has no axe violations", async () => {
            const el = await chart("stacked-bar", [approved, pending, errored, cancelled]);
            expect(legendSwatches(el, "stacked-bar")).toEqual(
                ["positive", "warning", "danger", "default"].map((s) => resolvedIn(legend(el), `var(--uaui-color-bar-${s})`)),
            );
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });
});
