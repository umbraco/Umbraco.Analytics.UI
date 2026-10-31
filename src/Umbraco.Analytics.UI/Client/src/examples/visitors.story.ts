import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, customElement, html, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { regionSource, sourceDocs } from "../internal/story/source.js";
import raw from "./visitors.story.ts?raw";
import "../table/data-table.element.js";
import { UAUI_TABLE_CELL } from "../table/cells/cell-names.js";
import type { UauiTableCellElement, UauiTableColumn } from "../table/types.js";

const imports = `import { css, customElement, html, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UAUI_TABLE_CELL, type UauiTableCellElement, type UauiTableColumn } from "@umbraco-analytics/ui";`;

// #region cell
/**
 * A cell is any element that has `column`, `item` and `value` properties: the table sets them, as the CMS
 * `umb-table` does for its cells. This one shows a coloured dot and the visitor type.
 */
@customElement("example-visitor-type-cell")
class ExampleVisitorTypeCellElement extends UmbLitElement implements UauiTableCellElement {
    @property({ attribute: false }) column: UauiTableColumn = { key: "type", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;

    override render() {
        const returning = this.value === "Returning visitor";
        return html`<span class="dot ${returning ? "returning" : ""}"></span>${String(this.value ?? "")}`;
    }

    static override styles = css`
        .dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            margin-inline-end: 8px;
            border-radius: 50%;
            background-color: var(--uui-color-interactive);
        }
        .dot.returning {
            background-color: var(--uui-color-warning-standalone);
        }
    `;
}
// #endregion

// #region table
// Name your element in `elementName`. The share columns use the built-in cell.
const columns: UauiTableColumn[] = [
    { key: "type", label: "User type", elementName: "example-visitor-type-cell" },
    { key: "visitors", label: "Visitors", elementName: UAUI_TABLE_CELL.share, width: "27%" },
    { key: "sessions", label: "Sessions", elementName: UAUI_TABLE_CELL.share, width: "27%" },
];

const rows = [
    { type: "New visitor", visitors: 16, sessions: 16 },
    { type: "Returning visitor", visitors: 9, sessions: 19 },
];

const renderVisitors = () => html`
    <uui-box headline="Visitors" style="--uui-box-default-padding: 0">
        <uaui-data-table .columns=${columns} .rows=${rows}></uaui-data-table>
    </uui-box>
`;
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-visitor-type-cell": ExampleVisitorTypeCellElement;
    }
}

const meta: Meta = {
    title: "Examples/Visitors",
    parameters: { layout: "padded" },
};

export default meta;

/**
 * A table with a cell the product wrote: a coloured dot and the visitor type. The table creates one element per
 * cell, sets `column`, `item` and `value` on it, and reuses it while `elementName` stays the same. The docs panel
 * shows the cell's class first, then the table that uses it.
 */
export const Visitors: StoryObj = {
    render: () => renderVisitors(),
    parameters: { docs: sourceDocs(`${regionSource(raw, "cell", imports)}\n${regionSource(raw, "table")}`) },
};
