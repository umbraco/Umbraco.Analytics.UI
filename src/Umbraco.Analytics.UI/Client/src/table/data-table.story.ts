import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { UAUI_TABLE_CELL } from "./cells/cell-names.js";
import type { UauiDataTableElement } from "./data-table.element.js";
import "./data-table.element.js";
import "../search-field/search-field.element.js";
import "../stat/stat.element.js";
import type { UauiTableColumn, UauiTableRowClickDetail } from "./types.js";

// Focused stories of the table's options. Complete, worked tables are under "Examples".

const host = "https://www.example.com";

const pageColumns: UauiTableColumn[] = [
    { key: "url", label: "Page URL", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" } },
    { key: "pageviews", label: "Pageviews", elementName: UAUI_TABLE_CELL.share, width: "27%" },
    { key: "sessions", label: "Page sessions", elementName: UAUI_TABLE_CELL.share, width: "27%" },
];

const pageRows = [
    { url: `${host}/`, pageviews: 210, sessions: 32 },
    { url: `${host}/contact/`, pageviews: 28, sessions: 4 },
    { url: `${host}/leons-page/`, pageviews: 16, sessions: 5 },
    { url: `${host}/thank-you-pagea/`, pageviews: 5, sessions: 2 },
    { url: `${host}/products/`, pageviews: 4, sessions: 4 },
    { url: `${host}/about-us/`, pageviews: 3, sessions: 2 },
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
    { url: `${host}/faq/`, pageviews: 0, sessions: 0 },
];

const mixedColumns: UauiTableColumn[] = [
    { key: "name", label: "Product" },
    { key: "orders", label: "Orders", elementName: UAUI_TABLE_CELL.number, align: "end", width: "20%" },
    { key: "revenue", label: "Revenue", elementName: UAUI_TABLE_CELL.share, width: "27%", valueFormat: { style: "currency", currency: "EUR", maximumFractionDigits: 0 } },
    { key: "refundRate", label: "Refund rate", elementName: UAUI_TABLE_CELL.percent, align: "end", width: "20%" },
];

const mixedRows = [
    { name: "Umbraco hoodie", orders: 1240, revenue: 48200, refundRate: 0.032 },
    { name: "Dev mug", orders: 860, revenue: 12900, refundRate: 0.011 },
    { name: "Sticker pack", orders: 2310, revenue: 6930, refundRate: 0.004 },
];

/**
 * Give each table a `label`, usually the heading of the box it sits in. It isn't shown: it names the table for
 * screen readers, and names its pager "{label}, pagination", so two paged tables on one page don't repeat a landmark.
 */
const meta: Meta<UauiDataTableElement> = {
    title: "Components/Data Table",
    component: "uaui-data-table",
    args: {
        label: "Top pages",
        columns: pageColumns,
        rows: pageRows,
        loading: false,
        error: false,
        errorHeadline: undefined,
        errorDescription: undefined,
        retryable: false,
        emptyHeadline: undefined,
        emptyDescription: undefined,
    },
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uaui-data-table
                .label=${args.label}
                .columns=${args.columns}
                .rows=${args.rows}
                .loading=${args.loading}
                .error=${args.error}
                .errorHeadline=${args.errorHeadline}
                .errorDescription=${args.errorDescription}
                .retryable=${args.retryable}
                .emptyHeadline=${args.emptyHeadline}
                .emptyDescription=${args.emptyDescription}></uaui-data-table>
        </uui-box>`,
};

export default meta;
type Story = StoryObj<UauiDataTableElement>;

/** Each column names its cell in `elementName`, aligns with `align` and sizes with `width`. Here a text, number, share and percent column: numbers are `align: "end"`, and the share column takes a currency `valueFormat` (its percent stays a percent). */
export const Columns: Story = {
    args: { columns: mixedColumns, rows: mixedRows },
    render: (args) =>
        html`<uui-box headline="Products" style="--uui-box-default-padding: 0">
            <uaui-data-table label="Products" .columns=${args.columns} .rows=${args.rows}></uaui-data-table>
        </uui-box>`,
};

/** When the columns don't fit, only they scroll sideways: the toolbar, footer and loading bar stay full width and no column is pinned. The scroll area is then a named region reachable with Tab, so a keyboard can scroll it with the arrow keys. A table that fits has none of that. Here a 420px wrapper. */
export const Narrow: Story = {
    args: { columns: mixedColumns, rows: mixedRows },
    render: (args) =>
        html`<div style="width: 420px">
            <uui-box headline="Products" style="--uui-box-default-padding: 0">
                <uaui-data-table label="Products" .columns=${args.columns} .rows=${args.rows}></uaui-data-table>
            </uui-box>
        </div>`,
};

/** Compare rows matched by `row-key`: a small change badge follows each share value. A row with no match, or a compare value of zero, has no badge. */
export const CompareBadges: Story = {
    name: "Compare badges",
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uaui-data-table label="Top pages" .columns=${args.columns} .rows=${args.rows} .compareRows=${compareRows} row-key="url"></uaui-data-table>
        </uui-box>`,
};

/** Click a header to sort: the first click on a number column sorts biggest first, a second click flips it. In `client` mode (the default) the table sorts the rows itself and raises `sort-change`. Shares stay a share of the whole column. */
export const Sortable: Story = {
    args: {
        columns: pageColumns.map((c) => (c.elementName === UAUI_TABLE_CELL.share || c.key === "url" ? { ...c, sortable: true, sortAs: c.elementName === UAUI_TABLE_CELL.share ? ("number" as const) : ("text" as const) } : c)),
    },
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uaui-data-table label="Top pages" .columns=${args.columns} .rows=${args.rows} .sort=${{ key: "pageviews", direction: "desc" }}></uaui-data-table>
        </uui-box>`,
};

/** 34 pages: the long tail that shows why paging matters. */
const manyPageRows = Array.from({ length: 34 }, (_, i) => ({
    url: `${host}/section-${i + 1}/`,
    pageviews: Math.max(1, 210 - i * 6),
    sessions: Math.max(1, 60 - i),
}));

/** `client` mode (the default) pages the rows itself: 10 a page, "Per page" offers 10, 25, 50 and 100, and the footer is hidden when the rows fit one page. Sorting goes back to page 1 and sorts every page. Shares and bars stay of all 34 rows. For `mode="server"`, see Examples › Paged server. */
export const PagedClient: Story = {
    name: "Paged (client)",
    args: {
        columns: pageColumns.map((c) => (c.elementName === UAUI_TABLE_CELL.share ? { ...c, sortable: true, sortAs: "number" as const } : c)),
        rows: manyPageRows,
    },
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uaui-data-table label="Top pages" .columns=${args.columns} .rows=${args.rows}></uaui-data-table>
        </uui-box>`,
};

/** A column toolbar above the column headings, for a search and totals that line up with their columns. Slot content as `toolbar-<column key>`, or `toolbar-start` for the first column whatever its key: here a search box in the first column and a `uaui-stat` over each number column. The search drives the table like one in the `toolbar` slot. The row isn't sorted or paged, and the product works out the numbers. Columns with nothing slotted stay empty; with nothing slotted at all there is no row. */
export const ColumnToolbar: Story = {
    args: { columns: pageColumns, rows: pageRows },
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uaui-data-table label="Top pages" .columns=${args.columns} .rows=${args.rows}>
                <uaui-search-field slot="toolbar-start"></uaui-search-field>
                <uaui-stat slot="toolbar-pageviews" label="Total pageviews" value="272" .current=${272} .previous=${256}></uaui-stat>
                <uaui-stat slot="toolbar-sessions" label="Total sessions" value="53" .current=${53} .previous=${50}></uaui-stat>
            </uaui-data-table>
        </uui-box>`,
};

/** A note in the `footer` slot, on the left of the pager. The footer shows whenever the slot has content, even when the rows fit one page. */
export const FooterSlot: Story = {
    name: "Footer slot",
    args: { columns: pageColumns, rows: manyPageRows },
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uaui-data-table label="Top pages" .columns=${args.columns} .rows=${args.rows}>
                <span slot="footer">Updated 5 minutes ago</span>
            </uaui-data-table>
        </uui-box>`,
};

/** A `uaui-search-field` in the `toolbar` slot. In `client` mode the table filters its rows on the `searchable` columns (here only the URL), goes back to page 1 and shows the empty state when nothing matches. In `server` mode it never filters: listen for `search` and load the matching rows. */
export const Search: Story = {
    args: {
        columns: pageColumns.map((c) => (c.key === "url" ? { ...c, searchable: true } : c)),
        rows: manyPageRows,
    },
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uaui-data-table label="Top pages" .columns=${args.columns} .rows=${args.rows}>
                <uaui-search-field slot="toolbar"></uaui-search-field>
            </uaui-data-table>
        </uui-box>`,
};

/** Set `clickable-rows` when the product listens for `row-click` (an element can't tell it has a listener). Rows then show a pointer and hover tint, take focus with Tab, and raise `row-click` with `{ row }` on a click, Enter or Space. The link in the first column keeps its own click. This story logs the clicked URL below the table. */
export const ClickableRows: Story = {
    render: (args) => {
        const log = document.createElement("p");
        log.textContent = "Click a row, or Tab to one and press Enter.";
        return html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
                <uaui-data-table
                    label="Top pages"
                    .columns=${args.columns}
                    .rows=${args.rows}
                    clickable-rows
                    @row-click=${(event: CustomEvent<UauiTableRowClickDetail>) => {
                        log.textContent = `row-click: ${String(event.detail.row.url)}`;
                    }}></uaui-data-table>
            </uui-box>
            ${log}`;
    },
};

/** First load, nothing to show yet: skeleton rows under the header. */
export const Loading: Story = { args: { rows: [], loading: true } };

/** Reloading with rows already shown: the old rows stay under a thin loading bar at the top edge. */
export const Reloading: Story = { args: { loading: true } };

/** The load failed: the error state under the header in place of the rows and pager, with Retry when `retryable` (it raises `retry`). Error wins over loading and empty. */
export const LoadFailed: Story = { args: { error: true, retryable: true } };

/** No rows: the empty state under the header, with the product's own text when it sets one. */
export const Empty: Story = {
    args: { rows: [], emptyHeadline: "No pages yet", emptyDescription: "Pages appear here once visitors arrive." },
};
