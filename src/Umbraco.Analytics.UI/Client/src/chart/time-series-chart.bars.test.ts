// CHT-3 — Bar and stacked bar chart
import { beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, type UanTestElement } from "../internal/test/pending.js";

const returning = { id: "r", label: "Returning visitor", points: [
    { date: "2026-06-01", value: 1 }, { date: "2026-06-02", value: 2 }, { date: "2026-06-03", value: 0 },
] };
const newVisitors = { id: "n", label: "New visitor", points: [
    { date: "2026-06-01", value: 3 }, { date: "2026-06-02", value: 1 }, { date: "2026-06-03", value: 2 },
] };
const previousTotals = { id: "total", label: "Visitors", points: [
    { date: "2026-05-01", value: 2 }, { date: "2026-05-02", value: 4 }, { date: "2026-05-03", value: 1 },
] };

const chart = (kind: string, series: unknown[], compare?: unknown[]) =>
    renderElement(
        html`<uan-time-series-chart kind=${kind} .series=${series} .compareSeries=${compare} style="width:600px"></uan-time-series-chart>`,
        "uan-time-series-chart",
    );

describe("Feature: bar and stacked bar chart", () => {
    describe("Scenario: a bar chart", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await chart("bar", [returning]);
        });

        it.skip("draws each point as a bar", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-bar");
        });

        it.skip("draws no curve or line between bars", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-bar-no-line");
        });
    });

    describe("Scenario: a stacked bar chart", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await chart("stacked-bar", [returning, newVisitors]);
        });

        it.skip("stacks both series in one bar per date", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-stacked-bar");
        });
    });

    describe("Scenario: a stacked bar chart with a compare series", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await chart("stacked-bar", [returning, newVisitors], [previousTotals]);
        });

        it.skip("draws the compare total behind each current bar", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-stacked-bar-compare");
        });
    });
});
