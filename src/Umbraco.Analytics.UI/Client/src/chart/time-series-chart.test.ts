// CHT-1 — Line and area chart
// Canvas-only outcomes are checked with screenshot comparison (toMatchScreenshot). The first run
// writes the baseline; review it against docs/design/phase-1/screenshots before committing it.
import { Chart } from "chart.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { screenshotIt } from "../internal/test/screenshot.js";
import { renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";
import "./time-series-chart.element.js";

const pageviews = { id: "pv", label: "Pageviews", points: [
    { date: "2026-06-01", value: 40 }, { date: "2026-06-02", value: 120 }, { date: "2026-06-03", value: 280 },
] };
const sessions = { id: "s", label: "Sessions", points: [
    { date: "2026-06-01", value: 12 }, { date: "2026-06-02", value: 30 }, { date: "2026-06-03", value: 61 },
] };

const hiddenTable = (el: Element) => shadow(el).querySelector("table") as HTMLTableElement;
const tooltip = (el: Element) => shadow(el).querySelector(".tooltip") as HTMLElement;
// Moves the pointer onto the nth date, at the x Chart.js drew that point.
const hoverDate = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const x = Chart.getChart(canvas)!.getDatasetMeta(0).data[index].x;
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
};

describe("Feature: line and area chart", () => {
    describe("Scenario: a line chart with two series", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-time-series-chart kind="line" .series=${[pageviews, sessions]} style="width:400px"></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
        });

        screenshotIt("draws two lines", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-line-two-series");
        });

        it("lists both series in the legend", () => {
            expect(shadow(el).querySelector(".legend")?.textContent).toMatch(/Pageviews[\s\S]*Sessions/);
        });

        it("lists every date and value in a visually hidden table", () => {
            expect(hiddenTable(el).tBodies[0].rows).toHaveLength(3);
        });
    });

    describe("Scenario: an area chart", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-time-series-chart kind="area" .series=${[pageviews]} style="width:400px"></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
        });

        screenshotIt("fills the area under the line", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-area");
        });
    });

    describe("Scenario: values from 40 to 280", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-time-series-chart kind="line" .series=${[pageviews]} style="width:400px"></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
        });

        screenshotIt("starts the y-axis at 0", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-y-axis-from-zero");
        });
    });

    describe("Scenario: currency values", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-time-series-chart kind="line" .series=${[pageviews]}
                    .valueFormat=${{ style: "currency", currency: "EUR" }} style="width:400px"></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
            await hoverDate(el, 2);
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
        });

        it("shows euros in the tooltip", () => {
            expect(tooltip(el).textContent).toContain("€");
        });
    });

    describe("Scenario: hovering a date with two series", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-time-series-chart kind="line" .series=${[pageviews, sessions]} style="width:400px"></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
            await hoverDate(el, 2);
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
        });

        it("shows the date and each series' value", () => {
            expect(tooltip(el).textContent).toMatch(/Jun[\s\S]*280[\s\S]*61/);
        });
    });
});

describe("Feature: hovering a chart", () => {
    describe("Scenario: hovering several dates", () => {
        let el: UaxTestElement;
        let row: HTMLTableRowElement;
        let formattersBuilt: number;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-time-series-chart kind="line" .series=${[pageviews, sessions]} style="width:400px"></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
            row = hiddenTable(el).tBodies[0].rows[0];
            const formatter = vi.spyOn(Intl, "NumberFormat");
            await hoverDate(el, 0);
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
            await hoverDate(el, 1);
            await el.updateComplete;
            formattersBuilt = formatter.mock.calls.length;
            formatter.mockRestore();
        });

        it("doesn't format any numbers again", () => {
            expect(formattersBuilt).toBe(0);
        });

        it("keeps the hidden table's rows", () => {
            expect(hiddenTable(el).tBodies[0].rows[0]).toBe(row);
        });
    });
});
