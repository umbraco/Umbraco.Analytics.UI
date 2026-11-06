// EMP-6 — Commerce example shows empty days.
// The store opened on 1 Jan 2026 (STORE_OPENED): before it a rate has nothing to divide by, and a count is 0.
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { chartOf } from "../../../internal/test/chart.js";
import { renderPageExample } from "../../../internal/test/page-example.js";
import { settle, shadow, type UauiTestElement } from "../../../internal/test/dom.js";
import type { UauiDateRange } from "../../../date-range/types.js";
import type { UauiTimeSeriesChartElement } from "../../../chart/time-series-chart.element.js";
import type { UauiKpiTileElement } from "../../../kpi-tile/kpi-tile.element.js";
import "./commerce-analytics-page.element.js";

const aroundOpening: UauiDateRange = { from: "2025-12-25", to: "2026-01-07" };

const chart = (page: Element) => shadow(page).querySelector("uaui-time-series-chart") as UauiTimeSeriesChartElement;
const tile = (page: Element, label: string) => [...shadow(page).querySelectorAll<UauiKpiTileElement>("uaui-kpi-tile")].find((t) => t.label === label)!;

/** Renders the page, picks `aroundOpening` (as Save in the date range dialog does) and the metric, and waits for the chart. */
async function renderPage(metric: string): Promise<UauiTestElement> {
    const page = await renderPageExample(
        html`<example-commerce-analytics-page .latency=${0}></example-commerce-analytics-page>`,
        "example-commerce-analytics-page",
    );
    shadow(page).querySelector("uaui-date-range")!.dispatchEvent(new CustomEvent("change", { detail: { value: aroundOpening } }));
    await expect.poll(() => chart(page).range?.from === aroundOpening.from && !chart(page).loading && chart(page).series.length > 0).toBe(true);
    (shadow(tile(page, metric)).querySelector("button") as HTMLElement).click();
    await page.updateComplete;
    await settle(chart(page));
    return page;
}

describe("Feature: the Commerce example shows empty days", () => {
    describe("Scenario: every day of the range", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage("Cart conversion");
        });

        it("has 14 slots", () => {
            expect(chartOf(chart(page)).data.labels).toHaveLength(14);
        });
    });

    describe("Scenario: nothing before the store opened", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage("Cart conversion");
        });

        it("has no value in the slots 2025-12-25 to 2025-12-31", () => {
            expect(chartOf(chart(page)).data.datasets[0].data.slice(0, 7)).toEqual([null, null, null, null, null, null, null]);
        });
    });

    describe("Sad path", () => {
        describe("Scenario: counts still show 0", () => {
            let page: UauiTestElement;
            beforeEach(async () => {
                page = await renderPage("Orders");
            });

            it("has 0 in the slot of 2025-12-25", () => {
                expect(chartOf(chart(page)).data.datasets[0].data[0]).toBe(0);
            });
        });
    });
});
