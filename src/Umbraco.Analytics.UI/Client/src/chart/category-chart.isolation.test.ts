// CHT-6 (T60) — The category chart keeps its look on a shared Chart.js, as the time-series chart does
// (time-series-chart.isolation.test.ts): a product's Chart.defaults changes and global plugins don't reach it.
import { Chart, Colors, Legend, Title, type Plugin } from "#platform/chart";
import { describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "#platform/lit";
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
import "./category-chart.element.js";

const categories = ["Mobile", "Tablet", "Desktop"].map((label) => ({ id: label.toLowerCase(), label }));
const points = (values: number[]) => values.map((value, i) => ({ category: categories[i].id, value }));
const visits = { id: "visits", label: "Visits", points: points([40, 120, 280]) };
const orders = { id: "orders", label: "Orders", points: points([12, 30, 61]) };
const lastPeriod = { id: "visits", label: "Visits", points: points([60, 90, 200]) };

const KINDS = ["bar", "stacked-bar", "bar log"] as const;

const chart = (variant: string) => {
    const [kind, extra] = variant.split(" ");
    return renderElement(
        html`<uaui-category-chart kind=${kind} y-scale=${extra === "log" ? "log" : "linear"} .categories=${categories}
            .series=${[visits, orders]} .compareSeries=${[lastPeriod]} style="width:400px"></uaui-category-chart>`,
        "uaui-category-chart",
    );
};

describe("Feature: the category chart keeps its look when a product changes the shared Chart.js", () => {
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

        it("keeps its own tick font and colour, no animation and a vertical x-axis", async () => {
            changeCommonDefaults();
            const el = await chart("bar");
            const y = (chartOf(el).scales["y"].options as unknown as { ticks: { font: object; color: unknown } }).ticks;
            expect(y.font).toMatchObject({ size: 11, style: "normal", weight: "normal", lineHeight: 1.2 });
            expect(y.font).not.toMatchObject({ family: "ProductFont, fantasy" });
            expect(y.color).not.toBe("rgb(255, 0, 0)");
            expect(chartOf(el).options.animation).toBe(false);
            expect(chartOf(el).options.indexAxis).toBe("x");
        });

        it("still shows its tooltip on hover", async () => {
            changeCommonDefaults();
            const el = await chart("bar");
            const x = chartOf(el).getDatasetMeta(0).data[1].x;
            await userEvent.hover(page.elementLocator(canvasOf(el)), { position: { x, y: canvasOf(el).getBoundingClientRect().height / 2 } });
            const tooltip = shadow(el).querySelector("uaui-chart-tooltip") as HTMLElement;
            await expect.poll(() => tooltip?.style.visibility).toBe("visible");
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

        it("doesn't run a plugin registered after it was drawn, on an update", async () => {
            const el = await chart("bar");
            const afterDraw = vi.fn();
            register({ id: "productLate", afterDraw });
            el.series = [visits];
            await settle(el);
            await nextFrame();
            expect(afterDraw.mock.calls.filter(([drawn]) => drawn === chartOf(el))).toHaveLength(0);
        });
    });
});
