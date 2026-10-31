// T47: a column's `meta.deltaUnit: "points"` makes its compare badges show the change in percentage points, for rate columns
import { describe, expect, it } from "vitest";
import { customElement, html, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "@umbraco-cms/backoffice/external/uui";
import { axeRun } from "../internal/test/a11y.js";
import { deepQueryAll, deepText, renderElement, settle, shadow } from "../internal/test/dom.js";
import "./data-table.element.js";
import "./table-compare-badge.element.js";
import { UAUI_TABLE_CELL } from "./cells/cell-names.js";
import type { UauiDeltaBadgeElement } from "../delta-badge/delta-badge.element.js";
import type { UauiTableCellElement, UauiTableColumn, UauiTableColumnMeta } from "./types.js";

@customElement("example-rate-cell")
class ExampleRateCellElement extends UmbLitElement implements UauiTableCellElement {
    @property({ attribute: false }) column: UauiTableColumn = { key: "value", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;

    override render() {
        return html`${String(this.value)}%<uaui-table-compare-badge .column=${this.column} .item=${this.item} .value=${this.value}></uaui-table-compare-badge>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "example-rate-cell": ExampleRateCellElement;
    }
}

// The same rate four ways: a number in % (5 is 5%), a fraction in a percent cell (0.05 is 5%), a share cell and a custom cell.
const columns = (meta: UauiTableColumnMeta = {}): UauiTableColumn[] => [
    { key: "name", label: "Name" },
    { key: "rate", label: "Rate", elementName: UAUI_TABLE_CELL.number, align: "end", meta },
    { key: "fraction", label: "Fraction", elementName: UAUI_TABLE_CELL.percent, align: "end", meta },
    { key: "share", label: "Share", elementName: UAUI_TABLE_CELL.share, meta },
    { key: "custom", label: "Custom", elementName: "example-rate-cell", meta },
];
const rows = [{ name: "A", rate: 6, fraction: 0.06, share: 6, custom: 6 }];
const compareRows = [{ name: "A", rate: 5, fraction: 0.05, share: 5, custom: 5 }];

const renderTable = async (cols: UauiTableColumn[]) => {
    const el = await renderElement(
        html`<uaui-data-table style="width: 900px" .columns=${cols} .rows=${rows} .compareRows=${compareRows} row-key="name"></uaui-data-table>`,
        "uaui-data-table",
    );
    await settle(el);
    return el;
};
const table = (meta?: UauiTableColumnMeta) => renderTable(columns(meta));

const badge = (el: Element, column: number) =>
    deepQueryAll<UauiDeltaBadgeElement>(shadow(el).querySelectorAll("uui-table-row:not(.column-toolbar)")[0].querySelectorAll("uui-table-cell")[column], "uaui-delta-badge")[0];

const text = (b: UauiDeltaBadgeElement) => deepText(shadow(b)).replace(/\s+/g, " ").trim();

const cells = [
    { name: "number", column: 1 },
    { name: "percent", column: 2 },
    { name: "share", column: 3 },
    { name: "custom cell's compare badge", column: 4 },
];

describe("Feature: compare badges in percentage points", () => {
    describe.each(cells)("Scenario: a $name column with deltaUnit points", ({ column }) => {
        it("shows the difference in points: 5% to 6% is +1 pp", async () => {
            const b = badge(await table({ deltaUnit: "points" }), column);
            expect(b.unit).toBe("points");
            expect(text(b)).toContain("+1 pp");
            expect(b.sentiment).toBe("positive");
        });
    });

    describe.each(cells)("Scenario: a $name column without deltaUnit", ({ column }) => {
        it("keeps the percent change: 5% to 6% is +20%", async () => {
            const b = badge(await table(), column);
            expect(b.unit).toBe("percent");
            expect(text(b)).toContain("+20%");
        });
    });

    describe.each(cells)("Scenario: a $name column with deltaUnit points and lowerIsBetter", ({ column }) => {
        it("shows the rise in points as a decline", async () => {
            const b = badge(await table({ deltaUnit: "points", lowerIsBetter: true }), column);
            expect(text(b)).toContain("+1 pp");
            expect(b.sentiment).toBe("negative");
            expect(text(b)).toContain("decline");
        });
    });

    describe("Scenario: an invalid deltaUnit", () => {
        it("falls back to a percent change", async () => {
            const el = await table({ deltaUnit: "basis-points" as never });
            for (const { column } of cells) {
                const b = badge(el, column);
                expect(b.unit).toBe("percent");
                expect(text(b)).toContain("+20%");
            }
        });
    });

    describe("Scenario: a percent cell whose valueFormat is not a percent style", () => {
        it("reads the value as it is, not as a fraction", async () => {
            const cols: UauiTableColumn[] = [
                { key: "name", label: "Name" },
                { key: "rate", label: "Rate", elementName: UAUI_TABLE_CELL.percent, valueFormat: { style: "decimal" }, meta: { deltaUnit: "points" } },
            ];
            expect(text(badge(await renderTable(cols), 1))).toContain("+1 pp");
        });
    });

    describe("Scenario: a 0 compare value in points", () => {
        it("still shows the change: 0% to 2% is +2 pp", async () => {
            const cols: UauiTableColumn[] = [
                { key: "name", label: "Name" },
                { key: "fraction", label: "Fraction", elementName: UAUI_TABLE_CELL.percent, meta: { deltaUnit: "points" } },
            ];
            const el = await renderElement(
                html`<uaui-data-table .columns=${cols} .rows=${[{ name: "A", fraction: 0.02 }]} .compareRows=${[{ name: "A", fraction: 0 }]} row-key="name"></uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
            expect(text(badge(el, 1))).toContain("+2 pp");
        });
    });

    describe("Scenario: a11y audit of badges in points", () => {
        it("passes", async () => {
            expect(await axeRun(await table({ deltaUnit: "points", lowerIsBetter: true }))).toHaveNoViolations();
        });
    });
});
