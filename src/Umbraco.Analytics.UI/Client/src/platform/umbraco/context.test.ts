// SAC-4 AC1–AC3 — standalone core package (docs/plans/standalone-core).
import { beforeEach, describe, expect, it } from "vitest";
import { customElement, html, property, state } from "#platform/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { consumeContext, observe } from "#platform/context";
import "#platform/uui";
import { renderElement, settle, shadow, type UauiTestElement } from "../../internal/test/dom.js";
import "../../table/data-table.element.js";
import { UAUI_TABLE_CONTEXT } from "../../table/table-context.js";
import type { UauiTableColumn, UauiTableStats } from "../../table/types.js";

/** A product's own cell, built on the backoffice base class. Records what it gets from the table's context. */
@customElement("uaui-test-context-cell")
class TestContextCellElement extends UmbLitElement {
    @property({ attribute: false }) column: UauiTableColumn = { key: "", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;

    @state() columns?: UauiTableColumn[];
    @state() stats?: UauiTableStats;

    constructor() {
        super();
        consumeContext(this, UAUI_TABLE_CONTEXT, (context) => {
            observe(this, context?.columns, (columns) => (this.columns = columns), "_columns");
            observe(this, context?.stats, (stats) => (this.stats = stats), "_stats");
        });
    }

    override render() {
        return html`${String(this.value ?? "")}`;
    }
}

const rows = [{ name: "New visitor", n: 5 }, { name: "Returning visitor", n: 7 }];
const columns = (): UauiTableColumn[] => [
    { key: "name", label: "Type", elementName: "uaui-test-context-cell" },
    { key: "n", label: "N", align: "end" },
];
const table = (el: Element) => el as UauiTestElement & { columns: UauiTableColumn[] };
const cell = (el: Element) => shadow(el).querySelector("uui-table-row:not([part~='header']):not(.column-toolbar) uui-table-cell")!.firstElementChild as TestContextCellElement;

describe("Feature: Custom cells in the backoffice", () => {
    let el: UauiTestElement;
    let cols: UauiTableColumn[];
    beforeEach(async () => {
        cols = columns();
        el = await renderElement(html`<uaui-data-table .columns=${cols} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
        await settle(el);
        await settle(cell(el));
    });

    describe("Scenario: The cell gets the columns", () => {
        it("it receives the table's columns", () => {
            expect(cell(el).columns).toBe(cols);
        });
    });

    describe("Scenario: The cell gets the stats", () => {
        it("it receives each column's total and largest value", () => {
            expect(cell(el).stats?.n).toEqual({ total: 12, max: 7 });
        });
    });

    describe("Scenario: The cell sees changes", () => {
        it("the cell receives the new columns", async () => {
            const next = [...cols, { key: "extra", label: "Extra" }];
            table(el).columns = next;
            await settle(el);
            await settle(cell(el));
            expect(cell(el).columns).toBe(next);
        });
    });
});
