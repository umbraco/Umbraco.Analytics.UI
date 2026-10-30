// TBL-3 — Page through rows
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { nextEvent, renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";
import { manyRows, nameColumns } from "./table-fixtures.js";

const footer = (el: Element) => shadow(el).querySelector("[part~='pager']") as HTMLElement | null;
const pageSizeSelect = (el: Element) => footer(el)!.querySelector("[name='page-size']") as HTMLSelectElement;
const nextButton = (el: Element) => footer(el)!.querySelector("[part~='next']") as HTMLElement;

describe("Feature: page through rows", () => {
    describe("Scenario: 272 rows, 10 per page, on page 1", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table mode="server" .columns=${nameColumns} .rows=${manyRows(10)} total="272" page="1" page-size="10"></uax-data-table>`,
                "uax-data-table",
            );
        });

        it.skip("shows 1–10 of 272", () => {
            expect(footer(el)!.textContent).toContain("1–10 of 272");
        });
    });

    describe("Scenario: moving to the next page", () => {
        let detail: unknown;
        beforeEach(async () => {
            const el = await renderElement(
                html`<uax-data-table mode="server" .columns=${nameColumns} .rows=${manyRows(10)} total="272" page="1" page-size="10"></uax-data-table>`,
                "uax-data-table",
            );
            const event = nextEvent(el, "page-change");
            nextButton(el).click();
            detail = (await event).detail;
        });

        it.skip("raises page-change for page 2", () => {
            expect(detail).toEqual({ page: 2, pageSize: 10 });
        });
    });

    describe("Scenario: changing the page size", () => {
        let detail: unknown;
        beforeEach(async () => {
            const el = await renderElement(
                html`<uax-data-table mode="server" .columns=${nameColumns} .rows=${manyRows(10)} total="272" page="3" page-size="10"></uax-data-table>`,
                "uax-data-table",
            );
            const event = nextEvent(el, "page-change");
            const select = pageSizeSelect(el);
            select.value = "25";
            select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            detail = (await event).detail;
        });

        it.skip("raises page-change for page 1 with 25 rows", () => {
            expect(detail).toEqual({ page: 1, pageSize: 25 });
        });
    });

    describe("Scenario: client mode, page 2 of 30 rows", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table mode="client" .columns=${nameColumns} .rows=${manyRows(30)} page-size="10"></uax-data-table>`,
                "uax-data-table",
            );
            nextButton(el).click();
            await el.updateComplete;
        });

        it.skip("shows rows 11 to 20", () => {
            expect(shadow(el).querySelector("uui-table-row:not([part~='header']) uui-table-cell")?.textContent?.trim()).toBe("Page 11");
        });
    });

    describe("Scenario: everything fits on one page", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table mode="client" .columns=${nameColumns} .rows=${manyRows(8)} page-size="10"></uax-data-table>`,
                "uax-data-table",
            );
        });

        it.skip("has no paging footer", () => {
            expect(footer(el)).toBe(null);
        });
    });
});
