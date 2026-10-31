/// <reference types="vite/client" />
// T22, T43 — Commerce > Analytics page example: every part Commerce's dashboard shows is wired to the one page, in every theme.
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { userEvent } from "vitest/browser";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { axeRun } from "../../../internal/test/a11y.js";
import { renderPageExample, saveDateRange, withTheme } from "../../../internal/test/page-example.js";
import { renderWithModals } from "../../../internal/test/modal-host.js";
import { deepQuery, deepText, shadow, settle, type UauiTestElement } from "../../../internal/test/dom.js";
import "./commerce-analytics-page.element.js";
import { loadSnapshot, loadStockForecast } from "./commerce-fake-data.js";
import { uauiCompareFor } from "../../../date-helpers/index.js";
import type { UauiCompare, UauiDateRange } from "../../../date-range/types.js";
import type { UauiTimeSeriesChartElement } from "../../../chart/time-series-chart.element.js";
import type { UauiKpiTileElement } from "../../../kpi-tile/kpi-tile.element.js";
import type { UauiFunnelElement } from "../../../funnel/funnel.element.js";
import type { UauiStatElement } from "../../../stat/stat.element.js";
import type { UauiDeltaBadgeElement } from "../../../delta-badge/delta-badge.element.js";
import type { UauiTableColumn } from "../../../table/types.js";

/** Renders the page and waits until every part has its data. */
async function renderPage(): Promise<UauiTestElement> {
    const page = await renderPageExample(
        html`<example-commerce-analytics-page .latency=${0}></example-commerce-analytics-page>`,
        "example-commerce-analytics-page",
    );
    await expect.poll(() => tiles(page)[0].loading === false && buyersTable(page).loading === false).toBe(true);
    await settle(page);
    return page;
}

const tiles = (page: Element) => [...shadow(page).querySelectorAll<UauiKpiTileElement>("uaui-kpi-tile")];
const tile = (page: Element, label: string) => tiles(page).find((t) => t.label === label)!;
const chart = (page: Element) => shadow(page).querySelector("uaui-time-series-chart") as UauiTimeSeriesChartElement;
const buyersTable = (page: Element) =>
    shadow(page).querySelector("uaui-data-table[row-key='email']") as unknown as TestTable;
type TestTable = UauiTestElement & { loading: boolean; error: boolean; rows: Record<string, unknown>[]; compareRows: unknown[]; columns: UauiTableColumn[] };
const box = (page: Element, headline: string) => shadow(page).querySelector(`uui-box[headline='${headline}']`) as HTMLElement;
const boxTable = (page: Element, headline: string) => box(page, headline).querySelector("uaui-data-table") as unknown as TestTable;
const headerTotal = (page: Element, headline: string) => box(page, headline).querySelector("uaui-stat[slot='header-actions']") as UauiStatElement | null;
const funnel = (page: Element) => box(page, "Cart conversion").querySelector("uaui-funnel") as UauiFunnelElement;
const abandonedFunnel = (page: Element) => box(page, "Abandoned carts").querySelector("uaui-funnel") as UauiFunnelElement;
const notice = (page: Element) => shadow(page).querySelector(".notice");
/** The page's first range, which the fake API is asked for on load. */
const FIRST_RANGE: UauiDateRange = { from: "2026-05-25", to: "2026-06-23" };
/** Raises the date range's own `change` event, as Save in its dialog does, without opening the dialog. */
const changeRange = (page: Element, value: UauiDateRange, compare?: UauiCompare) =>
    shadow(page).querySelector("uaui-date-range")!.dispatchEvent(new CustomEvent("change", { detail: { value, compare } }));
