import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, customElement, html, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { regionSource, sourceDocs } from "../internal/story/source.js";
import raw from "./custom-cell.story.ts?raw";
import "../table/data-table.element.js";
import "../table/table-compare-badge.element.js";
import { UAUI_TABLE_CELL } from "../table/cells/cell-names.js";
import { UAUI_TABLE_CONTEXT } from "../table/table-context.js";
import { UauiPaletteStyles } from "../theme/index.js";
import type { UauiTableCellElement, UauiTableColumn, UauiTableStats } from "../table/types.js";

const imports = `import { css, customElement, html, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import {
    UAUI_TABLE_CELL,
    UAUI_TABLE_CONTEXT,
    UauiPaletteStyles,
    type UauiTableCellElement,
    type UauiTableColumn,
    type UauiTableStats,
    // Importing the package also registers <uaui-table-compare-badge>.
} from "@umbraco/analytics-ui";`;

// #region cell
/**
 * A cell that needs a number it can't work out from its own row: the column's largest value. It reads that from
 * the table's context, `UAUI_TABLE_CONTEXT`, which the table provides to every cell inside it. The bar takes its colour
 * from the package's palette (`UauiPaletteStyles`), so it matches the share bars in every theme and follows a product's
 * `--uaui-series-1`. The change against the compare period is the package's `uaui-table-compare-badge`: the cell passes it the
 * three properties it was given, and the badge finds the compare row in the table's context and reads the column's
 * `meta.lowerIsBetter`. It shows nothing when the row has no compare row.
 */
@customElement("example-orders-bar-cell")
class ExampleOrdersBarCellElement extends UmbLitElement implements UauiTableCellElement {
    @property({ attribute: false }) column: UauiTableColumn = { key: "value", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;

    @state() private _stats?: UauiTableStats;

    constructor() {
        super();
        this.consumeContext(UAUI_TABLE_CONTEXT, (context) => {
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
            <uaui-table-compare-badge .column=${this.column} .item=${this.item} .value=${this.value}></uaui-table-compare-badge>
            <div class="bar"><div class="fill" style="width: ${width}%"></div></div>
        </div>`;
    }

    static override styles = [
        UauiPaletteStyles,
        css`
            .bar-cell {
                display: grid;
                grid-template-columns: 4em 5.5em 1fr; /* a fixed slot for the badge keeps the bars aligned */
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
                background-color: var(--uaui-color-tint-neutral);
                overflow: hidden;
            }
            .fill {
                height: 100%;
                background-color: var(--uaui-color-series-1);
            }
        `,
    ];
}
// #endregion

// #region table
const columns: UauiTableColumn[] = [
    { key: "name", label: "Product" },
    { key: "orders", label: "Orders", elementName: "example-orders-bar-cell", width: "40%", sortable: true, sortAs: "number" },
    { key: "revenue", label: "Revenue", elementName: UAUI_TABLE_CELL.number, align: "end", valueFormat: { style: "currency", currency: "EUR", maximumFractionDigits: 0 } },
];

const rows = [
    { name: "Umbraco hoodie", orders: 1240, revenue: 48200 },
    { name: "Dev mug", orders: 860, revenue: 12900 },
    { name: "Sticker pack", orders: 2310, revenue: 6930 },
    { name: "Tote bag", orders: 410, revenue: 5330 },
];

// Last period's rows, matched to `rows` by `row-key`.
const compareRows = [
    { name: "Umbraco hoodie", orders: 1100 },
    { name: "Dev mug", orders: 920 },
    { name: "Sticker pack", orders: 2310 },
];

const renderProducts = () => html`
    <uui-box headline="Products" style="--uui-box-default-padding: 0">
        <uaui-data-table label="Products" .columns=${columns} .rows=${rows} .compareRows=${compareRows} row-key="name"></uaui-data-table>
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
 * total and largest value (`stats`), the columns, and a lookup for the compare-period row, which `uaui-table-compare-badge` uses. Sort the Orders column:
 * the bars keep one scale. All data is made up.
 */
export const CustomCellWithTableContext: StoryObj = {
    name: "Custom cell with table context",
    render: () => renderProducts(),
    parameters: { docs: sourceDocs(`${regionSource(raw, "cell", imports)}\n${regionSource(raw, "table")}`) },
};
