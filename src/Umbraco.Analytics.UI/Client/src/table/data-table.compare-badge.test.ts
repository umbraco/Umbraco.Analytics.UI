// T25: compare badges come from one piece, `uax-table-compare-badge`, which cells compose; column `meta` says what is better
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { customElement, html, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQueryAll, renderElement, shadow } from "../internal/test/dom.js";
import "./data-table.element.js";
import "./table-compare-badge.element.js";
import { UAX_TABLE_CELL } from "./cells/cell-names.js";
import type { UaxTableCellElement, UaxTableColumn } from "./types.js";

@customElement("example-product-cell")
class ExampleProductCellElement extends UmbLitElement implements UaxTableCellElement {
    @property({ attribute: false }) column: UaxTableColumn = { key: "value", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;

    override render() {
        return html`${String(this.value)}<uax-table-compare-badge .column=${this.column} .item=${this.item} .value=${this.value}></uax-table-compare-badge>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "example-product-cell": ExampleProductCellElement;
    }
}

type Badge = HTMLElement & { value?: number; sentiment: string };

const columns = (duration: Partial<UaxTableColumn> = {}): UaxTableColumn[] => [
    { key: "name", label: "Name" },
    { key: "rate", label: "Rate", elementName: UAX_TABLE_CELL.percent, align: "end" },
    { key: "ms", label: "Duration", elementName: UAX_TABLE_CELL.number, align: "end", ...duration },
    { key: "orders", label: "Orders", elementName: "example-product-cell" },
];
const rows = [
    { name: "A", rate: 0.5, ms: 120, orders: 10 },
    { name: "B", rate: 0.4, ms: 90, orders: 5 },
];
const compareRows = [{ name: "A", rate: 0.4, ms: 100, orders: 8 }];

const table = (cols = columns(), compare: unknown[] = compareRows) =>
    renderElement(
        html`<uax-data-table .columns=${cols} .rows=${rows} .compareRows=${compare} row-key="name"></uax-data-table>`,
        "uax-data-table",
    );

const badges = (el: Element, row: number, column: number) =>
    deepQueryAll(shadow(el).querySelectorAll("uui-table-row")[row].querySelectorAll("uui-table-cell")[column], "uax-delta-badge") as Badge[];

describe("Feature: compare badge in value cells", () => {
    describe("Scenario: a number cell whose row has a compare row", () => {
        it("shows a badge", async () => {
            expect(badges(await table(), 0, 2)).toHaveLength(1);
        });
    });

    describe("Scenario: a percent cell whose row has a compare row", () => {
        it("shows a badge", async () => {
            expect(badges(await table(), 0, 1)).toHaveLength(1);
        });
    });

    describe("Scenario: a row without a compare row", () => {
        it("shows no badge", async () => {
            expect(badges(await table(), 1, 2)).toHaveLength(0);
        });
    });

    describe("Scenario: a table without compare rows", () => {
        it("shows no badge", async () => {
            expect(badges(await table(columns(), []), 0, 2)).toHaveLength(0);
        });
    });

    describe("Scenario: a rise in a column where higher is better", () => {
        it("is positive", async () => {
            expect(badges(await table(), 0, 2)[0].sentiment).toBe("positive");
        });
    });

    describe("Scenario: a rise in a column marked lowerIsBetter", () => {
        it("is negative", async () => {
            expect(badges(await table(columns({ meta: { lowerIsBetter: true } })), 0, 2)[0].sentiment).toBe("negative");
        });
    });

    describe("Scenario: a product cell that uses uax-table-compare-badge", () => {
        it("shows a badge", async () => {
            expect(badges(await table(), 0, 3)).toHaveLength(1);
        });
    });

    describe("Scenario: a11y audit of number and percent badges", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 700px">
                        <uax-data-table
                            .columns=${columns({ meta: { lowerIsBetter: true } })}
                            .rows=${rows}
                            .compareRows=${compareRows}
                            row-key="name"></uax-data-table>
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
