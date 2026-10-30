// TBL-1 — Table cells by column type
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";
import { pageColumns, pageRows } from "./table-fixtures.js";

const firstRowCells = (el: Element) => [...shadow(el).querySelectorAll("uui-table-row:not([part~='header']) uui-table-cell")].slice(0, 3);
const bars = (el: Element, column: number) =>
    [...shadow(el).querySelectorAll(`uui-table-row uui-table-cell:nth-child(${column + 1}) [part~='share-bar']`)] as HTMLElement[];

describe("Feature: table cells by column type", () => {
    describe("Scenario: a number column in en-US", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-data-table .columns=${[{ key: "n", label: "N", type: "number" }]} .rows=${[{ n: 1234 }]}></uan-data-table>`,
                "uan-data-table",
            );
        });

        it.skip("shows 1,234", () => {
            expect(firstRowCells(el)[0].textContent?.trim()).toBe("1,234");
        });
    });

    describe("Scenario: share columns", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-data-table .columns=${pageColumns} .rows=${pageRows}></uan-data-table>`, "uan-data-table");
        });

        it.skip("shows the value and its percent of the column total", () => {
            expect(firstRowCells(el)[1].textContent).toContain("210 (77.2%)");
        });

        it.skip("draws the largest value's bar at full width", () => {
            expect(bars(el, 1)[0].style.width).toBe("100%");
        });

        it.skip("colours the second share column's bars with --uan-series-2", () => {
            expect(getComputedStyle(bars(el, 2)[0]).backgroundColor).toBe(
                getComputedStyle(el).getPropertyValue("--uan-series-2").trim(),
            );
        });

        it.skip("renders link cells as anchors to the row's url", () => {
            expect(firstRowCells(el)[0].querySelector("a")?.getAttribute("href")).toBe("https://example.com/");
        });
    });

    describe("Scenario: comparing with earlier rows", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            const compareRows = [{ url: "https://example.com/", pageviews: 190, sessions: 30 }];
            el = await renderElement(
                html`<uan-data-table .columns=${pageColumns} .rows=${pageRows} .compareRows=${compareRows} row-key="url"></uan-data-table>`,
                "uan-data-table",
            );
        });

        it.skip("puts a small change badge after the share value", () => {
            expect(firstRowCells(el)[1].querySelector("uan-delta-badge[size='sm']")).not.toBe(null);
        });
    });

    describe("Scenario: content in the toolbar slot", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-data-table .columns=${pageColumns} .rows=${pageRows}><div slot="toolbar" id="totals">272</div></uan-data-table>`,
                "uan-data-table",
            );
        });

        it.skip("sits above the header row", () => {
            const toolbar = el.querySelector("#totals")!.getBoundingClientRect();
            const header = shadow(el).querySelector("uui-table-head")!.getBoundingClientRect();
            expect(toolbar.bottom).toBeLessThanOrEqual(header.top);
        });
    });
});
