// TBL-4 — Search rows
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { userEvent } from "vitest/browser";
import { nextEvent, renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";
import { pageColumns, pageRows } from "./table-fixtures.js";

const dataRows = (el: Element) => shadow(el).querySelectorAll("uui-table-row:not([part~='header'])");

describe("Feature: search rows", () => {
    describe("Scenario: typing in the search box", () => {
        let detail: unknown;
        beforeEach(async () => {
            const search = await renderElement(html`<uax-table-search></uax-table-search>`, "uax-table-search");
            const event = nextEvent(search, "search");
            (shadow(search).querySelector("input, uui-input") as HTMLElement).focus();
            await userEvent.keyboard("contact");
            detail = (await event).detail;
        });

        it.skip("raises search with the query once typing stops", () => {
            expect(detail).toEqual({ query: "contact" });
        });
    });

    describe("Scenario: client mode with a matching query", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table mode="client" .columns=${pageColumns} .rows=${pageRows}></uax-data-table>`, "uax-data-table");
            el.dispatchEvent(new CustomEvent("search", { detail: { query: "contact" }, bubbles: true, composed: true }));
            await el.updateComplete;
        });

        it.skip("shows only the matching row", () => {
            expect(dataRows(el)).toHaveLength(1);
        });
    });

    describe("Scenario (sad path): no rows match", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table mode="client" .columns=${pageColumns} .rows=${pageRows}></uax-data-table>`, "uax-data-table");
            el.dispatchEvent(new CustomEvent("search", { detail: { query: "zzz" }, bubbles: true, composed: true }));
            await el.updateComplete;
        });

        it.skip("shows the empty state", () => {
            expect(shadow(el).querySelector("uax-empty-state")).not.toBe(null);
        });
    });
});
