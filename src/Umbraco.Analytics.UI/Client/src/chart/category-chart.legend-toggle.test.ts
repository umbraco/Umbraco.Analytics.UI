// Legend entries show and hide series on the category chart too (the parts are shared with the time-series chart).
/// <reference types="vite/client" />
import { Chart } from "@umbraco/analytics-ui/external/chart.js";
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQuery, deepText, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./category-chart.element.js";
import type { UauiCategorySeries } from "./types.js";

const categories = ["Mobile", "Tablet", "Desktop"].map((label) => ({ id: label.toLowerCase(), label }));
const points = (values: number[]) => values.map((value, i) => ({ category: categories[i].id, value }));
const visits: UauiCategorySeries = { id: "visits", label: "Visits", points: points([400, 1200, 2800]) };
const orders: UauiCategorySeries = { id: "orders", label: "Orders", points: points([12, 30, 61]) };
const lastVisits: UauiCategorySeries = { id: "visits", label: "Visits", points: points([600, 900, 2000]) };
const lastOrders: UauiCategorySeries = { id: "orders", label: "Orders", points: points([10, 20, 40]) };

const chart = (kind = "bar", compare = false) =>
    renderElement(
        html`<uaui-category-chart
            kind=${kind}
            .categories=${categories}
            .series=${[visits, orders]}
            .compareSeries=${compare ? [lastVisits, lastOrders] : []}
            compare-label="Last month"
            style="width:400px"></uaui-category-chart>`,
        "uaui-category-chart",
    );

const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
const legend = (el: Element) => deepQuery<UauiTestElement>(shadow(el), "uaui-chart-legend")!;
const entry = (el: Element, label: string) =>
    [...legend(el).shadowRoot!.querySelectorAll<HTMLButtonElement>("button.legend-entry")].find((b) => b.textContent!.trim() === label)!;
const toggle = async (el: Element, label: string) => {
    entry(el, label).click();
    await settle(el);
};
const hiddenTable = (el: Element) => deepQuery<HTMLTableElement>(shadow(el), "table")!;
const headers = (el: Element) => [...hiddenTable(el).tHead!.rows[0].cells].map((c) => c.textContent!.trim());
const labels = (el: Element) => chartOf(el).data.datasets.map((set) => set.label);

describe("Feature: category chart legend toggles", () => {
    describe("Scenario: hiding a series", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart();
            await toggle(el, "Visits");
        });

        it("stops drawing it and rescales the y-axis to the one left", () => {
            expect(labels(el)).toEqual(["Orders"]);
            expect(chartOf(el).scales["y"].max).toBeLessThan(100);
        });

        it("marks its entry not pressed", () => {
            expect(entry(el, "Visits").getAttribute("aria-pressed")).toBe("false");
        });

        it("drops it from the hidden table", () => {
            expect(headers(el)).toEqual(["Category", "Orders"]);
        });

        it("keeps the other series' colour", () => {
            const swatch = getComputedStyle(entry(el, "Orders").querySelector(".legend-swatch")!).backgroundColor;
            expect(chartOf(el).data.datasets[0].backgroundColor).toBe(swatch);
        });
    });

    describe("Scenario: stacked bars", () => {
        it("totals only the series that are drawn", async () => {
            const el = await chart("stacked-bar");
            await toggle(el, "Visits");
            expect(headers(el)).toEqual(["Category", "Orders"]);
        });
    });

    describe("Scenario: compare", () => {
        it("keeps the compare entry, and drops a hidden series' compare from the compare bar", async () => {
            const el = await chart("bar", true);
            const before = chartOf(el).data.datasets.find((set) => set.label !== "Visits" && set.label !== "Orders")!.data.slice();
            await toggle(el, "Visits");
            expect(deepText(legend(el))).toContain("Last month");
            const after = chartOf(el).data.datasets.find((set) => set.label !== "Orders")!.data;
            expect(after).toEqual([10, 20, 40]);
            expect(before).toEqual([610, 920, 2040]);
        });

        it("keeps the compare entry and the legend with every series hidden", async () => {
            const el = await chart("bar", true);
            await toggle(el, "Visits");
            await toggle(el, "Orders");
            expect(chartOf(el).data.datasets.filter((set) => set.label === "Visits" || set.label === "Orders")).toEqual([]);
            expect(shadow(el).querySelector("uaui-empty-state")).toBe(null);
            expect(deepText(legend(el))).toContain("Last month");
        });
    });

    describe("Scenario: every series hidden", () => {
        it("keeps the chart and its legend rather than the empty state, and passes an a11y audit", async () => {
            const el = await chart();
            await toggle(el, "Visits");
            await toggle(el, "Orders");
            expect(shadow(el).querySelector("uaui-empty-state")).toBe(null);
            expect(chartOf(el).data.datasets).toHaveLength(0);
            expect(entry(el, "Visits")).toBeTruthy();
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });
});