const stockTable = (page: Element) => boxTable(page, "Stock forecast");
const pageProps = (page: UauiTestElement) => page as UauiTestElement & { latency: number; failing: boolean };
/** Resolves after a timer queued now: timers with the same delay fire in order, so one queued after a request's fires after it. */
const afterTimer = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const dataRows = (table: Element) => [...shadow(table).querySelectorAll<HTMLElement>("uui-table-row:not([part~='header']):not(.column-toolbar)")];
const press = async (page: UauiTestElement, label: string) => {
    (shadow(tile(page, label)).querySelector("button") as HTMLElement).click();
    await page.updateComplete;
};
const buyerCells = (page: Element, column: number) =>
    [...shadow(buyersTable(page)).querySelectorAll(`uui-table-row:not(.column-toolbar) uui-table-cell:nth-child(${column})`)].map((c) => deepText(c).trim());
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

        it("passes the a11y audit with the top buyers and stock forecast pagers both showing", async () => {
            const page = await renderPage();
            const pager = (table: Element) => shadow(table).querySelector("uaui-compact-pager");
            expect(pager(buyersTable(page))).not.toBe(null);
            expect(pager(stockTable(page))).not.toBe(null);
            const results = await axeRun(page);
            expect(results.violations.map((v) => v.id)).not.toContain("landmark-unique");
            expect(results).toHaveNoViolations();
        });

        it("passes the a11y audit with the cart cleanup notice showing", async () => {
            const page = await renderPage();
            changeRange(page, { from: "2026-03-01", to: "2026-03-30" });
            await expect.poll(() => !tiles(page)[0].loading && notice(page) !== null).toBe(true);
            await settle(page);
            expect(await axeRun(page)).toHaveNoViolations();
        });

        it("passes the a11y audit with an opened buyer named in the status line", async () => {
            const page = await renderPage();
            dataRows(buyersTable(page))[0].click();
            await page.updateComplete;
            await settle(page);
            expect(box(page, "Top buyers").querySelector("[slot='footer'][role='status']")).not.toBe(null);
            expect(await axeRun(page)).toHaveNoViolations();
        });
    });

    describe("Scenario: the boxes in two columns", () => {
        const rect = (el: Element) => el.getBoundingClientRect();
        const boxRect = (page: Element, headline: string) => rect(box(page, headline));
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("lets the chart and top buyers span both columns on a wide page", () => {
            const grid = rect(shadow(page).querySelector(".boxes")!);
            for (const el of [chart(page).closest("uui-box")!, box(page, "Top buyers")]) {
                expect(rect(el).width).toBeCloseTo(grid.width, 0);
            }
        });

        it("pairs the other boxes side by side, in equal columns", () => {
            for (const [left, right] of [
                ["Cart conversion", "Abandoned carts"],
                ["Top products", "Popular discounts"],
                ["Refunds", "Stock forecast"],
            ]) {
                expect(boxRect(page, right).top, right).toBe(boxRect(page, left).top);
                expect(boxRect(page, right).left, right).toBeGreaterThan(boxRect(page, left).right);
                expect(boxRect(page, right).width, right).toBeCloseTo(boxRect(page, left).width, 0);
            }
        });

        it("puts every box in one column on a narrow page", async () => {
            (page.parentElement as HTMLElement).style.width = "600px";
            await settle(page);
            const grid = rect(shadow(page).querySelector(".boxes")!);
            for (const headline of ["Cart conversion", "Abandoned carts", "Top products", "Popular discounts", "Refunds", "Stock forecast", "Top buyers"]) {
                expect(boxRect(page, headline).width, headline).toBeCloseTo(grid.width, 0);
            }
            expect(boxRect(page, "Abandoned carts").top).toBeGreaterThan(boxRect(page, "Cart conversion").bottom);
        });

        it("keeps exactly two columns on a wide page, never three", async () => {
            const wide = await renderWithModals(
                html`<div style="width: 1800px"><example-commerce-analytics-page .latency=${0}></example-commerce-analytics-page></div>`,
                "example-commerce-analytics-page",
            );
            await expect.poll(() => !tiles(wide)[0].loading && !buyersTable(wide).loading).toBe(true);
            await settle(wide);
            const grid = rect(shadow(wide).querySelector(".boxes")!);
            for (const [left, right] of [
                ["Cart conversion", "Abandoned carts"],
                ["Top products", "Popular discounts"],
                ["Refunds", "Stock forecast"],
            ]) {
                expect(boxRect(wide, right).top, right).toBe(boxRect(wide, left).top);
                expect(boxRect(wide, right).width, right).toBeCloseTo(boxRect(wide, left).width, 0);
                expect(boxRect(wide, right).height, right).toBeCloseTo(boxRect(wide, left).height, 0);
                expect(boxRect(wide, left).width + boxRect(wide, right).width, right).toBeGreaterThan(grid.width * 0.95);
            }
            expect(boxRect(wide, "Top products").top).toBeGreaterThan(boxRect(wide, "Abandoned carts").bottom);
        });

        it("passes the a11y audit on a narrow page", async () => {
            (page.parentElement as HTMLElement).style.width = "600px";
            await settle(page);
            expect(await axeRun(page)).toHaveNoViolations();
        });
    });

    describe("Scenario: the abandoned carts box", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("shows the notified and purchased counts, for both periods", async () => {
            const { totals } = await loadSnapshot(FIRST_RANGE);
            expect(abandonedFunnel(page).steps.map((s) => [s.label, s.value])).toEqual([
                ["Notified", totals.notifiedCarts],
                ["Purchased", totals.recoveredCarts],
            ]);
            expect(abandonedFunnel(page).compareSteps).toHaveLength(2);
            expect(abandonedFunnel(page).compareLabel).toBeTruthy();
        });

        it("puts the recovery rate in the header, in points, equal to the tile's rate", () => {
            const total = headerTotal(page, "Abandoned carts")!;
            expect(total.deltaUnit).toBe("points");
            expect(total.current).toBeCloseTo(tile(page, "Abandoned cart recovery").current!);
            expect(total.previous).toBeCloseTo(tile(page, "Abandoned cart recovery").previous!);
        });

        it("draws every header total on one line", () => {
            for (const headline of ["Cart conversion", "Abandoned carts", "Refunds"]) {
                expect(headerTotal(page, headline)!.layout).toBe("inline");
            }
        });

        it("keeps the Abandoned cart recovery tile selectable", () => {
            expect(tile(page, "Abandoned cart recovery").selectable).toBe(true);
        });
    });

    describe("Scenario: the KPI tiles", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("shows every figure Commerce's dashboard has a series for", () => {
            expect(tiles(page).map((t) => t.label)).toEqual([
                "Revenue",
                "Orders",
                "Average order value",
                "Cart conversion",
                "Abandoned cart recovery",
                "Repeat customers",
                "Applied discounts",
            ]);
        });

        it("makes every tile selectable, with exactly one selected", () => {
            expect(tiles(page).every((t) => t.selectable)).toBe(true);
            expect(tiles(page).filter((t) => t.selected).map((t) => t.label)).toEqual(["Revenue"]);
        });

        it("compares the rates in points and the rest in percent", () => {
            const points = tiles(page).filter((t) => t.deltaUnit === "points").map((t) => t.label);
            expect(points).toEqual(["Cart conversion", "Abandoned cart recovery", "Repeat customers"]);
        });

        it("gives every tile last period's figure to compare with", () => {
            expect(tiles(page).every((t) => Number.isFinite(t.previous))).toBe(true);
        });

        it("shows the same cart conversion on its tile as the funnel's Overall", () => {
            expect(tile(page, "Cart conversion").current).toBeCloseTo(headerTotal(page, "Cart conversion")!.current!);
        });

        it("works out abandoned cart recovery as recovered carts over notified carts", async () => {
            const { totals } = await loadSnapshot(FIRST_RANGE);
            expect(tile(page, "Abandoned cart recovery").current).toBeCloseTo((totals.recoveredCarts / totals.notifiedCarts) * 100);
        });
    });

    describe("Scenario: pressing a KPI tile", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            await press(page, "Orders");
        });

        it("switches the chart to that metric", () => {
            expect(chart(page).series[0].id).toBe("orders");
        });

        it("names the chart's box after it", () => {
            expect(box(page, "Orders")).not.toBe(null);
        });
    });

    describe("Scenario: pressing a rate's tile", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            await press(page, "Abandoned cart recovery");
        });

        it("plots that rate, as a percent, for both periods", () => {
            expect(chart(page).series[0].id).toBe("recovery");
            expect(chart(page).compareSeries[0].id).toBe("recovery");
            expect(chart(page).valueFormat).toMatchObject({ style: "unit", unit: "percent" });
        });

        it("selects only that tile", () => {
            expect(tiles(page).filter((t) => t.selected).map((t) => t.label)).toEqual(["Abandoned cart recovery"]);
        });
    });

    describe("Scenario: the cart conversion funnel, compared with last period", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("shows carts created, reached checkout and orders placed", () => {
            expect(funnel(page).steps.map((s) => s.label)).toEqual(["Carts created", "Reached checkout", "Orders placed"]);
        });

        it("narrows from step to step", () => {
            const [carts, checkout, orders] = funnel(page).steps.map((s) => s.value);
            expect(carts).toBeGreaterThan(checkout);
            expect(checkout).toBeGreaterThan(orders);
        });

        it("gives the funnel last period's steps and both periods' names", () => {
            expect(funnel(page).compareSteps.map((s) => s.id)).toEqual(["carts", "checkout", "orders"]);
            expect(funnel(page).currentLabel).toBeTruthy();
            expect(funnel(page).compareLabel).toBeTruthy();
        });

        it("puts the overall conversion in the box header, compared in points", () => {
            const total = headerTotal(page, "Cart conversion")!;
            const [carts, , orders] = funnel(page).steps.map((s) => s.value);
            expect(total.label).toBe("Overall");
            expect(total.current).toBeCloseTo((orders / carts) * 100);
            expect(total.deltaUnit).toBe("points");
            expect(Number.isFinite(total.previous)).toBe(true);
        });

        it("shows no cart cleanup notice for a recent range", () => {
            expect(notice(page)).toBe(null);
        });
    });

    describe("Scenario: the cart conversion funnel, without compare", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            await saveDateRange(page, { from: "2026-04-01", to: "2026-04-30", compare: "off" });
            await expect.poll(() => !funnel(page).loading && funnel(page).compareSteps.length === 0).toBe(true);
            await settle(page);
        });

        it("drops last period's steps and name", () => {
            expect(funnel(page).compareSteps).toHaveLength(0);
            expect(funnel(page).compareLabel ?? "").toBe("");
        });

        it("keeps the overall conversion, with nothing to compare it with", () => {
            const total = headerTotal(page, "Cart conversion")!;
            expect(Number.isFinite(total.current)).toBe(true);
            expect(total.previous).toBeUndefined();
        });
    });

    describe("Scenario: a range older than the cart cleanup policy", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            await saveDateRange(page, { from: "2026-03-01", to: "2026-03-30", compare: "off" });
            await expect.poll(() => !funnel(page).loading && notice(page) !== null).toBe(true);
        });

        it("says carts were cleaned up for this range, above the KPI tiles it affects", () => {
            expect(deepText(notice(page)!)).toContain("The date range is older than the cart cleanup policy");
            expect(notice(page)!.nextElementSibling?.classList.contains("kpis")).toBe(true);
        });
    });

    describe("Scenario: only the comparison range is older than the cart cleanup policy", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            const range = { from: "2026-04-01", to: "2026-04-30" };
            changeRange(page, range, uauiCompareFor("previous-period", range));
            await expect.poll(() => !tiles(page)[0].loading && notice(page) !== null).toBe(true);
        });

        it("says it is the comparison range that was cleaned up", () => {
            expect(deepText(notice(page)!)).toContain("The comparison range is older than the cart cleanup policy");
            expect(deepText(notice(page)!)).not.toContain("The date range is older");
        });
    });

    describe("Scenario: the refunds box", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("puts the overall refund rate in the header, in points, where a fall is good", () => {
            const total = headerTotal(page, "Refunds")!;
            expect(total.label).toBe("Refund rate");
            expect(total.deltaUnit).toBe("points");
            expect(total.lowerIsBetter).toBe(true);
            expect(Number.isFinite(total.current)).toBe(true);
            expect(Number.isFinite(total.previous)).toBe(true);
        });

        it("lists refund rates by product with their top reason", () => {
            const table = boxTable(page, "Refunds");
            expect(table.columns.map((c) => c.label)).toEqual(["Product", "SKU", "Refund rate", "Top reason"]);
            expect(table.rows.length).toBeGreaterThan(0);
            expect(table.rows.every((r) => typeof r.topReasonText === "string" && r.topReasonText !== "")).toBe(true);
        });

        it("compares each product's refund rate with last period's, in points, where a rise is bad", () => {
            const table = boxTable(page, "Refunds");
            expect(table.compareRows.length).toBeGreaterThan(0);
            const rate = table.columns.find((c) => c.key === "refundRate")!;
            expect(rate.meta).toMatchObject({ deltaUnit: "points", lowerIsBetter: true });
        });

        it("shows a product whose rate went from 5% to 6% as +1 pp, a decline", async () => {
            const table = boxTable(page, "Refunds");
            table.rows = [{ productReference: "p1", productName: "Test tee", sku: "TT-1", refundRate: 6, topReasonText: "Wrong item sent" }];
            table.compareRows = [{ productReference: "p1", productName: "Test tee", sku: "TT-1", refundRate: 5 }];
            await settle(table);
            const badge = deepQuery<UauiDeltaBadgeElement>(shadow(table), "uaui-delta-badge")!;
            expect(badge.unit).toBe("points");
            expect(badge.sentiment).toBe("negative");
            expect(deepText(shadow(badge)).replace(/\s+/g, " ")).toContain("+1 pp");
        });
    });

    describe("Scenario: top products and popular discounts", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("has no search on top products, as in Commerce", () => {
            expect(boxTable(page, "Top products").querySelector("uaui-search-field")).toBe(null);
        });

        it("lists two variants of one product as two rows, each matched to its own last-period row", () => {
            for (const headline of ["Top products", "Stock forecast"]) {
                const table = boxTable(page, headline);
                const hoodies = table.rows.filter((r) => r.productReference === "prod-hd-014");
                expect(hoodies.map((r) => r.sku).sort(), headline).toEqual(["HD-014-L", "HD-014-M"]);
                expect(new Set(hoodies.map((r) => r.productVariantReference)).size, headline).toBe(2);
                expect(table.getAttribute("row-key"), headline).toBe("sku");
            }
            const compare = boxTable(page, "Top products").compareRows as Record<string, unknown>[];
            expect(compare.filter((r) => r.productReference === "prod-hd-014")).toHaveLength(2);
            const badges = dataRows(boxTable(page, "Top products"))
                .filter((row) => deepText(row).includes("Fleece hoodie"))
                .map((row) => deepQuery(row, "uaui-table-compare-badge"));
            expect(badges).toHaveLength(2);
        });

        it("shows what Commerce's top selling products answer has", () => {
            expect(boxTable(page, "Top products").columns.map((c) => c.label)).toEqual(["Product", "SKU", "Quantity sold"]);
        });

        it("shows what Commerce's popular discounts answer has, status and dates in words", () => {
            const table = boxTable(page, "Popular discounts");
            expect(table.columns.map((c) => c.label)).toEqual(["Discount", "Status", "Valid from", "Valid to", "Times used"]);
            expect(table.rows.map((r) => r.statusText)).toContain("Inactive");
            expect(table.rows.some((r) => r.validFromText !== "" && r.validToText !== "")).toBe(true);
        });
    });

    describe("Scenario: the stock forecast", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("lists stock, sales per day and days left, soonest first", () => {
            const table = stockTable(page);
            expect(table.columns.map((c) => c.label)).toEqual(["Product", "SKU", "In stock", "Sold per day", "Days left"]);
            const days = table.rows.map((r) => r.estimatedDaysRemaining as number);
            expect(days).toEqual([...days].sort((a, b) => a - b));
        });

        it("leaves out products that last longer than the forecast window", () => {
            // The poster is low on stock and sells, but so slowly that it lasts past ceil(30 days × 1.5).
            expect(boxTable(page, "Top products").rows.map((r) => r.sku)).toContain("PS-006");
            expect(stockTable(page).rows.map((r) => r.sku)).not.toContain("PS-006");
            expect(stockTable(page).rows.every((r) => (r.estimatedDaysRemaining as number) <= 45)).toBe(true);
        });

        it("goes back to page 1 when it reloads for a new range", async () => {
            const table = stockTable(page) as TestTable & { page: number };
            const next = shadow(shadow(table).querySelector("uaui-compact-pager")!).querySelector(".next") as HTMLElement & { updateComplete: Promise<boolean> };
            await next.updateComplete;
            next.click();
            await expect.poll(() => table.page).toBe(2);
            changeRange(page, { from: "2026-05-01", to: "2026-05-31" });
            await expect.poll(() => !table.loading && table.page === 1).toBe(true);
        });

        it("names every table after its box", () => {
            for (const [headline, label] of [
                ["Refunds", "Refunds by product"],
                ["Top products", "Top products"],
                ["Popular discounts", "Popular discounts"],
                ["Top buyers", "Top buyers"],
                ["Stock forecast", "Stock forecast"],
            ]) {
                expect((boxTable(page, headline) as TestTable & { label: string }).label, headline).toBe(label);
            }
        });

        it("shows 5 products a page, as Commerce does, with a pager for the rest", () => {
            const table = stockTable(page);
            expect(table.rows.length).toBeGreaterThan(5);
            expect(dataRows(table)).toHaveLength(5);
            expect(shadow(table).querySelector("uaui-compact-pager")).not.toBe(null);
        });

        it("lists only low-stock products with an estimate", () => {
            const rows = stockTable(page).rows;
            expect(rows.length).toBeGreaterThan(0);
            expect(rows.every((r) => typeof r.estimatedDaysRemaining === "number" && (r.currentStock as number) < 10)).toBe(true);
            // The gift wrap is low on stock but doesn't sell, so it has no estimate.
            expect(rows.map((r) => r.sku)).not.toContain("GW-500");
        });

        it("says Out of stock for 0 days left", () => {
            const empty = stockTable(page).rows.find((r) => r.estimatedDaysRemaining === 0)!;
            expect(empty.daysLeftText).toBe("Out of stock");
        });

        it("ignores compare: no compare rows and no change badges", () => {
            const table = stockTable(page);
            expect(table.compareRows).toHaveLength(0);
            expect(deepQuery(shadow(table), "uaui-delta-badge")).toBe(null);
        });

        it("reloads for a new range, dropping products that didn't sell in it", async () => {
            changeRange(page, { from: "2025-11-01", to: "2025-11-30" });
            await expect.poll(() => !stockTable(page).loading && stockTable(page).rows.length === 0).toBe(true);
        });
    });

    describe("Scenario: two quick range changes on a slow API", () => {
        const late: UauiDateRange = { from: "2026-04-01", to: "2026-04-30" };
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            // The first change is slow, the second fast, so the first answer arrives last and must be dropped.
            pageProps(page).latency = 300;
            changeRange(page, { from: "2025-11-01", to: "2025-11-30" });
            pageProps(page).latency = 0;
            changeRange(page, late);
            await expect.poll(() => !tile(page, "Revenue").loading && !stockTable(page).loading).toBe(true);
            // Polling alone ends once the fast answer is in. Also wait until the slow first answer has landed (its timer
            // was queued before this one), so the check proves it was dropped rather than not yet arrived.
            await afterTimer(300);
            await settle(page);
        });

        it("shows the second range's summary", async () => {
            const { totals } = await loadSnapshot(late);
            expect(tile(page, "Revenue").loading).toBe(false);
            expect(tile(page, "Revenue").current).toBe(totals.revenue);
        });

        it("shows the second range's stock forecast", async () => {
            const expected = (await loadStockForecast(late)).map((r) => r.sku);
            expect(expected.length).toBeGreaterThan(0);
            expect(stockTable(page).loading).toBe(false);
            expect(stockTable(page).rows.map((r) => r.sku)).toEqual(expected);
        });
    });

    describe("Scenario: opening a top buyer", () => {
        let page: UauiTestElement;
        let name: string;
        beforeEach(async () => {
            page = await renderPage();
            name = buyerNames(page)[0];
            dataRows(buyersTable(page))[0].click();
            await page.updateComplete;
        });

        it("says which buyer's orders it shows, without an alert", () => {
            const status = box(page, "Top buyers").querySelector("[slot='footer'][role='status']")!;
            expect(status.textContent).toContain(name);
        });

        it("forgets the buyer, and leaves no empty footer, when the range changes", async () => {
            changeRange(page, { from: "2026-04-01", to: "2026-04-30" });
            await page.updateComplete;
            expect(box(page, "Top buyers").querySelector("[slot='footer']")).toBe(null);
        });
    });

    describe("Scenario: choosing a new date range", () => {
        let page: UauiTestElement;
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
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            await saveDateRange(page, { from: "2025-11-01", to: "2025-11-30", compare: "off" });
            await expect.poll(() => chart(page).series.length === 0 && !chart(page).loading).toBe(true);
            await settle(chart(page));
        });

        it("shows the chart's empty state", () => {
            expect(deepQuery(shadow(chart(page)), "uaui-empty-state")).not.toBe(null);
        });

        it("shows the KPI tiles as having no data, not as 0", () => {
            expect(tile(page, "Revenue").noData).toBe(true);
        });

        it("shows a rate's tile as having no data when there is nothing to divide by", () => {
            expect(tile(page, "Cart conversion").noData).toBe(true);
        });
    });

    describe("Scenario: sorting top buyers", () => {
        let page: UauiTestElement;
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
        let page: UauiTestElement;
        let firstPage: string[];
        beforeEach(async () => {
            page = await renderPage();
            firstPage = buyerNames(page);
            const pager = shadow(buyersTable(page)).querySelector("uaui-compact-pager") as HTMLElement;
            const next = shadow(pager).querySelector(".next") as HTMLElement & { updateComplete: Promise<boolean> };
            await next.updateComplete;
            next.click();
        });

        it("shows the next page of buyers", async () => {
            await expect.poll(() => buyerNames(page)).not.toEqual(firstPage);
        });
    });

    describe("Scenario: searching top buyers", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            const search = shadow(buyersTable(page)).querySelector("slot[name='toolbar']") as HTMLSlotElement;
            const box = search.assignedElements()[0].querySelector("uaui-search-field") as HTMLElement;
            (shadow(box).querySelector("input, uui-input") as HTMLElement).focus();
            await userEvent.keyboard("ada");
        });

        it("asks for only the buyers that match", async () => {
            await expect.poll(() => buyerNames(page)).toEqual(["Ada Example"]);
        });
    });

    describe("Scenario: a slow API", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPageExample(
                html`<example-commerce-analytics-page .latency=${2000}></example-commerce-analytics-page>`,
                "example-commerce-analytics-page",
            );
            await settle(page);
        });

        it("shows every part loading on first load", () => {
            expect(tiles(page).every((t) => t.loading)).toBe(true);
            expect(chart(page).loading).toBe(true);
            expect(funnel(page).loading).toBe(true);
            expect(abandonedFunnel(page).loading).toBe(true);
            for (const headline of ["Refunds", "Top products", "Popular discounts", "Top buyers", "Stock forecast"]) {
                expect(boxTable(page, headline).loading, headline).toBe(true);
            }
        });

        it("leaves the header totals out until there is a figure", () => {
            expect(headerTotal(page, "Cart conversion")).toBe(null);
            expect(headerTotal(page, "Abandoned carts")).toBe(null);
            expect(headerTotal(page, "Refunds")).toBe(null);
        });
    });

    describe("Scenario (sad path): the API fails", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPageExample(
                html`<example-commerce-analytics-page .latency=${0} failing></example-commerce-analytics-page>`,
                "example-commerce-analytics-page",
            );
            await expect.poll(() => chart(page).error && funnel(page).error && boxTable(page, "Stock forecast").error && buyersTable(page).error).toBe(true);
            await settle(page);
        });

        it("shows the error state in the chart, funnel and every table", () => {
            expect(shadow(chart(page)).querySelector("uaui-error-state")).not.toBe(null);
            expect(deepQuery(shadow(funnel(page)), "uaui-error-state")).not.toBe(null);
            expect(deepQuery(shadow(abandonedFunnel(page)), "uaui-error-state")).not.toBe(null);
            for (const headline of ["Refunds", "Top products", "Popular discounts", "Top buyers", "Stock forecast"]) {
                expect(boxTable(page, headline).error, headline).toBe(true);
            }
        });

        it("shows the tiles as errors and leaves the header totals out", () => {
            expect(tiles(page).every((t) => t.error)).toBe(true);
            expect(headerTotal(page, "Cart conversion")).toBe(null);
            expect(headerTotal(page, "Abandoned carts")).toBe(null);
            expect(headerTotal(page, "Refunds")).toBe(null);
        });

        it("loads again when the funnel's Retry is pressed", async () => {
            (page as UauiTestElement & { latency: number }).latency = 100;
            const retry = deepQuery<HTMLElement>(shadow(funnel(page)), "uaui-error-state")!;
            retry.dispatchEvent(new Event("retry", { bubbles: true }));
            await page.updateComplete;
            expect(funnel(page).error).toBe(false);
            await expect.poll(() => funnel(page).error).toBe(true);
        });

        it("loads the data once the API answers again and Retry is pressed", async () => {
            pageProps(page).failing = false;
            deepQuery<HTMLElement>(shadow(funnel(page)), "uaui-error-state")!.dispatchEvent(new Event("retry", { bubbles: true }));
            await expect.poll(() => !funnel(page).loading && !funnel(page).error && funnel(page).steps.length === 3).toBe(true);
            expect(tiles(page).every((t) => !t.error && Number.isFinite(t.current))).toBe(true);
        });

        it("loads the stock forecast once the API answers again and its Retry is pressed", async () => {
            pageProps(page).failing = false;
            stockTable(page).dispatchEvent(new Event("retry", { bubbles: true }));
            await expect.poll(() => !stockTable(page).loading && !stockTable(page).error && stockTable(page).rows.length > 0).toBe(true);
        });

        it("loads the stock forecast again when its Retry is pressed", async () => {
            (page as UauiTestElement & { latency: number }).latency = 100;
            const table = boxTable(page, "Stock forecast");
            table.dispatchEvent(new Event("retry", { bubbles: true }));
            await page.updateComplete;
            expect(table.loading).toBe(true);
            await expect.poll(() => table.error).toBe(true);
        });

        it("passes the a11y audit", async () => {
            expect(await axeRun(page)).toHaveNoViolations();
        });
    });
});
