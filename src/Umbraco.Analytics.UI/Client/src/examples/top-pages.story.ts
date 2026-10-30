import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, html, nothing } from "@umbraco-cms/backoffice/external/lit";
import { regionSource, sourceDocs } from "../internal/story/source.js";
import raw from "./top-pages.story.ts?raw";
import "../delta-badge/delta-badge.element.js";
import "../table/data-table.element.js";
import "../table-search/table-search.element.js";
import { UAX_TABLE_CELL } from "../table/cells/cell-names.js";
import type { UaxTableColumn } from "../table/types.js";

const imports = `import { css, html, nothing } from "@umbraco-cms/backoffice/external/lit";
import { UAX_TABLE_CELL, type UaxTableColumn } from "@umbraco-analytics/ui";`;

// #region example
const host = "https://www.example.com";

// The first column is a link. The other two are share columns: the value, its percent of the
// column total and a bar. A product gives each share column its width.
const columns: UaxTableColumn[] = [
    { key: "url", label: "Page URL", elementName: UAX_TABLE_CELL.link, meta: { hrefKey: "url" }, searchable: true },
    { key: "pageviews", label: "Pageviews", elementName: UAX_TABLE_CELL.share, width: "27%" },
    { key: "sessions", label: "Page sessions", elementName: UAX_TABLE_CELL.share, width: "27%" },
];

const rows = [
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

// Last period's rows, matched to `rows` by `row-key`. `/blog/` is new this period (no match) and
// `/faq/` was zero (nothing to divide by), so neither shows a change badge.
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

// The toolbar slot is yours: search on the left, a total over each share column. The table is in client
// mode, so the search box filters it with no code: the table reads the `search` event. Only the URL
// column is `searchable`, so the numbers are not searched.
const total = (label: string, value: string, change?: number) => html`<div class="total">
    <span class="total-label">${label}</span>
    <span class="total-value">${value}</span>
    ${change === undefined ? nothing : html`<uax-delta-badge size="sm" .value=${change} unit="percent"></uax-delta-badge>`}
</div>`;

const toolbarStyles = css`
    .toolbar {
        display: grid;
        grid-template-columns: 46fr 27fr 27fr; /* the same split as the columns */
        align-items: center;
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
    }
`;

// In a Lit element, put `toolbarStyles` in `static styles`. Here it is a style block.
const renderTopPages = () => html`
    <style>
        ${toolbarStyles}
    </style>
    <uui-box headline="Top pages" style="--uui-box-default-padding: 0">
        <uax-data-table .columns=${columns} .rows=${rows} .compareRows=${compareRows} row-key="url">
            <div slot="toolbar" class="toolbar">
                <uax-table-search></uax-table-search>
                ${total("Total pageviews", "272", 8.4)} ${total("Total sessions", "52", -3.2)}
            </div>
        </uax-data-table>
    </uui-box>
`;
// #endregion

const meta: Meta = {
    title: "Examples/Top pages",
    parameters: { layout: "padded" },
};

export default meta;

/**
 * A complete table: a link column, two share columns, compare badges and a toolbar with search and totals.
 * Shares are a share of each column's total, bars are scaled to the column's largest value, and a small change
 * badge follows a value when `compare-rows` has a matching row (matched by `row-key`). Type in the search box to
 * filter the pages: the table is in `client` mode and only the URL column is `searchable`. The product owns the
 * rest of the toolbar. All data is made up.
 */
export const TopPages: StoryObj = {
    name: "Top pages",
    render: () => renderTopPages(),
    parameters: { docs: sourceDocs(regionSource(raw, "example", imports)) },
};
