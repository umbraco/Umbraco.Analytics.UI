// NFR — Contrast targets (SPEC "Non-functional targets")
// Checks WCAG 2.x ratios in the real UUI light, dark and high-contrast stylesheets: 4.5:1 for text, 3:1 for
// graphics that carry meaning. Plain UUI tokens on the surface are literal pairs. Anything an element styles itself
// (tooltip, badges, group-by, KPI tile) is measured from the rendered element's computed styles, so a change
// to the element's CSS is what the spec sees.
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import lightCss from "@umbraco-ui/uui/themes/light.css?inline";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { page, userEvent } from "vitest/browser";
import { Chart } from "chart.js";
import { deepQuery, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "../delta-badge/delta-badge.element.js";
import "../chart/time-series-chart.element.js";
import "../group-by/group-by.element.js";
import "../kpi-tile/kpi-tile.element.js";
import "../date-range/date-range.element.js";
import "../funnel/funnel.element.js";
import "../table/cells/status-cell.element.js";

type Rgba = [r: number, g: number, b: number, a: number];

/** Parses the computed forms Chromium returns: `rgb()`, `rgba()` and `color(srgb r g b / a)` (what `color-mix` gives). */
const parse = (computed: string): Rgba => {
    const numbers = computed.match(/-?[\d.]+(?:e-?\d+)?%?/g)?.map(Number) ?? [];
    if (computed.startsWith("color(srgb")) {
        const [r, g, b, a = 1] = numbers;
        return [r * 255, g * 255, b * 255, a];
    }
    if (computed.startsWith("rgb")) {
        const [r, g, b, a = 1] = numbers;
        return [r, g, b, a];
    }
    throw new Error(`Unexpected colour format: ${computed}`);
};

/** `top` painted over an opaque `bottom`. */
const over = ([r, g, b, a]: Rgba, bottom: Rgba): Rgba => [
    r * a + bottom[0] * (1 - a),
    g * a + bottom[1] * (1 - a),
    b * a + bottom[2] * (1 - a),
    1,
];

const luminance = ([r, g, b]: Rgba) => {
    const lin = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const ratio = (a: Rgba, b: Rgba) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

const themes = { light: lightCss, dark: darkCss, "high contrast": highContrastCss };

/** A pair of CSS values to resolve. A translucent foreground or background is composited over `base` (the surface by default). */
type Pair = { name: string; fg: string; bg: string };

/** Plain UUI tokens on the surface. Text: WCAG AA normal text, 4.5:1. */
const TEXT: Pair[] = [
    { name: "text on surface", fg: "var(--uui-color-text)", bg: "var(--uui-color-surface)" },
    { name: "text-alt on surface (chart ticks, labels, KPI label)", fg: "var(--uui-color-text-alt)", bg: "var(--uui-color-surface)" },
    { name: "text on surface-alt (table header)", fg: "var(--uui-color-text)", bg: "var(--uui-color-surface-alt)" },
    { name: "text-alt on surface-alt (table header, empty state)", fg: "var(--uui-color-text-alt)", bg: "var(--uui-color-surface-alt)" },
    { name: "text on row hover", fg: "var(--uui-color-text)", bg: "var(--uui-color-surface-emphasis)" },
    { name: "text-alt on row hover", fg: "var(--uui-color-text-alt)", bg: "var(--uui-color-surface-emphasis)" },
    { name: "link on surface", fg: "var(--uui-color-interactive)", bg: "var(--uui-color-surface)" },
    { name: "link hover on surface", fg: "var(--uui-color-interactive-emphasis)", bg: "var(--uui-color-surface)" },
    { name: "badge text-positive on tint-positive", fg: "var(--uaui-color-text-positive)", bg: "var(--uaui-color-tint-positive)" },
    { name: "badge text-negative on tint-negative", fg: "var(--uaui-color-text-negative)", bg: "var(--uaui-color-tint-negative)" },
    { name: "badge text-neutral on tint-neutral", fg: "var(--uaui-color-text-neutral)", bg: "var(--uaui-color-tint-neutral)" },
    { name: "status text-warning on tint-warning", fg: "var(--uaui-color-text-warning)", bg: "var(--uaui-color-tint-warning)" },
];

/** The palette's own tokens against the surface: lines and dots that carry meaning, WCAG AA graphical objects, 3:1. */
const GRAPHICS: Pair[] = [
    ...[1, 2, 3, 4].map((n) => ({ name: `series-${n} line on surface`, fg: `var(--uaui-color-series-${n})`, bg: "var(--uui-color-surface)" })),
    { name: "compare line on surface", fg: "var(--uaui-color-compare)", bg: "var(--uui-color-surface)" },
    { name: "marker dot on surface", fg: "var(--uaui-color-marker)", bg: "var(--uui-color-surface)" },
    { name: "marker hover dot on surface", fg: "var(--uaui-color-marker-hover)", bg: "var(--uui-color-surface)" },
];

/**
 * UUI's own tokens, which every backoffice control shares and a package can't change: reported so the numbers are on
 * record, not asserted. UUI's dark focus ring is 2.5:1 and its input-style borders (the group-by outline) are 1.8:1 in light.
 */
const UUI_OWNED: Pair[] = [
    { name: "focus ring on surface", fg: "var(--uui-color-focus)", bg: "var(--uui-color-surface)" },
    { name: "group-by border on surface", fg: "var(--uui-color-border-standalone)", bg: "var(--uui-color-surface)" },
];

// Three dates with changes of +20%, -10% and 0% against the compare series, so the tooltip shows each badge.
const dates = ["2026-05-25", "2026-05-26", "2026-05-27"];
const current = { id: "pv", label: "Pageviews", points: dates.map((date, i) => ({ date, value: [60, 90, 100][i] })) };
const previous = { id: "pv", label: "Pageviews", points: dates.map((date, i) => ({ date, value: [50, 100, 100][i] })) };

describe("Feature: contrast in every theme", () => {
    let themeStyle: HTMLStyleElement;
    beforeEach(() => {
        themeStyle = document.createElement("style");
        document.head.appendChild(themeStyle);
    });
    afterEach(() => themeStyle.remove());

    for (const [theme, themeCss] of Object.entries(themes)) {
        describe(`Scenario: the ${theme} theme`, () => {
            let host: UauiTestElement;
            beforeEach(async () => {
                themeStyle.textContent = themeCss;
                host = await renderElement(html`<uaui-delta-badge .value=${1}></uaui-delta-badge>`, "uaui-delta-badge");
            });

            /** A custom property that holds `light-dark()` isn't evaluated until used, so apply it as `color` and read it back. */
            const colour = (value: string): Rgba => {
                const previous = host.style.color;
                host.style.color = value;
                const resolved = getComputedStyle(host).color;
                host.style.color = previous;
                return parse(resolved);
            };
            const surface = () => over(colour("var(--uui-color-surface)"), [255, 255, 255, 1]);

            /** The ratio of two computed colours, each composited over what it sits on (`base`). */
            const between = (fg: Rgba, bg: Rgba, base: Rgba) => {
                const back = over(bg, base);
                return ratio(over(fg, back), back);
            };
            const measure = ({ fg, bg }: Pair) => between(colour(fg), colour(bg), surface());
            const computed = (el: Element, property: "color" | "backgroundColor", pseudo?: string) =>
                parse(getComputedStyle(el, pseudo)[property]);
            const check = (kind: "text" | "graphic", name: string, value: number) => {
                console.log(`[contrast] ${theme} | ${kind} | ${name} | ${value.toFixed(2)}`);
                expect(value).toBeGreaterThanOrEqual(kind === "text" ? 4.5 : 3);
            };

            for (const pair of TEXT) {
                it(`gives ${pair.name} at least 4.5:1`, () => check("text", pair.name, measure(pair)));
            }

            for (const pair of GRAPHICS) {
                it(`gives ${pair.name} at least 3:1`, () => check("graphic", pair.name, measure(pair)));
            }

            // Logged for the record, not asserted: see UUI_OWNED.
            afterAll(() => {
                for (const pair of UUI_OWNED) console.log(`[contrast] ${theme} | uui-owned | ${pair.name} | ${measure(pair).toFixed(2)}`);
            });

            describe("the chart tooltip, as rendered", () => {
                let chart: UauiTestElement;
                const tooltip = () => shadow(chart).querySelector("uaui-chart-tooltip") as HTMLElement;
                const hoverDate = async (index: number) => {
                    const canvas = shadow(chart).querySelector("canvas")!;
                    const x = Chart.getChart(canvas)!.getDatasetMeta(0).data[index].x;
                    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
                    await expect.poll(() => tooltip().style.visibility).toBe("visible");
                    // The badge shows this date's change, once the tooltip has rendered it.
                    await expect.poll(() => deepQuery(tooltip().shadowRoot!, "uaui-delta-badge")?.shadowRoot?.querySelector(".badge")).not.toBeNull();
                };
                beforeEach(async () => {
                    chart = await renderElement(
                        html`<uaui-time-series-chart kind="line" .series=${[current]} .compareSeries=${[previous]} style="width:400px"></uaui-time-series-chart>`,
                        "uaui-time-series-chart",
                    );
                });

                it("gives the date, value and compare date at least 4.5:1 on the tooltip", async () => {
                    await hoverDate(0);
                    const back = computed(tooltip(), "backgroundColor");
                    for (const selector of [".tooltip-date", ".tooltip-value", ".tooltip-sub"]) {
                        check("text", `tooltip ${selector}`, between(computed(deepQuery(tooltip().shadowRoot!, selector)!, "color"), back, surface()));
                    }
                });

                for (const [index, sentiment] of [[0, "positive"], [1, "negative"], [2, "neutral"]] as const) {
                    it(`gives the ${sentiment} badge in the tooltip at least 4.5:1`, async () => {
                        await hoverDate(index);
                        const badge = deepQuery(tooltip().shadowRoot!, "uaui-delta-badge")!.shadowRoot!.querySelector(".badge")!;
                        expect(badge.getAttribute("data-sentiment")).toBe(sentiment);
                        const back = over(computed(tooltip(), "backgroundColor"), surface());
                        check("text", `tooltip ${sentiment} badge`, between(computed(badge, "color"), computed(badge, "backgroundColor"), back));
                    });
                }
            });

            describe("the funnel's link badges, as rendered", () => {
                // Rates of 50%, 50% and 40% against 40%, 62.5% and 40%: one badge of each sentiment.
                const step = (id: string, value: number) => ({ id, label: id, value });
                const values = [100, 50, 25, 10];
                const compareValues = [100, 40, 25, 10];
                for (const [index, sentiment] of [[0, "positive"], [1, "negative"], [2, "neutral"]] as const) {
                    it(`gives the ${sentiment} badge on the link tint at least 4.5:1`, async () => {
                        const funnel = await renderElement(
                            html`<uaui-funnel
                                style="width:400px"
                                .steps=${values.map((v, i) => step(`s${i}`, v))}
                                .compareSteps=${compareValues.map((v, i) => step(`s${i}`, v))}></uaui-funnel>`,
                            "uaui-funnel",
                        );
                        await settle(funnel);
                        const link = shadow(funnel).querySelectorAll(".link")[index];
                        const badge = deepQuery(link, "uaui-delta-badge")!.shadowRoot!.querySelector(".badge")!;
                        expect(badge.getAttribute("data-sentiment")).toBe(sentiment);
                        // The trapezoid's tint is on the surface; the badge sits on its own host's fill on that tint.
                        const tint = over(computed(link.querySelector(".link-shape")!, "backgroundColor"), surface());
                        const back = over(computed(deepQuery(link, "uaui-delta-badge")!, "backgroundColor"), tint);
                        check("text", `funnel link ${sentiment} badge`, between(computed(badge, "color"), computed(badge, "backgroundColor"), back));
                        if (sentiment === "positive") {
                            check("text", "funnel link rate on the tint", between(computed(link.querySelector(".rate")!, "color"), tint, tint));
                        }
                    });
                }
            });

            describe("the status cell, as rendered", () => {
                for (const tone of ["default", "positive", "warning", "danger"] as const) {
                    it(`gives the ${tone} tone's text at least 4.5:1 on its tint`, async () => {
                        const cell = await renderElement(
                            html`<uaui-status-cell
                                .column=${{ key: "status", label: "Status", meta: { toneKey: "tone" } }}
                                .item=${{ tone }}
                                .value=${"Out of stock"}></uaui-status-cell>`,
                            "uaui-status-cell",
                        );
                        const status = shadow(cell).querySelector(".status")!;
                        expect(status.getAttribute("data-tone")).toBe(tone);
                        check("text", `status cell ${tone}`, between(computed(status, "color"), computed(status, "backgroundColor"), surface()));
                    });
                }
            });

            describe("the group-by control, as rendered", () => {
                it("gives the selected segment's text at least 4.5:1 and its fill at least 3:1 on the surface", async () => {
                    const el = await renderElement(html`<uaui-group-by value="day"></uaui-group-by>`, "uaui-group-by");
                    await settle(el);
                    const selected = deepQuery(el.shadowRoot!, 'button[aria-checked="true"]')!;
                    const fill = computed(selected, "backgroundColor");
                    check("text", "group-by selected text on fill", between(computed(selected, "color"), fill, surface()));
                    check("graphic", "group-by selected fill on surface", between(fill, surface(), surface()));
                });
            });

            describe("the date range button, as rendered", () => {
                it("gives the comparison line at least 4.5:1 on the surface", async () => {
                    const el = await renderElement(
                        html`<uaui-date-range
                            .value=${{ from: "2026-05-25", to: "2026-06-23" }}
                            .compare=${{ mode: "previous-period", from: "2026-04-25", to: "2026-05-24" }}></uaui-date-range>`,
                        "uaui-date-range",
                    );
                    const line = shadow(el).querySelector(".compare")!;
                    check("text", "date range comparison line on surface", between(computed(line, "color"), surface(), surface()));
                });
            });

            describe("the KPI tile, as rendered", () => {
                let tile: UauiTestElement;
                beforeEach(async () => {
                    tile = await renderElement(
                        html`<uaui-kpi-tile label="Pageviews" value="1,204" icon="icon-chart" selectable selected></uaui-kpi-tile>`,
                        "uaui-kpi-tile",
                    );
                });

                it("gives the icon glyph at least 3:1 on its square", () => {
                    const icon = shadow(tile).querySelector(".icon")!;
                    check("graphic", "KPI icon on its square", between(computed(icon, "color"), computed(icon, "backgroundColor"), surface()));
                });

                it("gives the selected border at least 3:1 on the surface", () => {
                    const border = shadow(tile).querySelector(".select-border")!;
                    const colourOfBorder = parse(getComputedStyle(border, "::after").borderTopColor);
                    check("graphic", "KPI selected border on surface", between(colourOfBorder, surface(), surface()));
                });
            });
        });
    }
});
