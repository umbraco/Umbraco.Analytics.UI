/// <reference types="vite/client" />
// T22 — Engage > Analytics page example: every part is wired to the one page, in every theme.
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { userEvent } from "vitest/browser";
import { axeRun } from "../../../internal/test/a11y.js";
import { renderPageExample, saveDateRange, withTheme } from "../../../internal/test/page-example.js";
import { deepQueryAll, deepText, settle, shadow, type UaxTestElement } from "../../../internal/test/dom.js";
import "./engage-analytics-page.element.js";

type Series = { points: unknown[] }[];
const chart = (page: Element) => shadow(page).querySelector("uax-time-series-chart")!;
const table = (page: Element) => shadow(page).querySelector("uax-data-table")!;
const dataRows = (page: Element) => [...shadow(table(page)).querySelectorAll("uui-table-row:not([part~='header'])")];
const firstRowText = (page: Element) => deepText(dataRows(page)[0]);
const header = (page: Element, label: string) =>
    [...shadow(table(page)).querySelectorAll("uui-table-head-cell")].find((h) => h.textContent?.includes(label)) as HTMLElement;

/** Renders the page with no pretend delay and waits until the chart and table have their data. */
async function renderPage(view: "pageviews" | "visitors" = "pageviews") {
    const host = await renderPageExample(
        html`<example-engage-analytics-page view=${view} .latency=${0}></example-engage-analytics-page>`,
        "example-engage-analytics-page",
    );
    await expect.poll(() => (chart(host).series as Series).length).toBeGreaterThan(0);
    await expect.poll(() => dataRows(host).length).toBeGreaterThan(0);
    await settle(host);
    return host;
}

describe("Feature: Engage analytics page example", () => {
    describe("Scenario: the page loads", () => {
        let page: UaxTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("draws the chart as an area", () => {
            expect(chart(page).kind).toBe("area");
        });

        it("draws the compare period on the chart", () => {
            expect((chart(page).compareSeries as Series).length).toBe(1);
        });

        it("draws the campaign markers on the chart", () => {
            expect((chart(page).markers as unknown[]).length).toBe(2);
        });

        it("shows a compare badge in the table", () => {
            expect(deepQueryAll(shadow(table(page)), "uax-delta-badge").length).toBeGreaterThan(0);
        });

        it("shows the total pageviews with its compare badge in the table toolbar", () => {
            expect(table(page).querySelectorAll("uax-delta-badge")).toHaveLength(1);
        });

        it("shows the first page of ten rows", () => {
            expect(dataRows(page)).toHaveLength(10);
        });
    });

    describe("Scenario: choosing another group by", () => {
        it("draws one point per week", async () => {
            const page = await renderPage();
            const week = shadow(shadow(page).querySelector("uax-group-by")!).querySelector("[data-value='week']") as HTMLElement;
            week.click();
            await expect.poll(() => (chart(page).series as Series)[0].points.length).toBe(5);
        });
    });

    describe("Scenario: saving another date range", () => {
        it("draws the chart for the new dates", async () => {
            const page = await renderPage();
            await saveDateRange(page, { from: "2026-06-01" });
            await expect.poll(() => (chart(page).series as Series)[0].points.length).toBe(23);
        });
    });

    describe("Scenario: clicking a sortable header", () => {
        it("loads the page with the least viewed pages first", async () => {
            const page = await renderPage();
            header(page, "Pageviews").click();
            await expect.poll(() => firstRowText(page)).toMatch(/\/(terms|stores\/odense)\//);
        });
    });

    describe("Scenario: going to the next page", () => {
        it("loads rows 11 to 20", async () => {
            const page = await renderPage();
            const pager = shadow(table(page)).querySelector("uax-compact-pager")!;
            const next = shadow(pager).querySelector(".next") as HTMLElement & { updateComplete: Promise<boolean> };
            await next.updateComplete;
            next.click();
            await expect.poll(() => firstRowText(page)).toContain("/stores/copenhagen/");
        });
    });

    describe("Scenario: searching", () => {
        it("loads only the matching pages", async () => {
            const page = await renderPage();
            const search = table(page).querySelector("uax-table-search")!;
            (shadow(search).querySelector("uui-input") as HTMLElement).focus();
            await userEvent.keyboard("walnut");
            await expect.poll(() => dataRows(page).length).toBe(1);
        });
    });

    describe("Scenario: the visitors view", () => {
        it("draws stacked bars", async () => {
            const page = await renderPage("visitors");
            expect(chart(page).kind).toBe("stacked-bar");
        });

        it("lists a row per user type", async () => {
            const page = await renderPage("visitors");
            expect(dataRows(page)).toHaveLength(2);
        });
    });

    describe("Scenario: a11y audit", () => {
        const audit = (view: "pageviews" | "visitors", themeCss?: string) =>
            withTheme(themeCss, async () => axeRun(await renderPage(view)));

        it("passes in the light theme", async () => {
            expect(await audit("pageviews")).toHaveNoViolations();
        });
        it("passes in the dark theme", async () => {
            expect(await audit("pageviews", darkCss)).toHaveNoViolations();
        });
        it("passes in the high contrast theme", async () => {
            expect(await audit("pageviews", highContrastCss)).toHaveNoViolations();
        });
        it("passes for the visitors view in the light theme", async () => {
            expect(await audit("visitors")).toHaveNoViolations();
        });
    });
});
