import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, customElement, html, nothing, property, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../delta-badge/delta-badge.element.js";
import type { UaxDataTableElement } from "./data-table.element.js";
import "./data-table.element.js";
import type { UaxTableCellElement, UaxTableColumn } from "./types.js";

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

/** Last period: `/blog/` is new this period (no match) and `/faq/` was zero (nothing to divide by). */
const compareRows = [
    { url: `${host}/`, pageviews: 190, sessions: 38 },
    { url: `${host}/contact/`, pageviews: 34, sessions: 4 },
    { url: `${host}/leons-page/`, pageviews: 12, sessions: 7 },
    { url: `${host}/thank-you-pagea/`, pageviews: 5, sessions: 1 },
    { url: `${host}/products/`, pageviews: 6, sessions: 4 },
    { url: `${host}/about-us/`, pageviews: 2, sessions: 2 },
    { url: `${host}/news/`, pageviews: 3, sessions: 3 },
    { url: `${host}/faq/`, pageviews: 0, sessions: 0 },
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

/** Story-only: a product's own cell, like Engage's visitor type. It only needs the `column`, `item` and `value` the table sets. */
@customElement("uax-story-visitor-type-cell")
class StoryVisitorTypeCellElement extends UmbLitElement implements UaxTableCellElement {
    @property({ attribute: false }) column: UaxTableColumn = { key: "type", label: "", type: "text" };
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
            background-color: var(--uax-series-1, var(--uui-color-interactive));
        }
        .dot.returning {
            background-color: var(--uax-series-2, var(--uui-color-danger));
        }
    `;
}

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

/** Compare rows matched by `row-key`: a small change badge follows each share value. A row with no match, or a compare value of zero, has no badge. */
export const ShareColumnsWithCompare: Story = {
    name: "Share columns with compare",
    render: (args) =>
        html`<style>
                ${toolbarStyles}
            </style>
            <uui-box headline="Top pages" style="--uui-box-default-padding: 0">
                <uax-data-table .columns=${args.columns} .rows=${args.rows} .compareRows=${compareRows} row-key="url">
                    <div slot="toolbar" class="toolbar">${searchPlaceholder}${total("Total pageviews", "272", 8.4)}</div>
                </uax-data-table>
            </uui-box>`,
};

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

/** A column with `elementName` shows a product's own element in its cells. Here a coloured dot and label, as in Engage's visitor type. The table sets `column`, `item` and `value` on it, and reuses the element while the name stays the same. */
export const CustomCell: Story = {
    name: "Custom cell",
    args: {
        columns: [{ ...visitorColumns[0], elementName: "uax-story-visitor-type-cell" }, ...visitorColumns.slice(1)],
        rows: visitorRows,
    },
    render: (args) =>
        html`<uui-box headline="Visitors" style="--uui-box-default-padding: 0">
            <uax-data-table .columns=${args.columns} .rows=${args.rows}></uax-data-table>
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

/** Click a header to sort: the first click on a number column sorts biggest first, a second click flips it. In `client` mode (the default) the table sorts the rows itself and raises `sort-change`. Shares stay a share of the whole column. */
export const Sortable: Story = {
    args: {
        columns: pageColumns.map((c) => (c.type === "share" || c.key === "url" ? { ...c, sortable: true } : c)),
    },
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uax-data-table .columns=${args.columns} .rows=${args.rows} .sort=${{ key: "pageviews", direction: "desc" }}></uax-data-table>
        </uui-box>`,
};

/** 34 pages: the long tail that shows why paging matters. */
const manyPageRows = Array.from({ length: 34 }, (_, i) => ({
    url: `${host}/section-${i + 1}/`,
    pageviews: Math.max(1, 210 - i * 6),
    sessions: Math.max(1, 60 - i),
}));

/** `client` mode (the default) pages the rows itself: 10 a page, "Show rows" offers 10, 25, 50 and 100, and the footer is hidden when the rows fit one page. Sorting goes back to page 1 and sorts every page. Shares and bars stay of all 34 rows. */
export const PagedClient: Story = {
    name: "Paged (client)",
    args: {
        columns: pageColumns.map((c) => (c.type === "share" ? { ...c, sortable: true } : c)),
        rows: manyPageRows,
    },
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uax-data-table .columns=${args.columns} .rows=${args.rows}></uax-data-table>
        </uui-box>`,
};

/** The whole data set a server would hold, for the demo below. */
const serverRows = Array.from({ length: 272 }, (_, i) => ({
    url: `${host}/page-${i + 1}/`,
    pageviews: Math.max(1, 600 - i * 3),
    sessions: Math.max(1, 200 - i),
}));
/** The story's "server" keeps the sort it was last asked for. */
let currentServerRows = serverRows;
const sum = (key: "pageviews" | "sessions") => serverRows.reduce((total, row) => total + row[key], 0);
const largest = (key: "pageviews" | "sessions") => Math.max(...serverRows.map((row) => row[key]));

/**
 * `mode="server"`: the table shows the `rows` it's given as the current page, reads the count from `total`, and
 * raises `page-change` with `{ page, pageSize }` for the product to load. `totals` is each share column's total
 * across every page, so "(x%)" is a share of the whole; `maxes` is the largest value across every page, so bars keep
 * one scale from page to page. Without them both are worked out from the page alone. Here the "server" is this story.
 */
export const PagedServer: Story = {
    name: "Paged (server)",
    render: () => {
        const load = (event: CustomEvent<{ page: number; pageSize: number }>) => {
            const table = event.target as UaxDataTableElement;
            const { page, pageSize } = event.detail;
            table.rows = currentServerRows.slice((page - 1) * pageSize, page * pageSize);
        };
        // A sort click goes back to page 1: the product loads it with the new sort and resets its own page binding.
        const sortBy = (event: CustomEvent<{ key: "pageviews" | "sessions"; direction: "asc" | "desc" }>) => {
            const table = event.target as UaxDataTableElement;
            const { key, direction } = event.detail;
            const sorted = [...serverRows].sort((a, b) => (direction === "asc" ? a[key] - b[key] : b[key] - a[key]));
            table.rows = sorted.slice(0, table.pageSize);
            currentServerRows = sorted;
        };
        return html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uax-data-table
                mode="server"
                @sort-change=${sortBy}
                .columns=${pageColumns.map((c) => (c.type === "share" ? { ...c, sortable: true } : c))}
                .rows=${serverRows.slice(0, 10)}
                .total=${serverRows.length}
                .totals=${{ pageviews: sum("pageviews"), sessions: sum("sessions") }}
                .maxes=${{ pageviews: largest("pageviews"), sessions: largest("sessions") }}
                @page-change=${load}></uax-data-table>
        </uui-box>`;
    },
};

/** First load, nothing to show yet: skeleton rows under the header. */
export const Loading: Story = { args: { rows: [], loading: true } };

/** Reloading with rows already shown: the old rows stay under a thin loading bar at the top edge. */
export const Reloading: Story = { args: { loading: true } };

/** No rows: the empty state under the header, with the product's own text when it sets one. */
export const Empty: Story = {
    args: { rows: [], emptyHeadline: "No pages yet", emptyDescription: "Pages appear here once visitors arrive." },
};

declare global {
    interface HTMLElementTagNameMap {
        "uax-story-visitor-type-cell": StoryVisitorTypeCellElement;
    }
}
