// TBL-5 — Open a row
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import { userEvent } from "vitest/browser";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQuery, renderElement, settle, shadow, type UaxTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import { UAX_TABLE_CELL } from "./cells/cell-names.js";
import { nameColumns } from "./table-fixtures.js";

const rows = [{ name: "Home", views: 210 }];
const firstRow = (el: Element) => shadow(el).querySelector("uui-table-row:not([part~='header'])") as HTMLElement;

describe("Feature: open a row", () => {
    describe("Scenario: clicking a row", () => {
        let clicked: unknown[];
        beforeEach(async () => {
            clicked = [];
            const listener = (e: Event) => clicked.push((e as CustomEvent).detail.row);
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows} clickable-rows @row-click=${listener}></uax-data-table>`, "uax-data-table");
            firstRow(el).click();
        });

        it("raises row-click with that row", () => {
            expect(clicked).toEqual([rows[0]]);
        });
    });

    describe("Scenario: pressing Enter on a focused row", () => {
        let clicked: unknown[];
        beforeEach(async () => {
            clicked = [];
            const listener = (e: Event) => clicked.push((e as CustomEvent).detail.row);
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows} clickable-rows @row-click=${listener}></uax-data-table>`, "uax-data-table");
            firstRow(el).focus();
            await userEvent.keyboard("{Enter}");
        });

        it("raises row-click with that row", () => {
            expect(clicked).toEqual([rows[0]]);
        });
    });

    describe("Scenario (sad path): no row-click listener", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
        });

        it("leaves rows unfocusable", () => {
            expect(firstRow(el).hasAttribute("tabindex")).toBe(false);
        });
    });

    describe("Scenario: pressing Space on a focused row", () => {
        let clicked: unknown[];
        beforeEach(async () => {
            clicked = [];
            const listener = (e: Event) => clicked.push((e as CustomEvent).detail.row);
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows} clickable-rows @row-click=${listener}></uax-data-table>`, "uax-data-table");
            firstRow(el).focus();
            await userEvent.keyboard(" ");
        });

        it("raises row-click with that row", () => {
            expect(clicked).toEqual([rows[0]]);
        });
    });

    describe("Scenario: clickable rows", () => {
        it("makes each row reachable by keyboard", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows} clickable-rows></uax-data-table>`, "uax-data-table");
            expect(firstRow(el).getAttribute("tabindex")).toBe("0");
        });

        it("keeps the row role", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows} clickable-rows></uax-data-table>`, "uax-data-table");
            expect(firstRow(el).getAttribute("role")).toBe("row");
        });
    });

    describe("Scenario (sad path): a listener but rows not marked clickable", () => {
        it("raises nothing when a row is clicked", async () => {
            const clicked: unknown[] = [];
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows} @row-click=${(e: Event) => clicked.push(e)}></uax-data-table>`, "uax-data-table");
            firstRow(el).click();
            expect(clicked).toEqual([]);
        });
    });

    describe("Scenario (sad path): clicking a link in a row", () => {
        it("raises nothing", async () => {
            const clicked: unknown[] = [];
            const columns = [{ key: "name", label: "Name", elementName: UAX_TABLE_CELL.link, meta: { hrefKey: "url" } }];
            const el = await renderElement(
                html`<uax-data-table .columns=${columns} .rows=${[{ name: "Home", url: "#home" }]} clickable-rows @row-click=${(e: Event) => clicked.push(e)}></uax-data-table>`,
                "uax-data-table",
            );
            await settle(el);
            deepQuery<HTMLElement>(shadow(el), "a")!.click();
            expect(clicked).toEqual([]);
        });
    });

    describe("Scenario (sad path): pressing Enter on a link in a row", () => {
        it("raises nothing", async () => {
            const clicked: unknown[] = [];
            const columns = [{ key: "name", label: "Name", elementName: UAX_TABLE_CELL.link, meta: { hrefKey: "url" } }];
            const el = await renderElement(
                html`<uax-data-table .columns=${columns} .rows=${[{ name: "Home", url: "#home" }]} clickable-rows @row-click=${(e: Event) => clicked.push(e)}></uax-data-table>`,
                "uax-data-table",
            );
            await settle(el);
            deepQuery<HTMLElement>(shadow(el), "a")!.focus();
            await userEvent.keyboard("{Enter}");
            expect(clicked).toEqual([]);
        });
    });

    describe("Scenario (sad path): first load", () => {
        it("leaves the skeleton rows unfocusable", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${[]} loading clickable-rows></uax-data-table>`, "uax-data-table");
            expect(firstRow(el).hasAttribute("tabindex")).toBe(false);
        });
    });

    describe("Scenario: a11y audit with clickable rows", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 700px">
                        <uax-data-table .columns=${nameColumns} .rows=${rows} clickable-rows></uax-data-table>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uax-data-table")!.updateComplete;
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
});
