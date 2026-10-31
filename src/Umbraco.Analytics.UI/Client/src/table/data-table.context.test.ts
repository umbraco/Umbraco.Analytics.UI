// TBL-1 — The table's context: column stats and the compare lookup, for any cell
import { beforeEach, describe, expect, it } from "vitest";
import { customElement, html, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "@umbraco-cms/backoffice/external/uui";
import { render } from "vitest-browser-lit";
import { deepText, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import "./cells/index.js";
import { UAUI_TABLE_CELL } from "./cells/cell-names.js";
import { UAUI_TABLE_CONTEXT } from "./table-context.js";
import type { UauiShareCellElement } from "./cells/share-cell.element.js";
import type { UauiTableCellElement, UauiTableColumn, UauiTableCompareLookup, UauiTableStats } from "./types.js";

/** A product's own cell that reads the table's context: shows the column's total and max, and the compare row's value. */
@customElement("uaui-test-stats-cell")
class TestStatsCellElement extends UmbLitElement implements UauiTableCellElement {
    @property({ attribute: false }) column: UauiTableColumn = { key: "", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;
    @state() private _stats?: UauiTableStats;
    @state() private _compare?: UauiTableCompareLookup;

    constructor() {
        super();
        this.consumeContext(UAUI_TABLE_CONTEXT, (context) => {
            this.observe(context?.stats, (stats) => (this._stats = stats), "_stats");
            this.observe(context?.compare, (compare) => (this._compare = compare), "_compare");
        });
    }

    override render() {
        const stats = this._stats?.[this.column.key];
        const compare = this._compare?.(this.item)?.[this.column.key];
        return html`${this.value} of ${stats?.total} max ${stats?.max} was ${compare ?? "none"}`;
    }
}

const rows = [{ url: "/a", n: 6 }, { url: "/b", n: 2 }];
const columns: UauiTableColumn[] = [{ key: "url", label: "URL" }, { key: "n", label: "N", elementName: "uaui-test-stats-cell" }];
const table = (el: Element) => el as UauiTestElement & { rows: unknown[]; stats?: Record<string, { total: number; max: number }> };
const cellTexts = (el: Element) =>
    [...shadow(el).querySelectorAll("uui-table-row:not([part~='header']):not(.column-toolbar) uui-table-cell:nth-child(2)")].map((c) => deepText(c).trim());

describe("Feature: a table provides its column stats to cells", () => {
    describe("Scenario: a product cell reads the stats", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-data-table .columns=${columns} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
            await settle(el);
        });

        it("gets the sum of the column's values as the total", () => {
            expect(cellTexts(el)[0]).toContain("of 8 ");
        });

        it("gets the largest value as the max", () => {
            expect(cellTexts(el)[0]).toContain("max 6 ");
        });

        it("gets new stats when the rows change", async () => {
            table(el).rows = [{ url: "/a", n: 10 }];
            await settle(el);
            expect(cellTexts(el)[0]).toContain("of 10 max 10 ");
        });
    });

    describe("Scenario: the table has stats", () => {
        it("gives the cell those instead of the rows' sums", async () => {
            const el = await renderElement(
                html`<uaui-data-table .columns=${columns} .rows=${rows} .stats=${{ n: { total: 100, max: 40 } }}></uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
            expect(cellTexts(el)[0]).toContain("of 100 max 40 ");
        });
    });

    describe("Scenario: the table has compare rows and a row key", () => {
        it("lets the cell find the matching compare row", async () => {
            const el = await renderElement(
                html`<uaui-data-table .columns=${columns} .rows=${rows} .compareRows=${[{ url: "/b", n: 9 }]} row-key="url"></uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
            expect(cellTexts(el)).toEqual([expect.stringContaining("was none"), expect.stringContaining("was 9")]);
        });
    });
});

describe("Feature: a share cell outside a table", () => {
    const standalone = async (template: ReturnType<typeof html>) => {
        const cell = render(template).container.querySelector("uaui-share-cell") as UauiShareCellElement;
        await settle(cell);
        return cell;
    };

    describe("Scenario: no table context, no total or max", () => {
        it("shows 0.0% and an empty bar", async () => {
            const cell = await standalone(html`<uaui-share-cell .value=${25}></uaui-share-cell>`);
            expect(cell.shadowRoot!.textContent).toContain("(0.0%)");
        });
    });

    describe("Scenario: inside a table, with explicit properties", () => {
        it("prefers the explicit total over the table's", async () => {
            const el = await renderElement(
                html`<uaui-data-table .columns=${[{ key: "n", label: "N", elementName: UAUI_TABLE_CELL.share }]} .rows=${[{ n: 25 }]}></uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
            const cell = shadow(el).querySelector("uaui-share-cell") as UauiShareCellElement;
            cell.total = 50;
            await settle(cell);
            expect(cell.shadowRoot!.textContent).toContain("(50.0%)");
        });
    });
});

declare global {
    interface HTMLElementTagNameMap {
        "uaui-test-stats-cell": TestStatsCellElement;
    }
}
