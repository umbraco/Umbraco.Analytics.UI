import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { UAX_TABLE_CELL } from "./cells/cell-names.js";
import type { UaxDataTableElement } from "./data-table.element.js";
import "./data-table.element.js";
import "../table-search/table-search.element.js";
import type { UaxTableColumn, UaxTableRowClickDetail } from "./types.js";

// Focused stories of the table's options. Complete, worked tables are under "Examples".

const host = "https://www.example.com";

const pageColumns: UaxTableColumn[] = [
    { key: "url", label: "Page URL", elementName: UAX_TABLE_CELL.link, meta: { hrefKey: "url" } },
    { key: "pageviews", label: "Pageviews", elementName: UAX_TABLE_CELL.share, width: "27%" },
    { key: "sessions", label: "Page sessions", elementName: UAX_TABLE_CELL.share, width: "27%" },
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

const mixedColumns: UaxTableColumn[] = [
    { key: "name", label: "Product" },
    { key: "orders", label: "Orders", elementName: UAX_TABLE_CELL.number, align: "end", width: "20%" },
    { key: "revenue", label: "Revenue", elementName: UAX_TABLE_CELL.share, width: "27%", valueFormat: { style: "currency", currency: "EUR", maximumFractionDigits: 0 } },
    { key: "refundRate", label: "Refund rate", elementName: UAX_TABLE_CELL.percent, align: "end", width: "20%" },
];

const mixedRows = [
    { name: "Umbraco hoodie", orders: 1240, revenue: 48200, refundRate: 0.032 },
    { name: "Dev mug", orders: 860, revenue: 12900, refundRate: 0.011 },
    { name: "Sticker pack", orders: 2310, revenue: 6930, refundRate: 0.004 },
];

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
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uax-data-table
                .columns=${args.columns}
                .rows=${args.rows}
                .loading=${args.loading}
                .emptyHeadline=${args.emptyHeadline}
                .emptyDescription=${args.emptyDescription}></uax-data-table>
        </uui-box>`,
};

export default meta;
type Story = StoryObj<UaxDataTableElement>;

/** Each column names its cell in `elementName`, aligns with `align` and sizes with `width`. Here a text, number, share and percent column: numbers are `align: "end"`, and the share column takes a currency `valueFormat` (its percent stays a percent). */
export const Columns: Story = {
    args: { columns: mixedColumns, rows: mixedRows },
    render: (args) =>
        html`<uui-box headline="Products" style="--uui-box-default-padding: 0">
            <uax-data-table .columns=${args.columns} .rows=${args.rows}></uax-data-table>
        </uui-box>`,
};

/** Compare rows matched by `row-key`: a small change badge follows each share value. A row with no match, or a compare value of zero, has no badge. */
export const CompareBadges: Story = {
    name: "Compare badges",
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uax-data-table .columns=${args.columns} .rows=${args.rows} .compareRows=${compareRows} row-key="url"></uax-data-table>
        </uui-box>`,
};

/** Click a header to sort: the first click on a number column sorts biggest first, a second click flips it. In `client` mode (the default) the table sorts the rows itself and raises `sort-change`. Shares stay a share of the whole column. */
export const Sortable: Story = {
    args: {
        columns: pageColumns.map((c) => (c.elementName === UAX_TABLE_CELL.share || c.key === "url" ? { ...c, sortable: true, sortAs: c.elementName === UAX_TABLE_CELL.share ? ("number" as const) : ("text" as const) } : c)),
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

/** `client` mode (the default) pages the rows itself: 10 a page, "Per page" offers 10, 25, 50 and 100, and the footer is hidden when the rows fit one page. Sorting goes back to page 1 and sorts every page. Shares and bars stay of all 34 rows. For `mode="server"`, see Examples › Paged server. */
export const PagedClient: Story = {
    name: "Paged (client)",
    args: {
        columns: pageColumns.map((c) => (c.elementName === UAX_TABLE_CELL.share ? { ...c, sortable: true, sortAs: "number" as const } : c)),
        rows: manyPageRows,
    },
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uax-data-table .columns=${args.columns} .rows=${args.rows}></uax-data-table>
        </uui-box>`,
};

/** A note in the `footer` slot, on the left of the pager. The footer shows whenever the slot has content, even when the rows fit one page. */
export const FooterSlot: Story = {
    name: "Footer slot",
    args: { columns: pageColumns, rows: manyPageRows },
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uax-data-table .columns=${args.columns} .rows=${args.rows}>
                <span slot="footer">Updated 5 minutes ago</span>
            </uax-data-table>
        </uui-box>`,
};

/** A `uax-table-search` in the `toolbar` slot. In `client` mode the table filters its rows on the `searchable` columns (here only the URL), goes back to page 1 and shows the empty state when nothing matches. In `server` mode it never filters: listen for `search` and load the matching rows. */
export const Search: Story = {
    args: {
        columns: pageColumns.map((c) => (c.key === "url" ? { ...c, searchable: true } : c)),
        rows: manyPageRows,
    },
    render: (args) =>
        html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uax-data-table .columns=${args.columns} .rows=${args.rows}>
                <uax-table-search slot="toolbar"></uax-table-search>
            </uax-data-table>
        </uui-box>`,
};

/** Set `clickable-rows` when the product listens for `row-click` (an element can't tell it has a listener). Rows then show a pointer and hover tint, take focus with Tab, and raise `row-click` with `{ row }` on a click, Enter or Space. The link in the first column keeps its own click. This story logs the clicked URL below the table. */
export const ClickableRows: Story = {
    render: (args) => {
        const log = document.createElement("p");
        log.textContent = "Click a row, or Tab to one and press Enter.";
        return html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
                <uax-data-table
                    .columns=${args.columns}
                    .rows=${args.rows}
                    clickable-rows
                    @row-click=${(event: CustomEvent<UaxTableRowClickDetail>) => {
                        log.textContent = `row-click: ${String(event.detail.row.url)}`;
                    }}></uax-data-table>
            </uui-box>
            ${log}`;
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
