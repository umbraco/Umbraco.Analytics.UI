import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, html, nothing, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import "../delta-badge/delta-badge.element.js";
import type { UaxDataTableElement } from "./data-table.element.js";
import "./data-table.element.js";
import type { UaxTableColumn } from "./types.js";

const host = "https://www.example.com";

const pageColumns: UaxTableColumn[] = [
    { key: "url", label: "Page URL", type: "link", hrefKey: "url" },
    { key: "pageviews", label: "Pageviews", type: "share" },
    { key: "sessions", label: "Page sessions", type: "share" },
];

const pageRows = [
    { url: `${host}/`, pageviews: 210, sessions: 32 },
    { url: `${host}/contact/`, pageviews: 28, sessions: 4 },
    { url: `${host}/leons-page/`, pageviews: 16, sessions: 5 },
    { url: `${host}/thank-you-pagea/`, pageviews: 5, sessions: 2 },
    { url: `${host}/products/`, pageviews: 4, sessions: 4 },
    { url: `${host}/about-us/`, pageviews: 3, sessions: 2 },
    { url: `${host}/news/`, pageviews: 3, sessions: 2 },
    { url: `${host}/blog/`, pageviews: 2, sessions: 1 },
    { url: `${host}/faq/`, pageviews: 1, sessions: 1 },
];

const visitorColumns: UaxTableColumn[] = [
    { key: "type", label: "User type", type: "text" },
    { key: "visitors", label: "Visitors", type: "share" },
    { key: "sessions", label: "Sessions", type: "share" },
];

const visitorRows = [
    { type: "New visitor", visitors: 16, sessions: 16 },
    { type: "Returning visitor", visitors: 9, sessions: 19 },
];

const mixedColumns: UaxTableColumn[] = [
    { key: "name", label: "Product", type: "text" },
    { key: "orders", label: "Orders", type: "number" },
    { key: "revenue", label: "Revenue", type: "share", valueFormat: { style: "currency", currency: "EUR", maximumFractionDigits: 0 } },
    { key: "refundRate", label: "Refund rate", type: "percent" },
];

const mixedRows = [
    { name: "Umbraco hoodie", orders: 1240, revenue: 48200, refundRate: 0.032 },
    { name: "Dev mug", orders: 860, revenue: 12900, refundRate: 0.011 },
    { name: "Sticker pack", orders: 2310, revenue: 6930, refundRate: 0.004 },
];

/** Story-only: the search placeholder and totals a product writes in the toolbar slot. */
const searchPlaceholder = html`<uui-input class="search" label="Search" placeholder="Search…">
    <uui-icon slot="append" name="icon-search"></uui-icon>
</uui-input>`;

const total = (label: string, value: string, delta?: number): TemplateResult => html`<div class="total">
    <span class="total-label">${label}</span>
    <span class="total-value">${value}</span>
    ${delta === undefined ? nothing : html`<uax-delta-badge size="sm" .value=${delta} unit="percent"></uax-delta-badge>`}
</div>`;

const toolbarStyles = css`
    /* The design's 46 / 27 / 27 split puts each total over its share column. */
    .toolbar {
        display: grid;
        grid-template-columns: 46fr 27fr 27fr;
        align-items: center;
    }
    .search {
        width: 200px;
        font-size: 12px;
    }
    .total {
        display: grid;
        grid-template-columns: auto auto;
        justify-content: start;
        align-items: center;
        column-gap: 8px;
        row-gap: 4px;
    }
    .total-label {
        grid-column: 1 / -1;
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: 0.6px;
        text-transform: uppercase;
        color: var(--uui-color-text-alt);
    }
    .total-value {
        font-size: 18px;
        font-weight: 700;
        line-height: 1;
        color: var(--uui-color-text);
        font-variant-numeric: tabular-nums;
    }
`;

const meta: Meta<UaxDataTableElement> = {
    title: "Components/Data Table",
    component: "uax-data-table",
    args: {
        columns: pageColumns,
        rows: pageRows,
        loading: false,
        emptyHeadline: undefined,
        emptyDescription: undefined,
    },
    render: (args) =>
        html`<style>
                ${toolbarStyles}
            </style>
            <uui-box headline="Top pages" style="--uui-box-default-padding: 0">
                <uax-data-table
                    .columns=${args.columns}
                    .rows=${args.rows}
                    .loading=${args.loading}
                    .emptyHeadline=${args.emptyHeadline}
                    .emptyDescription=${args.emptyDescription}>
                    <div slot="toolbar" class="toolbar">${searchPlaceholder}${total("Total pageviews", "272", 8.4)}</div>
                </uax-data-table>
            </uui-box>`,
};

export default meta;
type Story = StoryObj<UaxDataTableElement>;

/** A link column and two share columns: the value, its percent of the column total, and a bar scaled to the column's largest value. The first share column uses `--uax-series-1`, the second `--uax-series-2`. Search and totals are the product's, in the `toolbar` slot. */
export const ShareColumns: Story = { name: "Share columns" };

/** Plain text in the first column, two share columns, and two totals in the toolbar. */
export const Visitors: Story = {
    args: { columns: visitorColumns, rows: visitorRows },
    render: (args) =>
        html`<style>
                ${toolbarStyles}
            </style>
            <uui-box headline="Visitors" style="--uui-box-default-padding: 0">
                <uax-data-table .columns=${args.columns} .rows=${args.rows} .loading=${args.loading}>
                    <div slot="toolbar" class="toolbar">${searchPlaceholder}${total("Total visitors", "25", 4.2)}${total("Total sessions", "35", -2.1)}</div>
                </uax-data-table>
            </uui-box>`,
};

/** Number, share with a currency `value-format` (the percent stays a percent) and percent columns. Number and percent are right-aligned. */
export const NumberAndPercent: Story = {
    name: "Number and percent",
    args: { columns: mixedColumns, rows: mixedRows },
    render: (args) =>
        html`<uui-box headline="Products" style="--uui-box-default-padding: 0">
            <uax-data-table .columns=${args.columns} .rows=${args.rows}></uax-data-table>
        </uui-box>`,
};

/** First load, nothing to show yet: skeleton rows under the header. */
export const Loading: Story = { args: { rows: [], loading: true } };

/** Reloading with rows already shown: the old rows stay under a thin loading bar at the top edge. */
export const Reloading: Story = { args: { loading: true } };

/** No rows: the empty state under the header, with the product's own text when it sets one. */
export const Empty: Story = {
    args: { rows: [], emptyHeadline: "No pages yet", emptyDescription: "Pages appear here once visitors arrive." },
};
