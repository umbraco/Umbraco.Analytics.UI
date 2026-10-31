import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, customElement, html, LitElement, ref } from "@umbraco-cms/backoffice/external/lit";
import { regionSource, sourceDocs } from "../internal/story/source.js";
import raw from "./paged-server.story.ts?raw";
import "../table/data-table.element.js";
import "../search-field/search-field.element.js";
import { UAUI_TABLE_CELL } from "../table/cells/cell-names.js";
import { UauiTableServerController, type UauiTableColumn, type UauiTableServerState } from "../table/index.js";

const imports = `import { css, customElement, html, LitElement, ref } from "@umbraco-cms/backoffice/external/lit";
import { UAUI_TABLE_CELL, UauiTableServerController, type UauiTableColumn, type UauiTableServerState } from "@umbraco/analytics-ui";`;

// #region example
type PageRow = { url: string; pageviews: number; sessions: number };
type SortKey = "pageviews" | "sessions";

// Stand-in for your API: 272 pages, sorted and searched on request after a short delay. A real product calls fetch.
const everyPage: PageRow[] = Array.from({ length: 272 }, (_, i) => ({
    url: `https://www.example.com/page-${i + 1}/`,
    pageviews: Math.max(1, 600 - i * 3),
    sessions: Math.max(1, 200 - i),
}));
const sumOf = (rows: PageRow[], key: SortKey) => rows.reduce((sum, row) => sum + row[key], 0);
const largestOf = (rows: PageRow[], key: SortKey) => Math.max(...rows.map((row) => row[key]));

async function fetchPages({ sort, page, pageSize, query }: UauiTableServerState, signal: AbortSignal) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    // A real `fetch(url, { signal })` stops by itself. Here, give up once the request is stale.
    signal.throwIfAborted();
    const matching = everyPage.filter((row) => row.url.includes(query.trim().toLowerCase()));
    const by = (sort?.key ?? "pageviews") as SortKey;
    const sign = sort?.direction === "asc" ? 1 : -1;
    matching.sort((a, b) => sign * (a[by] - b[by]));
    return {
        rows: matching.slice((page - 1) * pageSize, page * pageSize),
        totalRows: matching.length,
        // Each column's total and max across every page, so shares and bars mean the same on page 1 and page 28.
        stats: {
            pageviews: { total: sumOf(everyPage, "pageviews"), max: largestOf(everyPage, "pageviews") },
            sessions: { total: sumOf(everyPage, "sessions"), max: largestOf(everyPage, "sessions") },
        },
    };
}

const columns: UauiTableColumn[] = [
    { key: "url", label: "Page URL", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" } },
    { key: "pageviews", label: "Pageviews", elementName: UAUI_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
    { key: "sessions", label: "Page sessions", elementName: UAUI_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
];

@customElement("example-paged-server-table")
export class ExamplePagedServerTableElement extends LitElement {
    // Keeps the sort, page, page size and search, goes back to page 1 on a sort or search, aborts the request a newer
    // one replaces, drops its late answer, and gives the table its rows, totals and loading flag.
    #pages = new UauiTableServerController(this, {
        sort: { key: "pageviews", direction: "desc" },
        load: fetchPages,
    });

    override render() {
        return html`<uui-box headline="Top pages" style="--uui-box-default-padding: 0">
            <uaui-data-table ${ref(this.#pages.attach)} label="Top pages" .columns=${columns}>
                <div slot="toolbar"><uaui-search-field></uaui-search-field></div>
            </uaui-data-table>
        </uui-box>`;
    }

    static override styles = css`
        :host {
            display: block;
        }
    `;
}
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-paged-server-table": ExamplePagedServerTableElement;
    }
}

const meta: Meta = {
    title: "Examples/Paged server",
    parameters: { layout: "padded" },
};

export default meta;

/**
 * `mode="server"` with `UauiTableServerController`: attach it with `ref` and it does the wiring. Page forward, click
 * a header (back to page 1), or search: each loads through one function that gets the table's state and an
 * `AbortSignal`. Change the page twice quickly and only the last answer is shown. Call `reload()` when something the
 * loader reads changes, such as a date range. In this story the "server" is a function with a 400 ms delay.
 */
export const PagedServer: StoryObj = {
    name: "Paged server",
    render: () => html`<example-paged-server-table></example-paged-server-table>`,
    parameters: { docs: sourceDocs(regionSource(raw, "example", imports)) },
};
