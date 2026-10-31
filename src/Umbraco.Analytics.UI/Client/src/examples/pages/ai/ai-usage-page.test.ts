/// <reference types="vite/client" />
// T22 — Umbraco AI > Usage page example: every part is wired to the one page, in every theme.
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { axeRun } from "../../../internal/test/a11y.js";
import { renderPageExample, saveDateRange, withTheme } from "../../../internal/test/page-example.js";
import { deepQuery, deepQueryAll, deepText, settle, shadow, type UauiTestElement } from "../../../internal/test/dom.js";
import "./ai-usage-page.element.js";
import type { UauiKpiTileElement } from "../../../kpi-tile/kpi-tile.element.js";
import type { UauiTimeSeriesChartElement } from "../../../chart/time-series-chart.element.js";
import type { UauiDataTableElement } from "../../../table/data-table.element.js";

const tiles = (page: Element) => [...shadow(page).querySelectorAll<UauiKpiTileElement>("uaui-kpi-tile")];
const tile = (page: Element, label: string) => tiles(page).find((t) => t.label === label)!;
const chart = (page: Element) => shadow(page).querySelector("uaui-time-series-chart") as UauiTimeSeriesChartElement;
const table = (page: Element) => shadow(page).querySelector("uaui-data-table") as UauiDataTableElement;
const rowNames = (page: Element) =>
    [...shadow(table(page)).querySelectorAll("uui-table-row:not([part~='header']):not(.summary) uui-table-cell:first-child")].map((c) => deepText(c).trim());
const press = async (t: UauiKpiTileElement) => {
    await t.updateComplete;
    (t.shadowRoot!.querySelector("button") as HTMLButtonElement).click();
};

/** Renders the page and waits until its first load has landed in the tiles, the chart and the table. */
async function renderPage(): Promise<UauiTestElement> {
    const page = await renderPageExample(html`<example-ai-usage-page .latency=${0}></example-ai-usage-page>`, "example-ai-usage-page");
    await expect.poll(() => tile(page, "Requests").value).toBeTruthy();
    await expect.poll(() => rowNames(page).length).toBeGreaterThan(0);
    await settle(page);
    return page;
}

