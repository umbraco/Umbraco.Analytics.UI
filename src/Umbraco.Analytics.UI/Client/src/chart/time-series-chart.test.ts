// CHT-1 — Line and area chart
// Canvas-only outcomes are checked with screenshot comparison (toMatchScreenshot). The first run
// writes the baseline; review it against docs/design/phase-1/screenshots before committing it.
import { beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";

const pageviews = { id: "pv", label: "Pageviews", points: [
    { date: "2026-06-01", value: 40 }, { date: "2026-06-02", value: 120 }, { date: "2026-06-03", value: 280 },
] };
const sessions = { id: "s", label: "Sessions", points: [
    { date: "2026-06-01", value: 12 }, { date: "2026-06-02", value: 30 }, { date: "2026-06-03", value: 61 },
] };

const hiddenTable = (el: Element) => shadow(el).querySelector("table") as HTMLTableElement;
const tooltip = (el: Element) => shadow(el).querySelector("[part~='tooltip']") as HTMLElement;
const hoverDate = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const box = canvas.getBoundingClientRect();
    await userEvent.hover(page.elementLocator(canvas), { position: { x: (box.width / 2) * index + 1, y: box.height / 2 } });
};

describe("Feature: line and area chart", () => {
    describe("Scenario: a line chart with two series", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-time-series-chart kind="line" .series=${[pageviews, sessions]} style="width:600px"></uan-time-series-chart>`,
                "uan-time-series-chart",
            );
        });

        it.skip("draws two lines", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-line-two-series");
        });

        it.skip("lists both series in the legend", () => {
            expect(shadow(el).querySelector("[part~='legend']")?.textContent).toMatch(/Pageviews[\s\S]*Sessions/);
        });

        it.skip("lists every date and value in a visually hidden table", () => {
            expect(hiddenTable(el).tBodies[0].rows).toHaveLength(3);
        });
    });

    describe("Scenario: an area chart", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-time-series-chart kind="area" .series=${[pageviews]} style="width:600px"></uan-time-series-chart>`,
                "uan-time-series-chart",
            );
        });

        it.skip("fills the area under the line", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-area");
        });
    });

    describe("Scenario: values from 40 to 280", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-time-series-chart kind="line" .series=${[pageviews]} style="width:600px"></uan-time-series-chart>`,
                "uan-time-series-chart",
            );
        });

        it.skip("starts the y-axis at 0", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-y-axis-from-zero");
        });
    });

    describe("Scenario: currency values", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-time-series-chart kind="line" .series=${[pageviews]}
                    .valueFormat=${{ style: "currency", currency: "EUR" }} style="width:600px"></uan-time-series-chart>`,
                "uan-time-series-chart",
            );
            await hoverDate(el, 2);
        });

        it.skip("shows euros in the tooltip", () => {
            expect(tooltip(el).textContent).toContain("€");
        });
    });

    describe("Scenario: hovering a date with two series", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-time-series-chart kind="line" .series=${[pageviews, sessions]} style="width:600px"></uan-time-series-chart>`,
                "uan-time-series-chart",
            );
            await hoverDate(el, 2);
        });

        it.skip("shows the date and each series' value", () => {
            expect(tooltip(el).textContent).toMatch(/Jun[\s\S]*280[\s\S]*61/);
        });
    });
});
