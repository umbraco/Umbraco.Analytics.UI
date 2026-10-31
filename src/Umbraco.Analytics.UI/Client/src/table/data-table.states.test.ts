// FND-3 — Empty and loading states (AC2 to AC6 on the table)
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import { deepQuery, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import { manyRows, nameColumns, pageColumns, pageRows } from "./table-fixtures.js";

const table = (el: Element) => shadow(el).querySelector("uui-table")!;

describe("Feature: table empty and loading states", () => {
    describe("Scenario: no rows and no text set", () => {
        it("shows the empty state with the default text", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${pageColumns} .rows=${[]}></uaui-data-table>`, "uaui-data-table");
            expect(shadow(el).querySelector("uaui-empty-state")?.shadowRoot?.textContent).toContain("No data yet");
        });
    });

    describe("Scenario: no rows, with the product's text", () => {
        it("passes the text to the empty state", async () => {
            const el = await renderElement(
                html`<uaui-data-table .columns=${pageColumns} .rows=${[]} empty-headline="No pages yet"></uaui-data-table>`,
                "uaui-data-table",
            );
            expect(shadow(el).querySelector("uaui-empty-state")?.shadowRoot?.textContent).toContain("No pages yet");
        });
    });

    describe("Scenario: no rows", () => {
        it("keeps the header row", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${pageColumns} .rows=${[]}></uaui-data-table>`, "uaui-data-table");
            expect(shadow(el).querySelectorAll("uui-table-head-cell").length).toBe(3);
        });
    });

    describe("Scenario: first load", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<div style="width: 600px"><uaui-data-table loading .columns=${nameColumns} .rows=${[]}></uaui-data-table></div>`,
                "uaui-data-table",
            );
        });

        it("shows a skeleton", () => {
            expect(deepQuery(shadow(el), "uaui-skeleton")).not.toBe(null);
        });

        it("shows no empty state", () => {
            expect(shadow(el).querySelector("uaui-empty-state")).toBe(null);
        });

        it("keeps the header row", () => {
            expect(shadow(el).querySelectorAll("uui-table-head-cell").length).toBe(2);
        });

        it("takes the height of the loaded table", async () => {
            // The skeleton is five rows, so a table of five single-line rows does not jump.
            const loadingHeight = el.getBoundingClientRect().height;
            el.rows = manyRows(5);
            el.loading = false;
            await settle(el);
            expect(el.getBoundingClientRect().height).toBe(loadingHeight);
        });

        it("takes the height of the loaded table when it has share columns", async () => {
            el.columns = pageColumns;
            await el.updateComplete;
            const loadingHeight = el.getBoundingClientRect().height;
            el.rows = Array.from({ length: 5 }, (_, i) => ({ url: `/p${i}`, pageviews: 5 - i, sessions: 1 }));
            el.loading = false;
            await settle(el);
            expect(el.getBoundingClientRect().height).toBe(loadingHeight);
        });
    });

    describe("Scenario: reloading with rows shown", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-data-table .columns=${pageColumns} .rows=${pageRows}></uaui-data-table>`,
                "uaui-data-table",
            );
            el.loading = true;
            await el.updateComplete;
        });

        it("keeps the old rows visible", () => {
            expect(shadow(el).querySelectorAll("uui-table-row:not(.summary)").length).toBe(2);
        });

        it("shows a loading bar", () => {
            expect(shadow(el).querySelector("uaui-loading-bar")).not.toBe(null);
        });

        it("shows no skeleton", () => {
            expect(deepQuery(shadow(el), "uaui-skeleton")).toBe(null);
        });

        it("puts the loading bar on the top edge", () => {
            expect(shadow(el).querySelector("uaui-loading-bar")!.getBoundingClientRect().top).toBe(el.getBoundingClientRect().top);
        });

        it("spans the loading bar across the full width", () => {
            expect(shadow(el).querySelector("uaui-loading-bar")!.getBoundingClientRect().width).toBe(el.getBoundingClientRect().width);
        });

        it("marks the table busy", () => {
            expect(table(el).getAttribute("aria-busy")).toBe("true");
        });
    });

    describe("Scenario: not loading", () => {
        it("does not mark the table busy", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${pageColumns} .rows=${pageRows}></uaui-data-table>`, "uaui-data-table");
            expect(table(el).getAttribute("aria-busy")).toBe("false");
        });

        it("shows no loading bar", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${pageColumns} .rows=${pageRows}></uaui-data-table>`, "uaui-data-table");
            expect(shadow(el).querySelector("uaui-loading-bar")).toBe(null);
        });
    });
});
