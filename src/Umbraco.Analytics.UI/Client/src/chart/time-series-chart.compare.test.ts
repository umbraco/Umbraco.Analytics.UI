// CHT-2 — Compare with another period
import { beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { screenshotIt } from "../internal/test/screenshot.js";
import { renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";

const current = { id: "pv", label: "Pageviews", points: [
    { date: "2026-05-25", value: 60 }, { date: "2026-05-26", value: 90 }, { date: "2026-05-27", value: 120 },
] };
const previous = { id: "pv", label: "Pageviews", points: [
    { date: "2026-04-25", value: 50 }, { date: "2026-04-26", value: 70 }, { date: "2026-04-27", value: 110 },
] };
const compareLabel = "Apr 25, 2026 – May 24, 2026";

const renderChart = () =>
    renderElement(
        html`<uax-time-series-chart kind="line" .series=${[current]} .compareSeries=${[previous]}
            compare-label=${compareLabel} style="width:600px"></uax-time-series-chart>`,
        "uax-time-series-chart",
    );

describe("Feature: compare with another period", () => {
    describe("Scenario: a line chart with a compare series", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderChart();
        });

        screenshotIt.skip("draws the compare series as a dashed --uax-compare line", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-compare-dashed");
        });

        screenshotIt.skip("shades the gap between the lines", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-compare-gap");
        });

        it.skip("puts the first compare point under the first current point", () => {
            expect(shadow(el).querySelector("table")!.tBodies[0].rows[0].textContent).toMatch(/60[\s\S]*50/);
        });

        it.skip("shows the compare range in the legend", () => {
            expect(shadow(el).querySelector("[part~='legend']")?.textContent).toContain(compareLabel);
        });
    });

    describe("Scenario: hovering a date while comparing", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderChart();
            const canvas = shadow(el).querySelector("canvas")!;
            const box = canvas.getBoundingClientRect();
            await userEvent.hover(page.elementLocator(canvas), { position: { x: box.width - 2, y: box.height / 2 } });
        });

        it.skip("shows the current value, the compare value and a change badge", () => {
            expect(shadow(el).querySelector("[part~='tooltip'] uax-delta-badge")).not.toBe(null);
        });
    });
});
