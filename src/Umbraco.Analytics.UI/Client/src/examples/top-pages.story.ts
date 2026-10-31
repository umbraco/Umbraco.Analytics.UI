import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { regionSource, sourceDocs } from "../internal/story/source.js";
import raw from "./top-pages.story.ts?raw";
import "../table/data-table.element.js";
import "../stat/stat.element.js";
import "../search-field/search-field.element.js";
import { UAUI_TABLE_CELL } from "../table/cells/cell-names.js";
import type { UauiTableColumn } from "../table/types.js";

const imports = `import { html } from "@umbraco-cms/backoffice/external/lit";
import { UAUI_TABLE_CELL, type UauiTableColumn } from "@umbraco/analytics-ui";`;

// #region example
const host = "https://www.example.com";

// The first column is a link. The other two are share columns: the value, its percent of the
// column total and a bar. A product gives each share column its width.
const columns: UauiTableColumn[] = [
    { key: "url", label: "Page URL", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" }, searchable: true },
    { key: "pageviews", label: "Pageviews", elementName: UAUI_TABLE_CELL.share, width: "27%" },
    { key: "sessions", label: "Page sessions", elementName: UAUI_TABLE_CELL.share, width: "27%" },
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

// The column toolbar sits above the column headings, and each of its cells is in a column, so it lines up with it:
// search in the first column, a total over each share column. The table is in client mode, so the search box
// filters it with no code: the table reads the `search` event. Only the URL column is `searchable`, so the numbers
// are not searched. `uaui-stat` works out its change from `current` and `previous`: the product gives it
// both totals and the value to show, already formatted.
const renderTopPages = () => html`
    <uui-box headline="Top pages" style="--uui-box-default-padding: 0">
        <uaui-data-table label="Top pages" .columns=${columns} .rows=${rows} .compareRows=${compareRows} row-key="url">
            <uaui-search-field slot="toolbar-start"></uaui-search-field>
            <uaui-stat slot="toolbar-pageviews" label="Total pageviews" value="272" .current=${272} .previous=${251}></uaui-stat>
            <uaui-stat slot="toolbar-sessions" label="Total sessions" value="52" .current=${52} .previous=${54}></uaui-stat>
        </uaui-data-table>
    </uui-box>
`;
// #endregion

const meta: Meta = {
    title: "Examples/Top pages",
    parameters: { layout: "padded" },
};

export default meta;

/**
 * A complete table: a link column, two share columns, compare badges and a column toolbar above the headings with search and totals.
 * Shares are a share of each column's total, bars are scaled to the column's largest value, and a small change
 * badge follows a value when `compare-rows` has a matching row (matched by `row-key`). Type in the search box to
 * filter the pages: the table is in `client` mode and only the URL column is `searchable`. The totals sit in the table's column toolbar, so each lines up with its column. All data is made up.
 */
export const TopPages: StoryObj = {
    name: "Top pages",
    render: () => renderTopPages(),
    parameters: { docs: sourceDocs(regionSource(raw, "example", imports)) },
};
