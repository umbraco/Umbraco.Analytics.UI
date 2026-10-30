// TBL-2 — Sort by a column
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { nextEvent, recordEvents, renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";
import { nameColumns } from "./table-fixtures.js";

const rows = [{ name: "Contact", views: 62 }, { name: "Home", views: 210 }];
const header = (el: Element, label: string) =>
    [...shadow(el).querySelectorAll("uui-table-head-cell")].find((h) => h.textContent?.includes(label)) as HTMLElement;
const firstName = (el: Element) => shadow(el).querySelector("uui-table-row:not([part~='header']) uui-table-cell")?.textContent?.trim();

describe("Feature: sort by a column", () => {
    describe("Scenario: clicking a sortable header", () => {
        let detail: unknown;
        beforeEach(async () => {
            const el = await renderElement(
                html`<uax-data-table .columns=${nameColumns} .rows=${rows} .sort=${{ key: "views", direction: "desc" }}></uax-data-table>`,
                "uax-data-table",
            );
            const event = nextEvent(el, "sort-change");
            header(el, "Views").click();
            detail = (await event).detail;
        });

        it.skip("raises sort-change with the other direction", () => {
            expect(detail).toEqual({ key: "views", direction: "asc" });
        });
    });

    describe("Scenario: client mode", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table mode="client" .columns=${nameColumns} .rows=${rows} .sort=${{ key: "views", direction: "desc" }}></uax-data-table>`,
                "uax-data-table",
            );
        });

        it.skip("puts the most-viewed row first", () => {
            expect(firstName(el)).toBe("Home");
        });
    });

    describe("Scenario: server mode", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table mode="server" .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            header(el, "Views").click();
            await el.updateComplete;
        });

        it.skip("keeps the rows in the order given", () => {
            expect(firstName(el)).toBe("Contact");
        });
    });

    describe("Scenario (sad path): a column that isn't sortable", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            events = recordEvents(el, "sort-change");
            header(el, "Name").click();
        });

        it.skip("raises no sort-change", () => {
            expect(events).toHaveLength(0);
        });
    });
});
