// CHT-6 — The chart keeps its look on a shared Chart.js
// Chart.js is shared through `@umbraco/analytics-ui/external/chart.js`, so a product's global registrations and
// `Chart.defaults` changes reach our chart's Chart.js too. These specs change them as a careless product would and
// check our chart draws the same pixels and keeps its own options.
import { Chart, Colors, Legend, Title, type Plugin } from "@umbraco/analytics-ui/external/chart.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./time-series-chart.element.js";

const pageviews = { id: "pv", label: "Pageviews", points: [
    { date: "2026-06-01", value: 40 }, { date: "2026-06-02", value: 120 }, { date: "2026-06-03", value: 280 },
] };
const sessions = { id: "s", label: "Sessions", points: [
    { date: "2026-06-01", value: 12 }, { date: "2026-06-02", value: 30 }, { date: "2026-06-03", value: 61 },
] };
const lastPeriod = { id: "pv", label: "Pageviews", points: [
    { date: "2026-05-01", value: 60 }, { date: "2026-05-02", value: 90 }, { date: "2026-05-03", value: 200 },
] };

const KINDS = ["line", "area", "bar", "stacked-bar"] as const;

const chart = (kind: string, series: unknown[] = [pageviews, sessions]) =>
    renderElement(
        html`<uaui-time-series-chart kind=${kind} .series=${series} .compareSeries=${[lastPeriod]} style="width:400px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );
const canvasOf = (el: Element) => shadow(el).querySelector("canvas")!;
const chartOf = (el: Element) => Chart.getChart(canvasOf(el))!;
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
// A short fingerprint of the drawn canvas, so a failure prints two hashes rather than two images.
const pixels = async (el: UauiTestElement) => {
    await settle(el);
    await nextFrame();
    const canvas = canvasOf(el);
    const { data } = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height);
    let hash = 2166136261;
    for (let i = 0; i < data.length; i++) hash = Math.imul(hash ^ data[i], 16777619);
    return `${canvas.width}x${canvas.height}:${(hash >>> 0).toString(16)}`;
};

/**
 * The baseline, read once the chart has stopped changing. A chart redraws after its first paint (once
 * `document.fonts` settles, after a resize, on a theme stylesheet change), and the baseline is read only once, so a
 * read between the first paint and that redraw would be a picture the chart never ends on. The chart drawn after the
 * product's changes is polled, so it may settle in its own time. Same pixels are still required.
 */
const settledPixels = async (el: UauiTestElement) => {
    await document.fonts.ready;
    let last = await pixels(el);
    let same = 0;
    for (let i = 0; i < 50 && same < 3; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        const next = await pixels(el);
        same = next === last ? same + 1 : 0;
        last = next;
    }
    return last;
};

// Every change is undone after each spec, as Chart.defaults and the registry are shared by the whole test run.
const undo: (() => void)[] = [];
const change = <T extends object, K extends keyof T>(target: T, key: K, value: T[K]) => {
    const before = target[key];
    target[key] = value;
    undo.push(() => (target[key] = before));
};
const register = (...items: Plugin[]) => {
    Chart.register(...items);
    undo.push(() => Chart.unregister(...items));
};
afterEach(() => {
    while (undo.length) undo.pop()!();
});

/** The Chart.js defaults a product is most likely to change for its own charts. */
const changeCommonDefaults = () => {
    const d = Chart.defaults;
    // A family no browser uses by default: Firefox's default, "serif", would match ours on a page without a UUI font.
    change(d, "font", { family: "ProductFont, fantasy", size: 20, style: "italic", weight: "bold", lineHeight: 2 });
    change(d, "color", "rgb(255, 0, 0)");
    change(d, "borderColor", "rgb(0, 255, 0)");
    change(d, "indexAxis", "y");
    change(d, "events", ["click"]);
    change(d.animation as object as { duration: number }, "duration", 2000);
    change(d.layout, "padding", 30);
    change(d.elements.bar, "borderRadius", 8);
    change(d.elements.line, "stepped", true);
    change(d.elements.line, "tension", 0.4);
    change(d.elements.point, "pointStyle", "rectRot");
    change(d.scale.grid, "lineWidth", 4);
    change(d.scale.ticks, "padding", 20);
    change(d.scale.ticks as object as { minRotation: number }, "minRotation", 45);
    change(d.scale.grid, "tickLength", 30);
    change(d.scale, "reverse", true);
    change(d.scale as object as { position: string }, "position", "right");
    change(d, "clip", 20);
    change(d.plugins.tooltip, "position", "nearest");
};

/** Rarer changes: data parsing, number locale, and the per-type `Chart.overrides`. */
const changeDataDefaultsAndOverrides = () => {
    const d = Chart.defaults as unknown as Record<string, unknown>;
    change(d, "parsing", false);
    change(d, "normalized", true);
    change(d, "locale", "ar-EG");
    const o = Chart.overrides as unknown as Record<"line" | "bar", Record<string, unknown>>;
    change(o.line, "showLine", false);
    change(o.line, "spanGaps", false);
    change(o.bar, "indexAxis", "y");
    change(o.bar, "grouped", false);
};

describe("Feature: the chart keeps its look when a product changes the shared Chart.js", () => {
    describe("Scenario: a product changes common Chart.defaults", () => {
        it.each(KINDS)("draws a %s chart with the same pixels", async (kind) => {
            const before = await settledPixels(await chart(kind));
            changeCommonDefaults();
            const after = await chart(kind);
            await expect.poll(() => pixels(after)).toBe(before);
        });

        it.each(KINDS)("draws a %s chart with the same pixels with data defaults and Chart.overrides changed", async (kind) => {
            const before = await settledPixels(await chart(kind));
            changeDataDefaultsAndOverrides();
            const after = await chart(kind);
            await expect.poll(() => pixels(after)).toBe(before);
        });

        it("keeps its own tick font and colour, its clip, and no animation", async () => {
            const clipsOf = (el: Element) =>
                chartOf(el).getSortedVisibleDatasetMetas().map((meta) => (meta as unknown as { _clip: object })._clip);
            // Chart.js's own clip, worked out from the line and dot sizes while Chart.defaults is untouched.
            const ownClips = clipsOf(await chart("line"));
            changeCommonDefaults();
            const el = await chart("line");
            const y = (chartOf(el).scales["y"].options as unknown as { ticks: { font: object; color: unknown } }).ticks;
            expect(y.font).toMatchObject({ size: 11, style: "normal", weight: "normal", lineHeight: 1.2 });
            // Our family is the one the element's text uses, never the product's.
            const ownFamily = getComputedStyle(shadow(el).querySelector(".probe")!).fontFamily;
            expect(ownFamily).not.toBe("");
            expect(y.font).toMatchObject({ family: ownFamily });
            expect(y.font).not.toMatchObject({ family: "ProductFont, fantasy" });
            expect(y.color).not.toBe("rgb(255, 0, 0)");
            expect(chartOf(el).options.animation).toBe(false);
            // Not `Chart.defaults.clip`, which would let a fill spill past the axes.
            expect(clipsOf(el)).toEqual(ownClips);
            expect(chartOf(el).options.indexAxis).toBe("x");
        });

        it("still shows its tooltip on hover", async () => {
            changeCommonDefaults();
            const el = await chart("line");
            const x = chartOf(el).getDatasetMeta(0).data[1].x;
            await userEvent.hover(page.elementLocator(canvasOf(el)), { position: { x, y: canvasOf(el).getBoundingClientRect().height / 2 } });
            const tooltip = shadow(el).querySelector("uaui-chart-tooltip") as HTMLElement;
            await expect.poll(() => tooltip.style.visibility).toBe("visible");
        });
    });

    describe("Scenario: a product registers plugins globally", () => {
        it.each(KINDS)("draws a %s chart with the same pixels", async (kind) => {
            const before = await settledPixels(await chart(kind));
            const paint: Plugin = {
                id: "productPaint",
                afterDatasetsDraw: ({ ctx, width, height }) => {
                    ctx.fillStyle = "rgb(255, 0, 0)";
                    ctx.fillRect(0, 0, width, height);
                },
            };
            register(paint, Legend, Title, Colors);
            change(Chart.defaults.plugins.title, "display", true);
            change(Chart.defaults.plugins.title, "text", "A product's title");
            change(Chart.defaults.plugins.colors, "forceOverride", true);
            const after = await chart(kind);
            await expect.poll(() => pixels(after)).toBe(before);
        });

        it("doesn't run a plugin registered after it was drawn, on a resize or an update", async () => {
            const el = await chart("line");
            const afterDraw = vi.fn();
            register({ id: "productLate", afterDraw });
            const ours = () => afterDraw.mock.calls.filter(([drawn]) => drawn === chartOf(el));
            // A resize makes Chart.js rebuild the chart's plugin list without a new model from us.
            el.style.width = "300px";
            await expect.poll(() => canvasOf(el).getBoundingClientRect().width).toBeLessThan(300);
            await nextFrame();
            expect(ours()).toHaveLength(0);
            el.series = [pageviews];
            await settle(el);
            await nextFrame();
            expect(ours()).toHaveLength(0);
        });

        it("leaves the plugin on for a product's own chart", async () => {
            const afterDraw = vi.fn();
            register({ id: "productOwn", afterDraw });
            const canvas = document.createElement("canvas");
            document.body.append(canvas);
            const own = new Chart(canvas, { type: "line", data: { labels: ["a"], datasets: [{ data: [1] }] }, options: { animation: false } });
            expect(afterDraw).toHaveBeenCalledWith(own, expect.anything(), expect.anything());
            own.destroy();
            canvas.remove();
        });
    });
});
