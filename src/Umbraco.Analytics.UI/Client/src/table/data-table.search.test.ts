// TBL-4 — Search rows
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { userEvent } from "vitest/browser";
import { nextEvent, renderElement, shadow, type UaxTestElement } from "../internal/test/dom.js";
import "../table-search/table-search.element.js";
import "./data-table.element.js";
import { pageColumns, pageRows } from "./table-fixtures.js";

const dataRows = (el: Element) => shadow(el).querySelectorAll("uui-table-row:not([part~='header'])");

describe("Feature: search rows", () => {
    describe("Scenario: typing in the search box", () => {
        let detail: unknown;
        beforeEach(async () => {
            const search = await renderElement(html`<uax-table-search></uax-table-search>`, "uax-table-search");
            const event = nextEvent(search, "search");
            // Only the timers are faked, after render, so the debounce is driven by the test and not by the machine's speed.
            vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
            const field = shadow(search).querySelector("uui-input") as HTMLElement & { value: string };
            field.value = "contact";
            field.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
            vi.advanceTimersByTime(450);
            detail = (await event).detail;
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("raises search with the query once typing stops", () => {
            expect(detail).toEqual({ query: "contact" });
        });
    });

    describe("Scenario: client mode with a matching query", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table mode="client" .columns=${pageColumns} .rows=${pageRows}><uax-table-search slot="toolbar"></uax-table-search></uax-data-table>`, "uax-data-table");
            el.querySelector("uax-table-search")!.dispatchEvent(new CustomEvent("search", { detail: { query: "contact" }, bubbles: true }));
            await el.updateComplete;
        });

        it("shows only the matching row", () => {
            expect(dataRows(el)).toHaveLength(1);
        });
    });

    describe("Scenario (sad path): no rows match", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table mode="client" .columns=${pageColumns} .rows=${pageRows}><uax-table-search slot="toolbar"></uax-table-search></uax-data-table>`, "uax-data-table");
            el.querySelector("uax-table-search")!.dispatchEvent(new CustomEvent("search", { detail: { query: "zzz" }, bubbles: true }));
            await el.updateComplete;
        });

        it("shows the empty state", () => {
            expect(shadow(el).querySelector("uax-empty-state")).not.toBe(null);
        });
    });

    describe("Scenario: a toolbar search box drives the table", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table mode="client" .columns=${pageColumns} .rows=${pageRows}>
                    <uax-table-search slot="toolbar"></uax-table-search>
                </uax-data-table>`,
                "uax-data-table",
            );
            const box = el.querySelector("uax-table-search") as HTMLElement;
            (shadow(box).querySelector("uui-input") as HTMLElement).focus();
            await userEvent.keyboard("contact");
            await new Promise((resolve) => setTimeout(resolve, 450));
            await el.updateComplete;
        });

        it("filters the rows without any wiring by the product", () => {
            expect(dataRows(el)).toHaveLength(1);
        });
    });

    describe("Scenario: the query property", () => {
        const columns = [
            { key: "name", label: "Name" },
            { key: "note", label: "Note", searchable: true },
        ];
        const rows = [
            { name: "Alpha", note: "first" },
            { name: "Beta", note: "alpha" },
        ];
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table .columns=${columns} .rows=${rows} query="ALPHA"></uax-data-table>`, "uax-data-table");
        });

        it("looks only in the searchable columns, ignoring case", () => {
            expect(dataRows(el)).toHaveLength(1);
        });
    });

    describe("Scenario: server mode", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table mode="server" .columns=${pageColumns} .rows=${pageRows} query="zzz"></uax-data-table>`,
                "uax-data-table",
            );
        });

        it("does not filter the rows", () => {
            expect(dataRows(el)).toHaveLength(2);
        });
    });

    describe("Scenario: searching from a later page", () => {
        const rows = Array.from({ length: 30 }, (_, i) => ({ name: i < 15 ? `Page ${i}` : `Post ${i}` }));
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table .columns=${[{ key: "name", label: "Name" }]} .rows=${rows} .page=${3}><uax-table-search slot="toolbar"></uax-table-search></uax-data-table>`,
                "uax-data-table",
            );
            el.querySelector("uax-table-search")!.dispatchEvent(new CustomEvent("search", { detail: { query: "page" }, bubbles: true }));
            await el.updateComplete;
        });

        it("goes back to page 1", () => {
            expect(el.page).toBe(1);
        });

        it("pages the matching rows", () => {
            expect(dataRows(el)).toHaveLength(10);
        });
    });

    describe("Scenario: a number value", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table .columns=${[{ key: "views", label: "Views" }]} .rows=${[{ views: 210 }]} query="210"></uax-data-table>`,
                "uax-data-table",
            );
        });

        it("is not matched, because only text values are searched", () => {
            expect(dataRows(el)).toHaveLength(0);
        });
    });

    describe("Scenario: server mode with a query and no rows", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table mode="server" .columns=${pageColumns} .rows=${[]} query="zzz"></uax-data-table>`,
                "uax-data-table",
            );
        });

        it("shows the no-results empty state", () => {
            expect(shadow(el).querySelector("uax-empty-state")?.shadowRoot?.textContent).toContain("Sorry, we can not find");
        });
    });
});
