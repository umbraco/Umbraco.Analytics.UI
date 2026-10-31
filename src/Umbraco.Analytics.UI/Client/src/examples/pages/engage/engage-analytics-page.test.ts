/// <reference types="vite/client" />
// T22 — Engage > Analytics page example: every part is wired to the one page, in every theme.
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { userEvent } from "vitest/browser";
import { axeRun } from "../../../internal/test/a11y.js";
import { renderPageExample, saveDateRange, withTheme } from "../../../internal/test/page-example.js";
import { deepQuery, deepQueryAll, deepText, settle, shadow, type UauiTestElement } from "../../../internal/test/dom.js";
import "./engage-analytics-page.element.js";

type Series = { points: unknown[] }[];
const chart = (page: Element) => shadow(page).querySelector("uaui-time-series-chart")!;
const table = (page: Element) => shadow(page).querySelector("uaui-data-table")!;
const dataRows = (page: Element) => [...shadow(table(page)).querySelectorAll("uui-table-row:not(.summary)")];
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
        let page: UauiTestElement;
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
            expect(deepQueryAll(shadow(table(page)), "uaui-delta-badge").length).toBeGreaterThan(0);
        });

        it("shows the total pageviews with its compare badge in the table's summary row", () => {
            expect(table(page).querySelectorAll("[slot='summary-pageviews'] uaui-delta-badge")).toHaveLength(1);
        });

        it("puts the total under the Pageviews column", () => {
            const total = table(page).querySelector("[slot='summary-pageviews']")!.getBoundingClientRect();
            const head = header(page, "Pageviews").getBoundingClientRect();
            expect([Math.round(total.left) >= Math.round(head.left), Math.round(total.right) <= Math.round(head.right)]).toEqual([true, true]);
        });

        it("keeps the summary row out of the toolbar", () => {
            expect(table(page).querySelectorAll("[slot='toolbar'] uaui-delta-badge")).toHaveLength(0);
        });

        it("shows the first page of ten rows", () => {
            expect(dataRows(page)).toHaveLength(10);
        });
    });

    describe("Scenario: choosing another group by", () => {
        it("draws one point per week", async () => {
            const page = await renderPage();
            const week = deepQuery<HTMLElement>(shadow(page).querySelector("uaui-group-by")!.shadowRoot!, "[data-value='week']")!;
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
            const pager = shadow(table(page)).querySelector("uaui-compact-pager")!;
            const next = shadow(pager).querySelector(".next") as HTMLElement & { updateComplete: Promise<boolean> };
            await next.updateComplete;
            next.click();
            await expect.poll(() => firstRowText(page)).toContain("/stores/copenhagen/");
        });
    });

    describe("Scenario: searching", () => {
        it("loads only the matching pages", async () => {
            const page = await renderPage();
            const search = table(page).querySelector("uaui-table-search")!;
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

        it("shows the total visitors under the Visitors column", async () => {
            const page = await renderPage("visitors");
            expect(table(page).querySelectorAll("[slot='summary-visitors']")).toHaveLength(1);
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

    describe("Scenario: the API fails", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPageExample(
                html`<example-engage-analytics-page .latency=${0} failing></example-engage-analytics-page>`,
                "example-engage-analytics-page",
            );
            await expect.poll(() => chart(page).error).toBe(true);
            await expect.poll(() => table(page).error).toBe(true);
            await settle(page);
        });

        it("shows the chart's error state", () => {
            expect(shadow(chart(page)).querySelector("uaui-error-state")).not.toBe(null);
        });

        it("shows the table's error state", () => {
            expect(shadow(table(page)).querySelector("uaui-error-state")).not.toBe(null);
        });

        it("offers Retry on the chart", () => {
            expect(chart(page).retryable).toBe(true);
        });

        it("loads the chart again when its Retry is pressed", async () => {
            (page as unknown as { failing: boolean }).failing = false;
            chart(page).dispatchEvent(new Event("retry", { bubbles: true }));
            await expect.poll(() => chart(page).error).toBe(false);
        });

        it("loads the table again when its Retry is pressed", async () => {
            (page as unknown as { failing: boolean }).failing = false;
            table(page).dispatchEvent(new Event("retry", { bubbles: true }));
            await expect.poll(() => table(page).error).toBe(false);
        });
    });
});
