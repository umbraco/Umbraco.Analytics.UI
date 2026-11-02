// CHT-6 — The chart keeps its look on a shared Chart.js
// Chart.js is shared through `@umbraco/analytics-ui/external/chart.js`, so a product's global registrations and
// `Chart.defaults` changes reach our chart's Chart.js too. These specs change them as a careless product would and
// check our chart draws the same pixels and keeps its own options.
import { Chart, Colors, Legend, Title, type Plugin } from "@umbraco/analytics-ui/external/chart.js";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import {
    baseline,
    canvasOf,
    change,
    changeCommonDefaults,
    changeDataDefaultsAndOverrides,
    chartOf,
    expectSamePixels,
    nextFrame,
    register,
} from "../internal/test/chart-isolation.js";
import { renderElement, settle, shadow } from "../internal/test/dom.js";
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

// The four kinds, then (T58) bars with a line series stacked, a log axis, and a today line, then (T59) the share view
// as stacked bars and as bands.
const KINDS = ["line", "area", "bar", "stacked-bar", "stacked-bar+line", "bar log", "bar today", "stacked-bar share", "area share"] as const;

const chart = (variant: string, series: unknown[] = [pageviews, sessions]) => {
    const [kind, extra] = variant.split(" ");
    const mixed = kind === "stacked-bar+line";
    return renderElement(
        html`<uaui-time-series-chart kind=${mixed ? "stacked-bar" : kind} y-scale=${extra === "log" ? "log" : "linear"}
            stack=${extra === "share" ? "percent" : "normal"}
            .today=${extra === "today" ? "2026-06-02" : undefined}
            .series=${mixed ? [pageviews, { ...sessions, kind: "line" }] : series} .compareSeries=${extra === "share" ? [] : [lastPeriod]} style="width:400px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );
};

describe("Feature: the chart keeps its look when a product changes the shared Chart.js", () => {
    describe("Scenario: a product changes common Chart.defaults", () => {
        it.each(KINDS)("draws a %s chart with the same pixels", async (kind) => {
            const before = await baseline(await chart(kind));
            changeCommonDefaults();
            const after = await chart(kind);
            await expectSamePixels(before, after, () => chart(kind));
        });

        it.each(KINDS)("draws a %s chart with the same pixels with data defaults and Chart.overrides changed", async (kind) => {
            const before = await baseline(await chart(kind));
            changeDataDefaultsAndOverrides();
            const after = await chart(kind);
            await expectSamePixels(before, after, () => chart(kind));
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
            const before = await baseline(await chart(kind));
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
            await expectSamePixels(before, after, () => chart(kind));
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
