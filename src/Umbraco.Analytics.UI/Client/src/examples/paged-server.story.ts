import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { regionSource, sourceDocs } from "../internal/story/source.js";
import raw from "./paged-server.story.ts?raw";
import "../table/data-table.element.js";
import type { UaxDataTableElement } from "../table/data-table.element.js";
import { UAX_TABLE_CELL } from "../table/cells/cell-names.js";
import type { UaxTableColumn, UaxTablePageChangeDetail, UaxTableSortChangeDetail } from "../table/types.js";

const imports = `import { html } from "@umbraco-cms/backoffice/external/lit";
import { UAX_TABLE_CELL, type UaxDataTableElement, type UaxTableColumn, type UaxTablePageChangeDetail, type UaxTableSortChangeDetail } from "@umbraco-analytics/ui";`;

// #region example
type PageRow = { url: string; pageviews: number; sessions: number };
type SortKey = "pageviews" | "sessions";

// Stand-in for your API: 272 pages, sorted on request. A real product fetches this over HTTP.
const everyPage: PageRow[] = Array.from({ length: 272 }, (_, i) => ({
    url: `https://www.example.com/page-${i + 1}/`,
    pageviews: Math.max(1, 600 - i * 3),
    sessions: Math.max(1, 200 - i),
}));
const sumOf = (key: SortKey) => everyPage.reduce((sum, row) => sum + row[key], 0);
const largestOf = (key: SortKey) => Math.max(...everyPage.map((row) => row[key]));

const columns: UaxTableColumn[] = [
    { key: "url", label: "Page URL", elementName: UAX_TABLE_CELL.link, meta: { hrefKey: "url" } },
    { key: "pageviews", label: "Pageviews", elementName: UAX_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
    { key: "sessions", label: "Page sessions", elementName: UAX_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
];

function renderPagedServer() {
    // The sort the product last asked its API for.
    let sorted = everyPage;

    // The editor picked another page or page size: load that page.
    const loadPage = (event: CustomEvent<UaxTablePageChangeDetail>) => {
        const table = event.target as UaxDataTableElement;
        const { page, pageSize } = event.detail;
        table.rows = sorted.slice((page - 1) * pageSize, page * pageSize);
    };

    // A sort click raises only `sort-change`. The table goes back to page 1 itself, so load page 1 of the new sort.
    const loadSorted = (event: CustomEvent<UaxTableSortChangeDetail>) => {
        const table = event.target as UaxDataTableElement;
        const { key, direction } = event.detail;
        const by = key as SortKey;
        sorted = [...everyPage].sort((a, b) => (direction === "asc" ? a[by] - b[by] : b[by] - a[by]));
        table.rows = sorted.slice(0, table.pageSize);
    };

    // `total-rows` is the row count across every page. `stats` holds each column's total (what a share is a percent
    // of) and max (what a full bar stands for) across every page, so they mean the same on page 1 and page 28.
    return html`
        <uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uax-data-table
                mode="server"
                .columns=${columns}
                .rows=${everyPage.slice(0, 10)}
                .totalRows=${everyPage.length}
                .stats=${{
                    pageviews: { total: sumOf("pageviews"), max: largestOf("pageviews") },
                    sessions: { total: sumOf("sessions"), max: largestOf("sessions") },
                }}
                @page-change=${loadPage}
                @sort-change=${loadSorted}></uax-data-table>
        </uui-box>
    `;
}
// #endregion

const meta: Meta = {
    title: "Examples/Paged server",
    parameters: { layout: "padded" },
};

export default meta;

/**
 * `mode="server"`: the table shows the `rows` it is given as the current page and raises `page-change` and
 * `sort-change` for the product to load. Page forward, then click a header: the sort sends the table back to page 1.
 * `stats` keeps shares and bars on one scale across pages. In this story the "server" is a function.
 * While a real request runs, set `loading` so the footer and rows stay in step.
 */
export const PagedServer: StoryObj = {
    name: "Paged server",
    render: () => renderPagedServer(),
    parameters: { docs: sourceDocs(regionSource(raw, "example", imports)) },
};
