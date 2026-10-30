/// <reference types="vite/client" />
// T22 — Commerce > Analytics page example: every part is wired to the one page, in every theme.
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { userEvent } from "vitest/browser";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { axeRun } from "../../../internal/test/a11y.js";
import { renderPageExample, saveDateRange, withTheme } from "../../../internal/test/page-example.js";
import { deepQuery, deepText, shadow, settle, type UaxTestElement } from "../../../internal/test/dom.js";
import "./commerce-analytics-page.element.js";
import type { UaxTimeSeriesChartElement } from "../../../chart/time-series-chart.element.js";
import type { UaxKpiTileElement } from "../../../kpi-tile/kpi-tile.element.js";

/** Renders the page and waits until every part has its data. */
async function renderPage(): Promise<UaxTestElement> {
    const page = await renderPageExample(
        html`<example-commerce-analytics-page .latency=${0}></example-commerce-analytics-page>`,
        "example-commerce-analytics-page",
    );
    await expect.poll(() => tiles(page)[0].loading === false && buyersTable(page).loading === false).toBe(true);
    await settle(page);
    return page;
}

const tiles = (page: Element) => [...shadow(page).querySelectorAll<UaxKpiTileElement>("uax-kpi-tile")];
const tile = (page: Element, label: string) => tiles(page).find((t) => t.label === label)!;
const chart = (page: Element) => shadow(page).querySelector("uax-time-series-chart") as UaxTimeSeriesChartElement;
const buyersTable = (page: Element) =>
    shadow(page).querySelector("uax-data-table[mode='server']") as UaxTestElement & { loading: boolean };
const buyerCells = (page: Element, column: number) =>
    [...shadow(buyersTable(page)).querySelectorAll(`uui-table-row uui-table-cell:nth-child(${column})`)].map((c) => deepText(c).trim());
const buyerNames = (page: Element) => buyerCells(page, 1);

describe("Feature: the Commerce analytics page", () => {
    describe("Scenario: accessibility", () => {
        const audit = (themeCss?: string) => withTheme(themeCss, async () => axeRun(await renderPage()));

        it("passes the a11y audit in the light theme", async () => {
            expect(await audit()).toHaveNoViolations();
        });

        it("passes the a11y audit in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });

        it("passes the a11y audit in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });
    });

    describe("Scenario: pressing a KPI tile", () => {
        let page: UaxTestElement;
        beforeEach(async () => {
            page = await renderPage();
            (shadow(tile(page, "Orders")).querySelector("button") as HTMLElement).click();
            await page.updateComplete;
        });

        it("switches the chart to that metric", () => {
            expect(chart(page).series[0].id).toBe("orders");
        });
    });

    describe("Scenario: choosing a new date range", () => {
        let page: UaxTestElement;
        let before: string;
        beforeEach(async () => {
            page = await renderPage();
            before = deepText(tile(page, "Revenue"));
            await saveDateRange(page, { from: "2026-03-01", to: "2026-03-30", compare: "off" });
            await expect.poll(() => tile(page, "Revenue").loading === false && deepText(tile(page, "Revenue")) !== before).toBe(true);
        });

        it("reloads the KPI tiles", () => {
            expect(deepText(tile(page, "Revenue"))).not.toBe(before);
        });

        it("drops the compare line when compare is off", () => {
            expect(chart(page).compareSeries).toHaveLength(0);
        });
    });

    describe("Scenario (sad path): a range before the store opened", () => {
        let page: UaxTestElement;
        beforeEach(async () => {
            page = await renderPage();
            await saveDateRange(page, { from: "2025-11-01", to: "2025-11-30", compare: "off" });
            await expect.poll(() => chart(page).series.length === 0 && !chart(page).loading).toBe(true);
            await settle(chart(page));
        });

        it("shows the chart's empty state", () => {
            expect(deepQuery(shadow(chart(page)), "uax-empty-state")).not.toBe(null);
        });

        it("shows the KPI tiles as having no data, not as 0", () => {
            expect(tile(page, "Revenue").noData).toBe(true);
        });
    });

    describe("Scenario: sorting top buyers", () => {
        let page: UaxTestElement;
        beforeEach(async () => {
            page = await renderPage();
            const header = [...shadow(buyersTable(page)).querySelectorAll("uui-table-head-cell")].find((h) =>
                h.textContent?.includes("Orders"),
            ) as HTMLElement;
            header.click();
        });

        it("asks for the rows in that order", async () => {
            await expect
                .poll(() => {
                    const orders = buyerCells(page, 3).map(Number);
                    return JSON.stringify(orders) === JSON.stringify([...orders].sort((a, b) => a - b));
                })
                .toBe(true);
        });
    });

    describe("Scenario: paging top buyers", () => {
        let page: UaxTestElement;
        let firstPage: string[];
        beforeEach(async () => {
            page = await renderPage();
            firstPage = buyerNames(page);
            const pager = shadow(buyersTable(page)).querySelector("uax-compact-pager") as HTMLElement;
            const next = shadow(pager).querySelector(".next") as HTMLElement & { updateComplete: Promise<boolean> };
            await next.updateComplete;
            next.click();
        });

        it("shows the next page of buyers", async () => {
            await expect.poll(() => buyerNames(page)).not.toEqual(firstPage);
        });
    });

    describe("Scenario: searching top buyers", () => {
        let page: UaxTestElement;
        beforeEach(async () => {
            page = await renderPage();
            const search = shadow(buyersTable(page)).querySelector("slot[name='toolbar']") as HTMLSlotElement;
            const box = search.assignedElements()[0].querySelector("uax-table-search") as HTMLElement;
            (shadow(box).querySelector("input, uui-input") as HTMLElement).focus();
            await userEvent.keyboard("ada");
        });

        it("asks for only the buyers that match", async () => {
            await expect.poll(() => buyerNames(page)).toEqual(["Ada Example"]);
        });
    });
});
