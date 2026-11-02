// T59 — Many series stay readable: palette slots 5 to 8, a legend that folds, a tooltip that caps its rows.
// Canvas-only outcomes are checked with screenshot comparison (toMatchScreenshot): see screenshotIt.
import { Chart, uauiChartColors } from "@umbraco/analytics-ui/external/chart.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import lightCss from "@umbraco-ui/uui/themes/light.css?inline";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { screenshotIt } from "../internal/test/screenshot.js";
import { deepQuery, deepQueryAll, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import type { UauiChartKind, UauiSeries } from "./types.js";
import "./time-series-chart.element.js";

const dates = ["2026-06-01", "2026-06-02", "2026-06-03"];
/** 11 source pages, the largest first: page N has N + 1 entries a day, so page 11 is the largest. */
const pages: UauiSeries[] = Array.from({ length: 11 }, (_, p) => ({
    id: `page-${p + 1}`,
    label: `Page ${p + 1}`,
    points: dates.map((date, i) => ({ date, value: (p + 1) * (i + 1) })),
}));

const chart = (series: UauiSeries[], kind: UauiChartKind = "line", stack = "normal") =>
    renderElement(
        html`<uaui-time-series-chart kind=${kind} stack=${stack} .series=${series} style="width:600px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );

const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
const legend = (el: Element) => deepQuery<HTMLElement & { updateComplete: Promise<unknown> }>(shadow(el), "uaui-chart-legend")!;
const legendLabels = (el: Element) =>
    [...legend(el).shadowRoot!.querySelectorAll("li:not(.legend-toggle-item)")].map((li) => li.textContent!.trim());
const toggle = (el: Element) => legend(el).shadowRoot!.querySelector<HTMLButtonElement>(".legend-toggle");
const tooltip = (el: Element) => shadow(el).querySelector("uaui-chart-tooltip") as HTMLElement;
const hoverDate = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const { left, right } = chartOf(el).chartArea;
    const x = Math.min(Math.max(chartOf(el).getDatasetMeta(0).data[index].x, left + 1), right - 1);
    await userEvent.hover(page.elementLocator(document.body), { position: { x: 1, y: 1 } });
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
    await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
};

/** A computed `rgb()` or `color(srgb ...)` colour as CIELAB, to compare how far apart two colours look. */
const lab = (computed: string) => {
    const numbers = computed.match(/-?[\d.]+(?:e-?\d+)?/g)!.map(Number);
    const rgb = computed.startsWith("color(srgb") ? numbers.slice(0, 3) : numbers.slice(0, 3).map((c) => c / 255);
    const [r, g, b] = rgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const [x, y, z] = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883].map(f);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
/** CIE76 colour difference, as the slot 4 spec (T64) measures it. */
const difference = (a: string, b: string) => Math.hypot(...lab(a).map((v, i) => v - lab(b)[i]));

describe("Feature: many series stay readable", () => {
    describe("Scenario: a chart with 11 series", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart(pages);
        });

        it("colours series 5 to 8 with slots 5 to 8, then repeats the slots", () => {
            const { series } = uauiChartColors(el);
            const lines = chartOf(el).data.datasets.map((set) => (set as { borderColor?: unknown }).borderColor);
            expect(lines.slice(0, 8)).toEqual(series.map((slot) => slot.line));
            expect(lines.slice(8)).toEqual(series.slice(0, 3).map((slot) => slot.line));
        });

        it("folds the legend to the first 7 series and a Show 4 more button", async () => {
            expect(legendLabels(el)).toEqual(pages.slice(0, 7).map((p) => p.label));
            await expect.element(page.elementLocator(toggle(el)!)).toHaveAccessibleName("Show 4 more");
        });

        it("names the button by its text alone: no aria-label or aria-expanded saying it twice", () => {
            expect(toggle(el)!.hasAttribute("aria-label")).toBe(false);
            expect(toggle(el)!.hasAttribute("aria-expanded")).toBe(false);
        });

        it("lists every series when Show 4 more is pressed, and folds again on Show fewer", async () => {
            toggle(el)!.click();
            await legend(el).updateComplete;
            expect(legendLabels(el)).toEqual(pages.map((p) => p.label));
            await expect.element(page.elementLocator(toggle(el)!)).toHaveAccessibleName("Show fewer");
            toggle(el)!.click();
            await legend(el).updateComplete;
            expect(legendLabels(el)).toHaveLength(7);
        });

        it("lists the 7 largest rows in series order, and +4 more in the tooltip", async () => {
            await hoverDate(el, 1);
            const labels = deepQueryAll<HTMLElement>(tooltip(el).shadowRoot!, ".tooltip-series .tooltip-label").map((l) => l.textContent!.trim());
            expect(labels).toEqual(["Page 5", "Page 6", "Page 7", "Page 8", "Page 9", "Page 10", "Page 11"]);
            expect(deepQuery(tooltip(el).shadowRoot!, ".tooltip-more")!.textContent!.trim()).toBe("+4 more");
        });

        it("keeps every series in the hidden table", () => {
            const head = [...deepQuery<HTMLTableElement>(shadow(el), "table")!.tHead!.rows[0].cells].map((c) => c.textContent!.trim());
            expect(head).toEqual(["Date", ...pages.map((p) => p.label)]);
        });

        it("passes an a11y audit folded", async () => {
            expect(await axeRun(el)).toHaveNoViolations();
        });

        it("passes an a11y audit expanded", async () => {
            toggle(el)!.click();
            await legend(el).updateComplete;
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: the legend's button from the keyboard", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart(pages);
        });

        it("is reached with Tab", async () => {
            const before = document.createElement("button");
            el.before(before);
            before.focus();
            await userEvent.tab();
            expect(legend(el).shadowRoot!.activeElement).toBe(toggle(el));
            before.remove();
        });

        it("unfolds with Enter and keeps focus on the button", async () => {
            toggle(el)!.focus();
            await userEvent.keyboard("{Enter}");
            await legend(el).updateComplete;
            expect(legendLabels(el)).toHaveLength(11);
            expect(legend(el).shadowRoot!.activeElement).toBe(toggle(el));
        });

        it("folds again with Space", async () => {
            toggle(el)!.focus();
            await userEvent.keyboard("{Enter}");
            await legend(el).updateComplete;
            await userEvent.keyboard(" ");
            await legend(el).updateComplete;
            expect(legendLabels(el)).toHaveLength(7);
            await expect.element(page.elementLocator(toggle(el)!)).toHaveAccessibleName("Show 4 more");
        });

        it("moves focus to the legend list when the series drop to 8 while the button has focus", async () => {
            toggle(el)!.focus();
            await userEvent.keyboard("{Enter}");
            await legend(el).updateComplete;
            (el as unknown as { series: UauiSeries[] }).series = pages.slice(0, 8);
            await settle(el);
            await legend(el).updateComplete;
            expect(toggle(el)).toBe(null);
            expect(legend(el).shadowRoot!.activeElement).toBe(legend(el).shadowRoot!.querySelector("ul"));
        });
    });

    describe("Scenario: 8 series or fewer", () => {
        it("lists them all, with no button", async () => {
            const el = await chart(pages.slice(0, 8));
            expect(legendLabels(el)).toHaveLength(8);
            expect(toggle(el)).toBe(null);
        });

        it("lists every tooltip row in series order", async () => {
            const el = await chart(pages.slice(0, 8));
            await hoverDate(el, 1);
            const labels = deepQueryAll<HTMLElement>(tooltip(el).shadowRoot!, ".tooltip-series .tooltip-label").map((l) => l.textContent!.trim());
            expect(labels).toEqual(pages.slice(0, 8).map((p) => p.label));
            expect(deepQuery(tooltip(el).shadowRoot!, ".tooltip-more")).toBe(null);
        });
    });

    describe("Scenario: the share view with many series", () => {
        it("lists the tooltip's rows in stack order, top first, keeping the 7 largest", async () => {
            const el = await chart(pages, "stacked-bar", "percent");
            await hoverDate(el, 0);
            const values = deepQueryAll<HTMLElement>(tooltip(el).shadowRoot!, ".tooltip-series .tooltip-value").map((v) => v.textContent!.trim());
            // Page N's share is N / 66 on every date.
            expect(values).toEqual(["16.7%", "15.2%", "13.6%", "12.1%", "10.6%", "9.1%", "7.6%"]);
        });
    });

    describe("Scenario: a product overrides --uaui-series-5 on an ancestor", () => {
        it("draws the fifth series in the override", async () => {
            const host = render(
                html`<div style="--uaui-series-5: rgb(1, 2, 3)"><uaui-time-series-chart .series=${pages.slice(0, 5)}></uaui-time-series-chart></div>`,
            ).container.querySelector("div")!;
            const el = host.querySelector("uaui-time-series-chart")!;
            await settle(el);
            expect((chartOf(el).data.datasets[4] as { borderColor?: unknown }).borderColor).toBe("rgb(1, 2, 3)");
        });
    });

    for (const [theme, themeCss, minimum] of [
        ["light", lightCss, 25],
        ["dark", darkCss, 30],
        ["high contrast", highContrastCss, 25],
    ] as const) {
        describe(`Scenario: slots 5 to 8 in the ${theme} theme`, () => {
            let themeStyle: HTMLStyleElement;
            beforeEach(() => {
                themeStyle = document.createElement("style");
                themeStyle.textContent = themeCss;
                document.head.appendChild(themeStyle);
            });
            afterEach(() => themeStyle.remove());

            it(`differs from every other slot, the statuses and the compare colour by more than ${minimum}`, async () => {
                const el = await chart(pages.slice(0, 2));
                const colors = uauiChartColors(el);
                const others = [
                    ...colors.series.map((slot, i) => [`slot ${i + 1}`, slot.line] as const),
                    ...Object.entries(colors.status).map(([status, shades]) => [status, shades.line] as const),
                    ["compare", colors.compare] as const,
                ];
                for (const [i, slot] of colors.series.entries()) {
                    if (i < 4) continue;
                    for (const [name, other] of others) {
                        if (name === `slot ${i + 1}`) continue;
                        expect(difference(slot.line, other), `slot ${i + 1} vs ${name}`).toBeGreaterThan(minimum);
                    }
                }
            });
        });
    }

    describe("Scenario: screenshots", () => {
        let theme: HTMLStyleElement | undefined;
        afterEach(() => theme?.remove());

        async function themed(themeCss?: string) {
            theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            const host = render(
                html`<div style="background: var(--uui-color-surface); width: 400px">
                    <uaui-time-series-chart kind="line" .series=${pages}></uaui-time-series-chart>
                </div>`,
            ).container.querySelector("div")!;
            await settle(host.querySelector("uaui-time-series-chart")!);
            return host;
        }

        screenshotIt("draws 11 lines in 8 slots with a folded legend in the light theme", async () => {
            await expect.element(page.elementLocator(await themed())).toMatchScreenshot("chart-many-series");
        });

        screenshotIt("draws 11 lines in 8 slots with a folded legend in the dark theme", async () => {
            await expect.element(page.elementLocator(await themed(darkCss))).toMatchScreenshot("chart-many-series-dark");
        });

        it("passes an a11y audit in the dark theme", async () => {
            expect(await axeRun(await themed(darkCss))).toHaveNoViolations();
        });

        it("passes an a11y audit in the high contrast theme", async () => {
            expect(await axeRun(await themed(highContrastCss))).toHaveNoViolations();
        });
    });
});
