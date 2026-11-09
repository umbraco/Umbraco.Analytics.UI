// An empty compare badge takes no room: a cell without a comparison ends at its value, in line with its header
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { html } from "#platform/lit";
import "#platform/uui";
import { axeRun } from "../internal/test/a11y.js";
import { deepQuery, renderElement, settle, shadow } from "../internal/test/dom.js";
import "./data-table.element.js";
import "./table-compare-badge.element.js";
import { UAUI_TABLE_CELL } from "./cells/cell-names.js";
import type { UauiTableColumn } from "./types.js";

const columns: UauiTableColumn[] = [
    { key: "name", label: "Name" },
    { key: "orders", label: "Orders", elementName: UAUI_TABLE_CELL.number, align: "end" },
    { key: "rate", label: "Rate", elementName: UAUI_TABLE_CELL.percent, align: "end" },
    { key: "visits", label: "Visits", elementName: UAUI_TABLE_CELL.share, align: "end" },
];
const rows = [
    { name: "A", orders: 120, rate: 0.5, visits: 300 },
    { name: "B", orders: 90, rate: 0.4, visits: 100 },
    { name: "C", orders: 40, rate: 0.2, visits: 50 },
];
// Row A has a compare row, row B has none, and row C's compare values are 0: a percent change from 0 is unknown.
const compareRows = [
    { name: "A", orders: 100, rate: 0.4, visits: 250 },
    { name: "C", orders: 0, rate: 0, visits: 0 },
];

// Away from the top-left corner, where the test pointer rests.
async function table(compare: unknown[] = compareRows) {
    const el = await renderElement(
        html`<div style="margin: 200px; width: 700px">
            <uaui-data-table .columns=${columns} .rows=${rows} .compareRows=${compare} row-key="name"></uaui-data-table>
        </div>`,
        "uaui-data-table",
    );
    await settle(el);
    return el;
}

const cell = (el: Element, row: number, column: number) =>
    shadow(el).querySelectorAll("uui-table-row:not(.column-toolbar)")[row].querySelectorAll("uui-table-cell")[column];

/** The right edge of the last text in a cell's value, read from the text itself rather than any box around it. */
function textRight(root: Element, selector: string): number {
    const element = deepQuery(root, selector)!;
    const range = document.createRange();
    range.selectNodeContents(element);
    return range.getBoundingClientRect().right;
}

/** The right edge of a cell's content box: where an end-aligned value, and its header, end. */
function contentRight(tableCell: Element): number {
    const box = tableCell.getBoundingClientRect();
    return box.right - parseFloat(getComputedStyle(tableCell).paddingRight);
}

const badgeLeft = (tableCell: Element) => deepQuery(tableCell, "uaui-delta-badge")!.getBoundingClientRect().left;

describe("Feature: an empty compare badge takes no room", () => {
    describe("Scenario: an end-aligned number cell without a comparison", () => {
        it("ends at the cell's content edge, where its header ends", async () => {
            const tableCell = cell(await table(), 1, 1);
            expect(textRight(tableCell, ".value")).toBeCloseTo(contentRight(tableCell), 0);
        });
    });

    describe("Scenario: an end-aligned percent cell without a comparison", () => {
        it("ends at the cell's content edge, where its header ends", async () => {
            const tableCell = cell(await table(), 1, 2);
            expect(textRight(tableCell, ".value")).toBeCloseTo(contentRight(tableCell), 0);
        });
    });

    describe("Scenario: an end-aligned share cell without a comparison", () => {
        it("ends at the cell's content edge, where its header ends", async () => {
            const tableCell = cell(await table(), 1, 3);
            expect(textRight(tableCell, ".share-percent")).toBeCloseTo(contentRight(tableCell), 0);
        });
    });

    describe("Scenario: an end-aligned number cell whose compare value is 0", () => {
        it("draws no delta badge", async () => {
            const tableCell = cell(await table(), 2, 1);
            expect(deepQuery(tableCell, "uaui-delta-badge")).toBeNull();
        });

        it("ends at the cell's content edge, where its header ends", async () => {
            const tableCell = cell(await table(), 2, 1);
            expect(textRight(tableCell, ".value")).toBeCloseTo(contentRight(tableCell), 0);
        });
    });

    describe("Scenario: an end-aligned share cell whose compare value is 0", () => {
        it("ends at the cell's content edge, where its header ends", async () => {
            const tableCell = cell(await table(), 2, 3);
            expect(textRight(tableCell, ".share-percent")).toBeCloseTo(contentRight(tableCell), 0);
        });
    });

    describe("Scenario: a table without compare rows", () => {
        it("ends every number at the cell's content edge", async () => {
            const tableCell = cell(await table([]), 0, 1);
            expect(textRight(tableCell, ".value")).toBeCloseTo(contentRight(tableCell), 0);
        });
    });

    describe("Scenario: a number cell with a comparison", () => {
        it("keeps the 6px gap between the number and its badge", async () => {
            const tableCell = cell(await table(), 0, 1);
            const value = deepQuery(tableCell, ".value")!;
            // The formatted number is the value's text node; Lit's marker comments sit around it.
            const text = [...value.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())!;
            const number = document.createRange();
            number.selectNodeContents(text);
            expect(badgeLeft(tableCell) - number.getBoundingClientRect().right).toBeCloseTo(6, 0);
        });
    });

    describe("Scenario: a share cell with a comparison", () => {
        it("keeps the 6px gap between the percent and its badge", async () => {
            const tableCell = cell(await table(), 0, 3);
            expect(badgeLeft(tableCell) - textRight(tableCell, ".share-percent")).toBeCloseTo(6, 0);
        });
    });

    describe("Scenario: a product cell that gives the badge its own grid column", () => {
        it("keeps the empty badge in that column, so the next item stays in its own column", async () => {
            const host = await renderElement(
                html`<div style="display: grid; grid-template-columns: 4em 5.5em 1fr">
                    <span>1</span>
                    <uaui-table-compare-badge .column=${{ key: "orders", label: "" }} .item=${{}} .value=${1}></uaui-table-compare-badge>
                    <div class="bar"></div>
                </div>`,
                "div",
            );
            const badge = host.querySelector("uaui-table-compare-badge")!;
            await settle(badge);
            // The bar starts in the third column, after 4em + 5.5em, not in the badge's column.
            const em = parseFloat(getComputedStyle(host).fontSize);
            const barLeft = host.querySelector(".bar")!.getBoundingClientRect().left - host.getBoundingClientRect().left;
            expect(barLeft).toBeCloseTo(9.5 * em, 0);
        });
    });

    describe("Scenario: a11y audit of a table with and without badges", () => {
        it("has no violations", async () => {
            const el = await table();
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });
});
