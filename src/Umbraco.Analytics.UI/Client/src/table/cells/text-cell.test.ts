/// <reference types="vite/client" />
// T68 — A second line under a text or link cell's value, from `meta.secondaryKey`.
import { describe, expect, it } from "vitest";
import { html } from "#platform/lit";
import { render } from "vitest-browser-lit";
import { axeRun } from "../../internal/test/a11y.js";
import { renderElement, settle, shadow } from "../../internal/test/dom.js";
import "../data-table.element.js";
import "./index.js";
import { UAUI_TABLE_CELL } from "./cell-names.js";
import type { UauiTableColumn } from "../types.js";

const textColumn: UauiTableColumn = { key: "name", label: "Product", meta: { secondaryKey: "sku" } };
const linkColumn: UauiTableColumn = { key: "name", label: "Customer", meta: { hrefKey: "url", secondaryKey: "email" } };

async function mount(tag: "uaui-text-cell" | "uaui-link-cell", column: UauiTableColumn, item: Record<string, unknown>, loading = false): Promise<HTMLElement> {
    const template =
        tag === "uaui-text-cell"
            ? html`<div style="width: 200px"><uaui-text-cell ?loading=${loading} .column=${column} .item=${item} .value=${item[column.key]}></uaui-text-cell></div>`
            : html`<div style="width: 200px"><uaui-link-cell ?loading=${loading} .column=${column} .item=${item} .value=${item[column.key]}></uaui-link-cell></div>`;
    const cell = render(template).container.querySelector<HTMLElement>(tag)!;
    await settle(cell);
    return cell;
}
const second = (cell: Element) => shadow(cell).querySelector("uaui-table-secondary-line") as HTMLElement | null;
const secondSpan = (cell: Element) => shadow(second(cell)!).querySelector<HTMLElement>(".text")!;

describe("Feature: a second line in a table cell", () => {
    describe("Scenario: a text cell with a secondaryKey", () => {
        it("shows the second line under the value", async () => {
            const cell = await mount("uaui-text-cell", textColumn, { name: "Hoodie", sku: "SKU-1" });
            expect(secondSpan(cell).textContent).toBe("SKU-1");
        });

        it("draws no second line without a secondaryKey", async () => {
            const cell = await mount("uaui-text-cell", { key: "name", label: "Product" }, { name: "Hoodie", sku: "SKU-1" });
            expect(second(cell)).toBe(null);
        });

        it("keeps the line, empty, for a row without one", async () => {
            const cell = await mount("uaui-text-cell", textColumn, { name: "Hoodie" });
            expect(second(cell)!.getBoundingClientRect().height).toBe(16);
        });

        it("mutes the second line with a UUI colour", async () => {
            const cell = await mount("uaui-text-cell", textColumn, { name: "Hoodie", sku: "SKU-1" });
            expect(getComputedStyle(second(cell)!).color).not.toBe(getComputedStyle(cell).color);
        });

        it("cuts a long second line with an ellipsis and keeps the full text as its title", async () => {
            const sku = "SKU-".repeat(40);
            const cell = await mount("uaui-text-cell", textColumn, { name: "Hoodie", sku });
            const span = secondSpan(cell);
            expect([getComputedStyle(span).textOverflow, span.scrollWidth > span.clientWidth, span.title]).toEqual(["ellipsis", true, sku]);
        });

        it("lines the second line up with the end of an end-aligned column", async () => {
            const cell = await mount("uaui-text-cell", { ...textColumn, align: "end" }, { name: "Hoodie", sku: "SKU-1" });
            expect(Math.round(secondSpan(cell).getBoundingClientRect().right)).toBe(Math.round(cell.getBoundingClientRect().right));
        });

        it("has no accessibility violations", async () => {
            const cell = await mount("uaui-text-cell", textColumn, { name: "Hoodie", sku: "SKU-1" });
            expect(await axeRun(cell)).toHaveNoViolations();
        });
    });

    describe("Scenario: a link cell with a secondaryKey", () => {
        const item = { name: "Jane", url: "/customers/1", email: "jane@example.com" };

        it("links only the main line", async () => {
            const cell = await mount("uaui-link-cell", linkColumn, item);
            expect(shadow(cell).querySelector("a")!.textContent).toBe("Jane");
        });

        it("shows the second line outside the link", async () => {
            const cell = await mount("uaui-link-cell", linkColumn, item);
            expect([secondSpan(cell).textContent, shadow(cell).querySelector("a")!.contains(second(cell))]).toEqual(["jane@example.com", false]);
        });

        it("has no accessibility violations", async () => {
            const cell = await mount("uaui-link-cell", linkColumn, item);
            expect(await axeRun(cell)).toHaveNoViolations();
        });
    });

    describe("Scenario: loading", () => {
        const skeleton = (cell: Element) => shadow(cell).querySelector<HTMLElement>("uaui-table-skeleton-cell")!;

        it("draws two lines when secondaryKey is set", async () => {
            const cell = await mount("uaui-text-cell", textColumn, {}, true);
            expect(shadow(skeleton(cell)).querySelectorAll(".line").length).toBe(2);
        });

        it("draws two lines in a link cell too", async () => {
            const cell = await mount("uaui-link-cell", linkColumn, {}, true);
            expect(shadow(skeleton(cell)).querySelectorAll(".line").length).toBe(2);
        });

        it("draws one line without a secondaryKey", async () => {
            const cell = await mount("uaui-text-cell", { key: "name", label: "Product" }, {}, true);
            expect(shadow(skeleton(cell)).querySelectorAll(".line").length).toBe(1);
        });
    });

    describe("Scenario: in a table", () => {
        const columns: UauiTableColumn[] = [{ ...textColumn, elementName: UAUI_TABLE_CELL.text }];
        const rows = [
            { name: "Hoodie", sku: "SKU-1" },
            { name: "Mug", sku: "MUG-7" },
        ];
        const table = (loading: boolean, query = "") =>
            renderElement(
                html`<div style="width: 400px"><uaui-data-table ?loading=${loading} .columns=${columns} .rows=${loading ? [] : rows} .query=${query}></uaui-data-table></div>`,
                "uaui-data-table",
            );
        const bodyRowHeight = (el: Element) => {
            const row = [...shadow(el).querySelectorAll("uui-table-row")].find((r) => r.querySelector("uui-table-cell") && !r.querySelector("uui-table-head-cell"))!;
            return row.getBoundingClientRect().height;
        };

        it("keeps a loading row the height of a loaded row", async () => {
            const loading = await table(true);
            await settle(loading);
            const loaded = await table(false);
            await settle(loaded);
            expect(bodyRowHeight(loading)).toBe(bodyRowHeight(loaded));
        });

        it("searches the second line too", async () => {
            const el = await table(false, "mug-7");
            await settle(el);
            expect(shadow(el).querySelectorAll("uaui-text-cell").length).toBe(1);
        });
    });
});
