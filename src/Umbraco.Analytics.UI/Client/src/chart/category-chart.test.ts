// T60 — Category chart: bars over a non-date x-axis (Forms' submissions by hour of day), with the time-series chart's
// look, tooltip, legend, hidden table and states. Canvas-only outcomes use toMatchScreenshot (see screenshotIt).
/// <reference types="vite/client" />
import { Chart } from "@umbraco/analytics-ui/external/chart.js";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { screenshotIt } from "../internal/test/screenshot.js";
import { deepQuery, deepText, pressed, recordEvents, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./category-chart.element.js";
import type { UauiCategoryChartElement } from "./category-chart.element.js";
import type { UauiCategorySeries } from "./types.js";

const categories = ["Mobile", "Tablet", "Desktop"].map((label) => ({ id: label.toLowerCase(), label }));
const points = (values: number[]) => values.map((value, i) => ({ category: categories[i].id, value }));
const visits: UauiCategorySeries = { id: "visits", label: "Visits", points: points([40, 120, 280]) };
const orders: UauiCategorySeries = { id: "orders", label: "Orders", points: points([12, 30, 61]) };
const lastVisits: UauiCategorySeries = { id: "visits", label: "Visits", points: points([60, 90, 200]) };
const lastOrders: UauiCategorySeries = { id: "orders", label: "Orders", points: points([10, 20, 40]) };

/** The 24 hours of the day, as Forms' submissions by hour: ids "0" to "23", labels in the culture's hour format. */
const hourFormat = new Intl.DateTimeFormat("en-US", { hour: "numeric", timeZone: "UTC" });
const hours = Array.from({ length: 24 }, (_, h) => ({ id: String(h), label: hourFormat.format(Date.UTC(2026, 0, 1, h)) }));
const byHour: UauiCategorySeries = {
    id: "entries",
    label: "Entries",
    points: hours.map((h, i) => ({ category: h.id, value: Math.round(4 + 30 * Math.exp(-((i - 13) ** 2) / 18)) })),
};

type El = UauiTestElement & UauiCategoryChartElement;
const chart = async (template: ReturnType<typeof html>) => (await renderElement(template, "uaui-category-chart")) as El;
const canvas = (el: Element) => shadow(el).querySelector("canvas")!;
const hiddenTable = (el: Element) => deepQuery<HTMLTableElement>(shadow(el), "table")!;
const legend = (el: Element) => deepQuery(shadow(el), "uaui-chart-legend");
const tooltip = (el: Element) => shadow(el).querySelector<HTMLElement>("uaui-chart-tooltip");
const headerCells = (el: Element) => [...hiddenTable(el).tHead!.rows[0].cells].map((c) => c.textContent!.trim());
const rowCells = (el: Element, row: number) => [...hiddenTable(el).tBodies[0].rows[row].cells].map((c) => c.textContent!.trim());
// Moves the pointer onto the nth category, at the x Chart.js drew its bar.
const hoverCategory = async (el: Element, index: number) => {
    const c = canvas(el);
    const x = Chart.getChart(c)!.getDatasetMeta(0).data[index].x;
    await userEvent.hover(page.elementLocator(c), { position: { x, y: c.getBoundingClientRect().height / 2 } });
    await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
};

describe("Feature: category chart", () => {
    describe("Scenario: one series as bars", () => {
        let el: El;
        beforeEach(async () => {
            el = await chart(html`<uaui-category-chart .categories=${categories} .series=${[visits]} style="width:400px"></uaui-category-chart>`);
        });

        screenshotIt("draws one bar per category", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("category-chart-bars");
        });

        it("draws bars, by default", () => {
            expect(el.kind).toBe("bar");
            expect(Chart.getChart(canvas(el))!.data.datasets[0].type).toBe("bar");
        });

        it("labels the x-axis with the category labels, in the given order", () => {
            expect(Chart.getChart(canvas(el))!.data.labels).toEqual(["Mobile", "Tablet", "Desktop"]);
        });

        it("shows no legend for one series and no compare", () => {
            expect(legend(el)).toBe(null);
        });

        it("lists a row per category in the hidden table, headed Category", () => {
            expect(headerCells(el)).toEqual(["Category", "Visits"]);
            expect(rowCells(el, 0)).toEqual(["Mobile", "40"]);
            expect(rowCells(el, 2)).toEqual(["Desktop", "280"]);
        });

        it("names the category column with category-label", async () => {
            el.setAttribute("category-label", "Device");
            await settle(el);
            expect(headerCells(el)[0]).toBe("Device");
        });

        it("passes the a11y audit", async () => {
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: hovering a category", () => {
        let el: El;
        beforeEach(async () => {
            el = await chart(
                html`<uaui-category-chart .categories=${categories} .series=${[visits, orders]} .valueFormat=${{ style: "currency", currency: "EUR" }}
                    style="width:400px"></uaui-category-chart>`,
            );
            await hoverCategory(el, 1);
        });

        it("heads the tooltip with the category's label", () => {
            expect(deepQuery(shadow(tooltip(el)!), ".tooltip-date")!.textContent).toBe("Tablet");
        });

        it("lists each series' value, formatted with value-format", () => {
            expect(deepText(tooltip(el)!)).toMatch(/€120[\s\S]*Visits[\s\S]*€30[\s\S]*Orders/);
        });

        it("hides the tooltip from assistive tech, as the hidden table has the data", () => {
            expect(tooltip(el)!.getAttribute("aria-hidden")).toBe("true");
        });

        it("hides the tooltip when Escape is pressed, without moving the pointer (WCAG 1.4.13)", async () => {
            await userEvent.keyboard("{Escape}");
            await expect.poll(() => tooltip(el)).toBe(null);
        });

        it("shows it again when the pointer moves to another category", async () => {
            await userEvent.keyboard("{Escape}");
            await expect.poll(() => tooltip(el)).toBe(null);
            await hoverCategory(el, 2);
            expect(deepQuery(shadow(tooltip(el)!), ".tooltip-date")!.textContent).toBe("Desktop");
        });
    });

    describe("Scenario: stacked bars", () => {
        let el: El;
        beforeEach(async () => {
            el = await chart(
                html`<uaui-category-chart kind="stacked-bar" .categories=${categories} .series=${[visits, orders]} style="width:400px"></uaui-category-chart>`,
            );
        });

        screenshotIt("stacks both series in one bar per category", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("category-chart-stacked");
        });

        it("adds a total column to the hidden table", () => {
            expect(headerCells(el)).toEqual(["Category", "Visits", "Orders", "Total"]);
            expect(rowCells(el, 0)).toEqual(["Mobile", "40", "12", "52"]);
        });

        it("lists both series in the legend", () => {
            expect(deepText(legend(el)!)).toMatch(/Visits[\s\S]*Orders/);
        });

        it("shows the total in the tooltip", async () => {
            await hoverCategory(el, 2);
            expect(deepText(tooltip(el)!)).toMatch(/341[\s\S]*Total/);
        });
    });

    describe("Scenario: comparing with last period", () => {
        let el: El;
        beforeEach(async () => {
            el = await chart(
                html`<uaui-category-chart .categories=${categories} .series=${[visits]} .compareSeries=${[lastVisits]} compare-label="Last month"
                    style="width:400px"></uaui-category-chart>`,
            );
        });

        screenshotIt("draws the compare bar behind each current bar", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("category-chart-compare");
        });

        it("names the compared period in the legend", () => {
            expect(deepText(legend(el)!)).toMatch(/Visits[\s\S]*Last month/);
        });

        it("adds the compare column to the hidden table", () => {
            expect(headerCells(el)).toEqual(["Category", "Visits", "Total (compare)"]);
            expect(rowCells(el, 1)).toEqual(["Tablet", "120", "90"]);
        });

        it("shows the compare value, the compared period and the change in the tooltip", async () => {
            await hoverCategory(el, 1);
            const text = deepText(tooltip(el)!);
            expect(text).toMatch(/120[\s\S]*90[\s\S]*Last month/);
            expect(deepQuery(shadow(tooltip(el)!), "uaui-delta-badge")).not.toBe(null);
        });

        it("passes the a11y audit", async () => {
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: compare values are matched by series id and category id", () => {
        it("adds up only compare series that a series has the id of, per category", async () => {
            const stray = { id: "other", label: "Other", points: points([1000, 1000, 1000]) };
            const el = await chart(
                html`<uaui-category-chart .categories=${categories} .series=${[visits, orders]} .compareSeries=${[lastOrders, stray, lastVisits]}
                    style="width:400px"></uaui-category-chart>`,
            );
            expect(rowCells(el, 0)).toEqual(["Mobile", "40", "12", "52", "70"]);
        });

        it("draws nothing for a compare point in a category it wasn't given", async () => {
            const el = await chart(
                html`<uaui-category-chart .categories=${categories} .series=${[visits]} .compareSeries=${[{ ...lastVisits, points: [{ category: "watch", value: 5 }] }]}
                    style="width:400px"></uaui-category-chart>`,
            );
            expect(headerCells(el)).toEqual(["Category", "Visits"]);
            expect(legend(el)).toBe(null);
        });
    });

    describe("Scenario: lower is better", () => {
        it("reads a fall against the compare value as good in the tooltip", async () => {
            const el = await chart(
                html`<uaui-category-chart lower-is-better .categories=${categories} .series=${[visits]} .compareSeries=${[lastVisits]}
                    style="width:400px"></uaui-category-chart>`,
            );
            await hoverCategory(el, 0);
            const badge = deepQuery<HTMLElement & { lowerIsBetter: boolean }>(shadow(tooltip(el)!), "uaui-delta-badge")!;
            expect(badge.lowerIsBetter).toBe(true);
        });
    });

    describe("Scenario: hovering a category with no data", () => {
        const noTablet = (id: string, label: string, values: [number, number]): UauiCategorySeries => ({
            id,
            label,
            points: [{ category: "mobile", value: values[0] }, { category: "desktop", value: values[1] }],
        });

        it("shows a No data row for each series when every series is empty", async () => {
            const el = await chart(html`<uaui-category-chart .categories=${categories} .series=${[noTablet("visits", "Visits", [40, 280]), noTablet("orders", "Orders", [12, 61])]} style="width:400px"></uaui-category-chart>`);
            await hoverCategory(el, 1);
            expect(deepText(tooltip(el)!).match(/No data/g)).toHaveLength(2);
        });

        it("shows No data for the empty series when another series has a value", async () => {
            const el = await chart(html`<uaui-category-chart .categories=${categories} .series=${[noTablet("visits", "Visits", [40, 280]), orders]} style="width:400px"></uaui-category-chart>`);
            await hoverCategory(el, 1);
            expect(deepText(tooltip(el)!)).toMatch(/No data[\s\S]*Visits[\s\S]*30[\s\S]*Orders/);
        });
    });

    describe("Scenario: the series' points", () => {
        it("adds up points in the same category, leaves a category without one empty and drops one in a category it wasn't given", async () => {
            const el = await chart(
                html`<uaui-category-chart .categories=${categories}
                    .series=${[{ id: "a", label: "A", points: [{ category: "mobile", value: 2 }, { category: "mobile", value: 3 }, { category: "watch", value: 9 }, { category: "desktop", value: 1 }] }]}
                    style="width:400px"></uaui-category-chart>`,
            );
            expect([0, 1, 2].map((row) => rowCells(el, row))).toEqual([["Mobile", "5"], ["Tablet", "No data"], ["Desktop", "1"]]);
        });

        it("draws bars for a kind it doesn't know", async () => {
            const el = await chart(html`<uaui-category-chart kind="line" .categories=${categories} .series=${[visits]} style="width:400px"></uaui-category-chart>`);
            expect(Chart.getChart(canvas(el))!.data.datasets[0].type).toBe("bar");
        });
    });

    describe("Scenario: the 24 hours of the day", () => {
        let el: El;
        beforeEach(async () => {
            el = await chart(html`<uaui-category-chart .categories=${hours} .series=${[byHour]} style="width:400px"></uaui-category-chart>`);
        });

        screenshotIt("draws 24 bars, labelling as many hours as fit", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("category-chart-hours");
        });

        it("lists every hour in the hidden table", () => {
            expect(hiddenTable(el).tBodies[0].rows).toHaveLength(24);
            expect(rowCells(el, 13)[0]).toBe("1 PM");
        });

        it("heads the tooltip with the hour", async () => {
            await hoverCategory(el, 13);
            expect(deepQuery(shadow(tooltip(el)!), ".tooltip-date")!.textContent).toBe("1 PM");
        });
    });

    describe("Scenario: a log y-axis", () => {
        let warn: MockInstance<typeof console.warn>;
        beforeEach(() => {
            warn = vi.spyOn(console, "warn").mockImplementation(() => {});
        });
        afterEach(() => warn.mockRestore());

        it("says so in the hidden table's caption", async () => {
            const el = await chart(html`<uaui-category-chart y-scale="log" .categories=${categories} .series=${[visits]} style="width:400px"></uaui-category-chart>`);
            expect(hiddenTable(el).caption!.textContent!.trim()).toBe("Chart data (logarithmic scale)");
        });

        it("is ignored with stacked bars, warning once", async () => {
            const el = await chart(
                html`<uaui-category-chart y-scale="log" kind="stacked-bar" .categories=${categories} .series=${[visits, orders]} style="width:400px"></uaui-category-chart>`,
            );
            el.series = [orders, visits];
            await settle(el);
            expect(hiddenTable(el).caption!.textContent!.trim()).toBe("Chart data");
            expect(warn.mock.calls.filter(([m]) => String(m).includes("uaui-category-chart") && String(m).includes("y-scale"))).toHaveLength(1);
        });
    });
});

describe("Feature: category chart states", () => {
    it("shows a skeleton on first load", async () => {
        const el = await chart(html`<uaui-category-chart loading .categories=${categories}></uaui-category-chart>`);
        expect(shadow(el).querySelector("uaui-skeleton")).not.toBe(null);
        expect(shadow(el).querySelector("uaui-empty-state")).toBe(null);
    });

    it("keeps the old bars under a loading bar when reloading", async () => {
        const el = await chart(html`<uaui-category-chart .categories=${categories} .series=${[visits]}></uaui-category-chart>`);
        const drawn = Chart.getChart(canvas(el));
        el.loading = true;
        await el.updateComplete;
        expect(shadow(el).querySelector("uaui-loading-bar")).not.toBe(null);
        expect(shadow(el).querySelector(".plot")!.hasAttribute("hidden")).toBe(false);
        expect(Chart.getChart(canvas(el))).toBe(drawn);
    });

    it("shows the empty state with no points, with the product's text", async () => {
        const el = await chart(html`<uaui-category-chart .categories=${categories} .series=${[]} empty-headline="No submissions yet"></uaui-category-chart>`);
        expect(shadow(el).querySelector("uaui-empty-state")?.shadowRoot?.textContent).toContain("No submissions yet");
    });

    it("says there is nothing to show by default, not to widen a date range", async () => {
        const el = await chart(html`<uaui-category-chart .categories=${categories} .series=${[]}></uaui-category-chart>`);
        const text = shadow(el).querySelector("uaui-empty-state")?.shadowRoot?.textContent;
        expect(text).toContain("There is nothing to show yet.");
        expect(text).not.toContain("date range");
    });

    it("shows the empty state when no point is in a given category", async () => {
        const el = await chart(
            html`<uaui-category-chart .categories=${categories} .series=${[{ id: "a", label: "A", points: [{ category: "watch", value: 1 }] }]}></uaui-category-chart>`,
        );
        expect(shadow(el).querySelector("uaui-empty-state")).not.toBe(null);
    });

    describe("Scenario: the load failed", () => {
        let el: El;
        beforeEach(async () => {
            el = await chart(
                html`<uaui-category-chart error retryable error-headline="Couldn't load" .categories=${categories} .series=${[visits]}></uaui-category-chart>`,
            );
            await settle(el);
        });

        it("shows the error state in place of the plot", () => {
            expect(shadow(el).querySelector("uaui-error-state")?.shadowRoot?.textContent).toContain("Couldn't load");
            expect(shadow(el).querySelector(".plot")!.hasAttribute("hidden")).toBe(true);
        });

        it("raises retry on the chart once", async () => {
            const events = recordEvents(el.parentElement!, "retry");
            await pressed(deepQuery(shadow(el), "uui-button")!);
            expect(events).toHaveLength(1);
        });
    });

    describe("Scenario: a11y audit", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); width: 400px">
                        <uaui-category-chart kind="stacked-bar" .categories=${categories} .series=${[visits, orders]} .compareSeries=${[lastVisits, lastOrders]}
                            compare-label="Last month"></uaui-category-chart>
                    </div>`,
                ).container.querySelector("div")!;
                await settle(host.querySelector("uaui-category-chart")!);
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        it("passes in the light theme", async () => {
            expect(await audit()).toHaveNoViolations();
        });

        it("passes in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });

        it("passes in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });
    });

    it("draws again in the new colours when the theme changes", async () => {
        const el = await chart(html`<uaui-category-chart .categories=${categories} .series=${[visits]}></uaui-category-chart>`);
        const before = canvas(el).toDataURL();
        const theme = document.createElement("style");
        theme.textContent = darkCss;
        document.head.appendChild(theme);
        try {
            await expect.poll(() => canvas(el).toDataURL()).not.toBe(before);
        } finally {
            theme.remove();
        }
    });

    it("destroys the chart when disconnected, and draws again when reconnected", async () => {
        const el = await chart(html`<uaui-category-chart .categories=${categories} .series=${[visits]}></uaui-category-chart>`);
        const parent = el.parentElement!;
        const c = canvas(el);
        el.remove();
        expect(Chart.getChart(c)).toBeUndefined();
        parent.appendChild(el);
        await el.updateComplete;
        expect(Chart.getChart(canvas(el))).toBeDefined();
    });
});
