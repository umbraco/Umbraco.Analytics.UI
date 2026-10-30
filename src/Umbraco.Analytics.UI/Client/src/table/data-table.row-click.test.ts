// TBL-5 — Open a row
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { userEvent } from "vitest/browser";
import { renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";
import { nameColumns } from "./table-fixtures.js";

const rows = [{ name: "Home", views: 210 }];
const firstRow = (el: Element) => shadow(el).querySelector("uui-table-row:not([part~='header'])") as HTMLElement;

describe("Feature: open a row", () => {
    describe("Scenario: clicking a row", () => {
        let clicked: unknown[];
        beforeEach(async () => {
            clicked = [];
            const listener = (e: Event) => clicked.push((e as CustomEvent).detail.row);
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows} @row-click=${listener}></uax-data-table>`, "uax-data-table");
            firstRow(el).click();
        });

        it.skip("raises row-click with that row", () => {
            expect(clicked).toEqual([rows[0]]);
        });
    });

    describe("Scenario: pressing Enter on a focused row", () => {
        let clicked: unknown[];
        beforeEach(async () => {
            clicked = [];
            const listener = (e: Event) => clicked.push((e as CustomEvent).detail.row);
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows} @row-click=${listener}></uax-data-table>`, "uax-data-table");
            firstRow(el).focus();
            await userEvent.keyboard("{Enter}");
        });

        it.skip("raises row-click with that row", () => {
            expect(clicked).toEqual([rows[0]]);
        });
    });

    describe("Scenario (sad path): no row-click listener", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
        });

        it.skip("leaves rows unfocusable", () => {
            expect(firstRow(el).hasAttribute("tabindex")).toBe(false);
        });
    });
});
