// T60 — UauiChartController on its own, now that two charts use it: it creates and draws the Chart.js chart when
// invalidated, destroys it on disconnect and builds it again on reconnect, dismisses the hover with Escape, and warns
// once per id.
import { Chart } from "@umbraco/analytics-ui/external/chart.js";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html, nothing, type PropertyValues } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { renderElement, shadow } from "../../internal/test/dom.js";
import { UauiChartController } from "./chart.controller.js";
import { renderChartFrame, UauiChartFrameStyles } from "./chart-frame.js";
import "./chart-tooltip.element.js";

/** The smallest chart element: the frame, one series of bars, and the tooltip while hovering. */
class TestChartElement extends UmbLitElement {
    static override properties = { values: { attribute: false } };
    static override styles = UauiChartFrameStyles;

    values = [1, 2, 3];
    draws = 0;
    readonly chart = new UauiChartController(this, {
        colorKeys: () => [1],
        draw: (renderer, colors) => {
            this.draws++;
            renderer.update({
                kind: "bar",
                labels: ["a", "b", "c"],
                datasets: [{ label: "A", kind: "bar", values: this.values }],
                yMax: 4,
                yStep: 1,
                formatTick: String,
                colors,
            });
        },
    });

    protected override willUpdate(changed: PropertyValues) {
        if (changed.has("values")) this.chart.invalidate();
    }

    override render() {
        const hover = this.chart.hover;
        return renderChartFrame({
            label: "Chart",
            hasData: true,
            loading: false,
            error: false,
            retryable: false,
            tooltip: hover ? html`<uaui-chart-tooltip style="visibility:hidden" heading=${String(hover.index)}></uaui-chart-tooltip>` : nothing,
            legend: () => nothing,
            table: () => nothing,
        });
    }
}
customElements.define("uaui-test-controller-chart", TestChartElement);

const render = async () =>
    (await renderElement(html`<uaui-test-controller-chart style="width:300px"></uaui-test-controller-chart>`, "uaui-test-controller-chart")) as unknown as TestChartElement;
const canvas = (el: Element) => shadow(el).querySelector("canvas")!;
const hoverBar = async (el: TestChartElement, index: number) => {
    const x = Chart.getChart(canvas(el))!.getDatasetMeta(0).data[index].x;
    await userEvent.hover(page.elementLocator(canvas(el)), { position: { x, y: canvas(el).getBoundingClientRect().height / 2 } });
    await expect.poll(() => el.chart.hover?.index).toBe(index);
};

describe("Feature: the chart controller", () => {
    describe("Scenario: drawing", () => {
        it("creates the chart on the first update that has the canvas, and draws it once", async () => {
            const el = await render();
            expect(el.chart.created).toBe(true);
            expect(Chart.getChart(canvas(el))).toBeDefined();
            expect(el.draws).toBe(1);
        });

        it("draws again only when invalidated", async () => {
            const el = await render();
            el.requestUpdate();
            await el.updateComplete;
            expect(el.draws).toBe(1);
            el.values = [3, 2, 1];
            el.requestUpdate("values");
            await el.updateComplete;
            expect(el.draws).toBe(2);
            expect(Chart.getChart(canvas(el))!.data.datasets[0].data).toEqual([3, 2, 1]);
        });
    });

    describe("Scenario: disconnect and reconnect", () => {
        it("destroys the chart on disconnect, and builds and draws a new one on reconnect", async () => {
            const el = await render();
            const parent = el.parentElement!;
            const first = Chart.getChart(canvas(el));
            el.remove();
            expect(el.chart.created).toBe(false);
            expect(Chart.getChart(canvas(el))).toBeUndefined();
            parent.appendChild(el);
            await el.updateComplete;
            expect(el.chart.created).toBe(true);
            const second = Chart.getChart(canvas(el));
            expect(second).toBeDefined();
            expect(second).not.toBe(first);
            expect(el.draws).toBe(2);
        });

        it("drops the hover on disconnect", async () => {
            const el = await render();
            await hoverBar(el, 1);
            const parent = el.parentElement!;
            el.remove();
            expect(el.chart.hover).toBeUndefined();
            parent.appendChild(el);
            await el.updateComplete;
        });

        it("builds nothing for an update that runs after disconnect", async () => {
            const el = await render();
            el.values = [2, 2, 2];
            el.requestUpdate("values");
            el.remove();
            await el.updateComplete;
            expect(el.chart.created).toBe(false);
        });
    });

    describe("Scenario: hover and Escape", () => {
        let el: TestChartElement;
        beforeEach(async () => {
            el = await render();
            await hoverBar(el, 1);
        });

        it("holds the x value the pointer is on, and places the tooltip beside it", async () => {
            const tip = shadow(el).querySelector<HTMLElement>("uaui-chart-tooltip")!;
            await expect.poll(() => tip.style.visibility).toBe("visible");
        });

        it("dismisses the hover with Escape (WCAG 1.4.13), and the element re-renders without its tooltip", async () => {
            await userEvent.keyboard("{Escape}");
            expect(el.chart.hover).toBeUndefined();
            await el.updateComplete;
            expect(shadow(el).querySelector("uaui-chart-tooltip")).toBe(null);
        });

        it("ignores other keys", async () => {
            await userEvent.keyboard("{Enter}");
            expect(el.chart.hover?.index).toBe(1);
        });

        it("shows the hover again once the pointer moves to another x value", async () => {
            await userEvent.keyboard("{Escape}");
            await hoverBar(el, 2);
            expect(el.chart.hover?.index).toBe(2);
        });

        it("stops listening for Escape once disconnected", async () => {
            const parent = el.parentElement!;
            el.remove();
            const update = vi.spyOn(el, "requestUpdate");
            document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
            expect(update).not.toHaveBeenCalled();
            update.mockRestore();
            parent.appendChild(el);
            await el.updateComplete;
        });
    });

    describe("Scenario: warnings", () => {
        let warn: MockInstance<typeof console.warn>;
        beforeEach(() => {
            warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        });
        afterEach(() => warn.mockRestore());

        it("warns once per id, naming the element", async () => {
            const el = await render();
            el.chart.warnOnce("a", "first");
            el.chart.warnOnce("a", "first again");
            el.chart.warnOnce("b", "second");
            expect(warn.mock.calls.map(([message]) => message)).toEqual(["[uaui] uaui-test-controller-chart: first", "[uaui] uaui-test-controller-chart: second"]);
        });

        it("warns per chart, not once for every chart", async () => {
            const one = await render();
            const two = await render();
            one.chart.warnOnce("a", "same");
            two.chart.warnOnce("a", "same");
            expect(warn).toHaveBeenCalledTimes(2);
        });
    });
});
