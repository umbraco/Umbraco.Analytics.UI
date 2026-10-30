import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, customElement, html, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { regionSource, sourceDocs } from "../internal/story/source.js";
import raw from "./custom-cell.story.ts?raw";
import "../table/data-table.element.js";
import { UAX_TABLE_CELL } from "../table/cells/cell-names.js";
import { UAX_TABLE_CONTEXT } from "../table/table-context.js";
import type { UaxTableCellElement, UaxTableColumn, UaxTableStats } from "../table/types.js";

const imports = `import { css, customElement, html, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import {
    UAX_TABLE_CELL,
    UAX_TABLE_CONTEXT,
    type UaxTableCellElement,
    type UaxTableColumn,
    type UaxTableStats,
} from "@umbraco-analytics/ui";`;

// #region cell
/**
 * A cell that needs a number it can't work out from its own row: the column's largest value. It reads that from
 * the table's context, `UAX_TABLE_CONTEXT`, which the table provides to every cell inside it.
 */
@customElement("example-orders-bar-cell")
class ExampleOrdersBarCellElement extends UmbLitElement implements UaxTableCellElement {
    @property({ attribute: false }) column: UaxTableColumn = { key: "value", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;

    @state() private _stats?: UaxTableStats;

    constructor() {
        super();
        this.consumeContext(UAX_TABLE_CONTEXT, (context) => {
            // Observables update the cell when the table's rows change (a new page, a sort).
            this.observe(context?.stats, (stats) => (this._stats = stats), "_stats");
        });
    }

    override render() {
        const orders = typeof this.value === "number" ? this.value : undefined;
        if (orders === undefined) return nothing;
        const max = this._stats?.[this.column.key]?.max ?? 0;
        const width = max > 0 ? Math.round((orders / max) * 100) : 0;
        return html`<div class="bar-cell">
            <span class="orders">${orders.toLocaleString(this.localize.lang())}</span>
            <div class="bar"><div class="fill" style="width: ${width}%"></div></div>
        </div>`;
    }

    static override styles = css`
        .bar-cell {
            display: grid;
            grid-template-columns: 4em 1fr;
            align-items: center;
            gap: 8px;
        }
        .orders {
            text-align: end;
            font-variant-numeric: tabular-nums;
        }
        .bar {
            height: 8px;
            border-radius: 4px;
            background-color: var(--uui-color-surface-alt);
            overflow: hidden;
        }
        .fill {
            height: 100%;
            background-color: var(--uui-color-positive-standalone);
        }
    `;
}
// #endregion

// #region table
const columns: UaxTableColumn[] = [
    { key: "name", label: "Product" },
    { key: "orders", label: "Orders", elementName: "example-orders-bar-cell", width: "40%", sortable: true, sortAs: "number" },
    { key: "revenue", label: "Revenue", elementName: UAX_TABLE_CELL.number, align: "end", valueFormat: { style: "currency", currency: "EUR", maximumFractionDigits: 0 } },
];

const rows = [
    { name: "Umbraco hoodie", orders: 1240, revenue: 48200 },
    { name: "Dev mug", orders: 860, revenue: 12900 },
    { name: "Sticker pack", orders: 2310, revenue: 6930 },
    { name: "Tote bag", orders: 410, revenue: 5330 },
];

const renderProducts = () => html`
    <uui-box headline="Products" style="--uui-box-default-padding: 0">
        <uax-data-table .columns=${columns} .rows=${rows}></uax-data-table>
    </uui-box>
`;
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-orders-bar-cell": ExampleOrdersBarCellElement;
    }
}

const meta: Meta = {
    title: "Examples/Custom cell with table context",
    parameters: { layout: "padded" },
};

export default meta;

/**
 * A product's own bar cell. The table's context gives a cell what it can't know from its own row: every column's
 * total and largest value (`stats`), the columns, and a lookup for the compare-period row. Sort the Orders column:
 * the bars keep one scale. All data is made up.
 */
export const CustomCellWithTableContext: StoryObj = {
    name: "Custom cell with table context",
    render: () => renderProducts(),
    parameters: { docs: sourceDocs(`${regionSource(raw, "cell", imports)}\n${regionSource(raw, "table")}`) },
};
