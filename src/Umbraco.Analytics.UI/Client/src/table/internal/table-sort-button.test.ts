// The sort button's label lines up with its column's values, whichever side the column is aligned to.
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import "@umbraco-cms/backoffice/external/uui";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { axeRun } from "../../internal/test/a11y.js";
import { deepQueryAll, renderElement, settle, shadow } from "../../internal/test/dom.js";
import "../data-table.element.js";
import { UAUI_TABLE_CELL } from "../cells/cell-names.js";
import "./table-sort-button.element.js";

const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "views", label: "Unique members", elementName: UAUI_TABLE_CELL.number, sortable: true, sortAs: "number", align: "end" },
];
const rows = [
    { name: "Support Request", views: 33426 },
    { name: "Event Registration", views: 33405 },
];

const label = (button: Element) => shadow(button).querySelector(".label")!.getBoundingClientRect();
const symbol = (button: Element) => shadow(button).querySelector("uui-symbol-sort")!.getBoundingClientRect();
const buttonBox = (button: Element) => shadow(button).querySelector("button")!.getBoundingClientRect();
const sortButton = async (align: "start" | "end") => {
    const el = await renderElement(
        html`<div style="width: 240px; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase">
            <uaui-table-sort-button align=${align}>Unique members</uaui-table-sort-button>
        </div>`,
        "div",
    );
    const button = el.querySelector("uaui-table-sort-button")!;
    await settle(button);
    return button;
};

describe("Feature: sort button alignment", () => {
    describe("Scenario: align end", () => {
        it("ends the label at the button's end edge, with no room for the symbol after it", async () => {
            const button = await sortButton("end");
            // The label's last letter carries 0.6px of letter spacing after it.
            expect(Math.abs(buttonBox(button).right - label(button).right)).toBeLessThan(1);
        });

        it("puts the symbol beside the label, before it", async () => {
            const button = await sortButton("end");
            expect(symbol(button).right).toBeLessThanOrEqual(label(button).left + 4);
            expect(symbol(button).left).toBeLessThan(label(button).left);
        });
    });

    describe("Scenario: align start", () => {
        it("starts the label at the button's start edge, and puts the symbol after it", async () => {
            const button = await sortButton("start");
            expect(Math.abs(label(button).left - buttonBox(button).left)).toBeLessThan(0.5);
            expect(symbol(button).left).toBeGreaterThanOrEqual(label(button).right - 1);
        });
    });

    describe("Scenario: in a table", () => {
        it("lines an end-aligned header up with the values under it", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${columns} .rows=${rows} style="width: 600px"></uaui-data-table>`, "uaui-data-table");
            await settle(el);
            const header = shadow(el).querySelectorAll("uui-table-head-cell")[1].querySelector("uaui-table-sort-button")!;
            const values = deepQueryAll<HTMLElement>(shadow(el), ".value").map((v) => v.getBoundingClientRect().right);
            const valueRight = values[0];
            expect(Math.abs(label(header).right - valueRight)).toBeLessThan(1);
        });

        it("passes an a11y audit", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${columns} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
            await settle(el);
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });
});