describe("Feature: Umbraco AI usage page", () => {
    // Pin the formatting language so the numbers read the same on every machine.
    const previousLanguage = umbLocalizationManager.documentLanguage;
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
        return () => {
            umbLocalizationManager.documentLanguage = previousLanguage;
        };
    });

    describe("Scenario: accessibility", () => {
        const audit = (themeCss?: string) =>
            withTheme(themeCss, async () => {
                const page = await renderPage();
                // Let the chart paint, as it does a frame after the data lands.
                await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                return axeRun(page);
            });

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

    describe("Scenario: first load", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("shows six KPI tiles", () => {
            expect(tiles(page).map((t) => t.label)).toEqual(["Requests", "Input tokens", "Output tokens", "Total tokens", "Success rate", "Avg duration"]);
        });

        it("shows a change badge on the requests tile, from the comparison period", () => {
            expect(shadow(tile(page, "Requests")).querySelector("uaui-delta-badge")).not.toBe(null);
        });

        it("shows the success rate change in percentage points", () => {
            expect(tile(page, "Success rate").deltaUnit).toBe("points");
        });

        it("stacks succeeded and failed requests on the chart", () => {
            expect(chart(page).series.map((s) => s.id)).toEqual(["succeeded", "failed"]);
        });

        it("draws the chart as stacked bars", () => {
            expect(chart(page).kind).toBe("stacked-bar");
        });

        it("shows one page of the breakdown table", () => {
            expect(rowNames(page)).toHaveLength(5);
        });
    });

    describe("Scenario: pressing a KPI tile", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            await press(tile(page, "Total tokens"));
            await settle(page);
        });

        it("switches the chart to that metric", () => {
            expect(chart(page).series.map((s) => s.id)).toEqual(["input", "output"]);
        });

        it("marks the pressed tile as selected", () => {
            expect(tile(page, "Total tokens").selected).toBe(true);
        });

        it("clears the tile that was selected before", () => {
            expect(tile(page, "Requests").selected).toBe(false);
        });

        it("renames the chart pane after the metric", () => {
            expect(shadow(page).querySelector("uui-box")?.getAttribute("headline")).toBe("Total tokens over time");
        });
    });

    describe("Scenario: pressing the selected KPI tile", () => {
        it("keeps it selected, since the chart always plots one metric", async () => {
            const page = await renderPage();
            await press(tile(page, "Requests"));
            await settle(page);
            expect(tile(page, "Requests").selected).toBe(true);
        });
    });

    describe("Scenario: success rate and average duration", () => {
        it("are not buttons, since they can't be stacked by day", async () => {
            const page = await renderPage();
            expect(tile(page, "Success rate").selectable).toBe(false);
        });
    });

    describe("Scenario (sad path): the comparison period has no requests", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            await saveDateRange(page, { from: "2026-01-01", to: "2026-01-10" });
            await expect.poll(() => chart(page).series[0]?.points.length === 10 && !chart(page).loading).toBe(true);
            await settle(page);
        });

        it("shows no change badge on the success rate tile", () => {
            expect(shadow(tile(page, "Success rate")).querySelector("uaui-delta-badge")).toBe(null);
        });
    });

    describe("Scenario (sad path): the range has no requests", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            await saveDateRange(page, { from: "2025-11-01", to: "2025-11-30", compare: "off" });
            await expect.poll(() => tile(page, "Success rate").noData).toBe(true);
            await settle(page);
        });

        it("shows the success rate tile as having no data", () => {
            expect(tile(page, "Success rate").noData).toBe(true);
        });
    });

    describe("Scenario: changing the group by", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            const before = chart(page).series[0].points.length;
            const week = deepQuery<HTMLElement>(shadow(page).querySelector("uaui-group-by")!.shadowRoot!, "[data-value='week']")!;
            week.click();
            await expect.poll(() => chart(page).series[0].points.length).toBeLessThan(before);
        });

        it("buckets the chart by week", () => {
            expect(chart(page).groupBy).toBe("week");
        });

        it("finishes loading the KPI tiles", () => {
            expect(tile(page, "Requests").loading).toBe(false);
        });
    });

    describe("Scenario: changing the date range", () => {
        let page: UauiTestElement;
        let requestsBefore: string | undefined;
        beforeEach(async () => {
            page = await renderPage();
            requestsBefore = tile(page, "Requests").value;
            await saveDateRange(page, { preset: "last-7-days" });
            await expect.poll(() => chart(page).series[0].points.length).toBe(7);
            await settle(page);
        });

        it("reloads the chart for the new range", () => {
            expect(chart(page).series[0].points).toHaveLength(7);
        });

        it("reloads the KPI tiles", () => {
            expect(tile(page, "Requests").value).not.toBe(requestsBefore);
        });

        it("reloads the table", () => {
            expect(table(page).rows).toHaveLength(5);
        });
    });

    describe("Scenario: sorting the table", () => {
        it("loads the rows in the new order", async () => {
            const page = await renderPage();
            const header = [...shadow(table(page)).querySelectorAll<HTMLElement>("uui-table-head-cell")].find((h) => h.textContent?.includes("Model"))!;
            header.click();
            await expect.poll(() => rowNames(page)[0]).toBe("atlas-large");
        });
    });

    describe("Scenario: paging the table", () => {
        it("loads the second page, with the two models left over", async () => {
            const page = await renderPage();
            const pager = deepQuery<HTMLElement>(shadow(table(page)), "uaui-compact-pager")!;
            const next = pager.shadowRoot!.querySelector(".next") as HTMLElement & { updateComplete: Promise<boolean> };
            await next.updateComplete;
            next.click();
            await expect.poll(() => rowNames(page)).toHaveLength(2);
        });
    });

    describe("Scenario: searching the table", () => {
        it("loads only the rows whose name matches", async () => {
            const page = await renderPage();
            const search = shadow(page).querySelector("uaui-table-search");
            const input = search!.shadowRoot!.querySelector("uui-input") as HTMLElement & { value: string };
            input.value = "atlas";
            input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            await expect.poll(() => rowNames(page).sort(), { timeout: 3_000 }).toEqual(["atlas-large", "atlas-small"]);
        });
    });

    describe("Scenario: breaking down by profile", () => {
        it("swaps the name column to Profile", async () => {
            const page = await renderPage();
            const profile = deepQueryAll(shadow(page), "[role='radio']").find(
                (o) => o.textContent?.trim() === "Profile",
            ) as HTMLElement;
            profile.click();
            await expect.poll(() => table(page).columns[0].label).toBe("Profile");
        });
    });

    describe("Scenario: once the first load is back", () => {
        it("shows no loading skeletons", async () => {
            const page = await renderPage();
            expect(deepQueryAll(shadow(page), "uaui-skeleton")).toHaveLength(0);
        });
    });

    describe("Scenario (sad path): the API fails", () => {
        it("shows the error state", async () => {
            const page = await renderPageExample(
                html`<example-ai-usage-page .latency=${0} failing></example-ai-usage-page>`,
                "example-ai-usage-page",
            );
            await expect.poll(() => chart(page).error).toBe(true);
            await settle(page);
            expect(shadow(chart(page)).querySelector("uaui-error-state")).not.toBe(null);
        });
    });
});
