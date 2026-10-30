import { css, customElement, html, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../../../chart/time-series-chart.element.js";
import "../../../date-range/date-range.element.js";
import "../../../delta-badge/delta-badge.element.js";
import "../../../group-by/group-by.element.js";
import "../../../table/data-table.element.js";
import "../../../table-search/table-search.element.js";
import type { UaxSeries } from "../../../chart/types.js";
import type { UaxCompare, UaxDateRange } from "../../../date-range/types.js";
import type { UaxGroupBy } from "../../../group-by/group-by.element.js";
import { UAX_TABLE_CELL } from "../../../table/cells/cell-names.js";
import type {
    UaxTableColumn,
    UaxTablePageChangeDetail,
    UaxTableSearchDetail,
    UaxTableSort,
    UaxTableSortChangeDetail,
} from "../../../table/types.js";
import {
    fetchChartSeries,
    fetchCompareSeries,
    fetchPages,
    fetchVisitorTypes,
    markers,
    previousPeriod,
    type ChartView,
    type PagesResult,
    type VisitorTypeRow,
} from "./engage-fake-data.js";
import { formatRange } from "../format-range.js";
import { wait } from "../fake-latency.js";

// #region page
// A product localizes labels, headlines and column names with this.localize.term(...). The examples keep English for readability.
const pageColumns: UaxTableColumn[] = [
    { key: "url", label: "Page URL", elementName: UAX_TABLE_CELL.link, hrefKey: "url", sortable: true },
    { key: "pageviews", label: "Pageviews", elementName: UAX_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
    { key: "sessions", label: "Page sessions", elementName: UAX_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
];

const visitorColumns: UaxTableColumn[] = [
    { key: "type", label: "User type", sortable: true },
    { key: "visitors", label: "Visitors", elementName: UAX_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
    { key: "sessions", label: "Sessions", elementName: UAX_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
];

const percentChange = (current: number, previous?: number) =>
    previous ? ((current - previous) / previous) * 100 : undefined;

/**
 * Engage > Analytics > Pageviews (`view="pageviews"`) or Visitors (`view="visitors"`): a page header with the group-by
 * and date range, then one pane where a chart flows into an edge-to-edge table. The page owns the state (range,
 * compare, group by, sort, page, search), asks the API for data when it changes, and hands the answer to the parts.
 */
@customElement("example-engage-analytics-page")
export class ExampleEngageAnalyticsPageElement extends UmbLitElement {
    @property({ type: String })
    view: ChartView = "pageviews";

    /** Milliseconds each request to the fake API takes. Raise it to see the loading states. */
    @property({ type: Number })
    latency = 150;

    @state() private _range: UaxDateRange = { from: "2026-05-25", to: "2026-06-23" };
    @state() private _compare?: UaxCompare = previousPeriod({ from: "2026-05-25", to: "2026-06-23" });
    @state() private _groupBy: UaxGroupBy = "day";
    @state() private _sort: UaxTableSort = { key: "pageviews", direction: "desc" };
    @state() private _page = 1;
    @state() private _pageSize = 10;
    @state() private _query = "";

    @state() private _series: UaxSeries[] = [];
    @state() private _compareSeries: UaxSeries[] = [];
    @state() private _chartLoading = true;
    @state() private _pages?: PagesResult;
    @state() private _visitors?: { rows: VisitorTypeRow[]; compareRows: VisitorTypeRow[]; visitors: { current: number; previous?: number } };
    @state() private _tableLoading = true;

    // A newer request makes an older answer stale, so only the latest one is shown. A real fetch should also abort the
    // previous request (AbortController) and abort on disconnect, so nothing runs for a page that is gone.
    #chartRequest = 0;
    #tableRequest = 0;

    override connectedCallback() {
        super.connectedCallback();
        if (this.view === "visitors") this._sort = { key: "visitors", direction: "desc" };
        this.#loadChart();
        this.#loadTable();
    }

    async #loadChart() {
        const request = ++this.#chartRequest;
        this._chartLoading = true;
        await wait(this.latency);
        if (request !== this.#chartRequest) return;
        this._series = fetchChartSeries(this.view, this._range, this._groupBy);
        this._compareSeries = this._compare ? fetchCompareSeries(this.view, this._compare, this._groupBy) : [];
        this._chartLoading = false;
    }

    async #loadTable() {
        const request = ++this.#tableRequest;
        this._tableLoading = true;
        await wait(this.latency);
        if (request !== this.#tableRequest) return;
        if (this.view === "pageviews") {
            this._pages = fetchPages({
                range: this._range,
                compare: this._compare,
                sort: this._sort,
                page: this._page,
                pageSize: this._pageSize,
                query: this._query,
            });
        } else {
            this._visitors = fetchVisitorTypes(this._range, this._compare);
        }
        this._tableLoading = false;
    }

    // The editor saved the date range dialog: new dates, and a comparison range or none. Back to page 1.
    #onDateRangeChange(event: CustomEvent<{ value: UaxDateRange; compare?: UaxCompare }>) {
        this._range = event.detail.value;
        this._compare = event.detail.compare;
        this._page = 1;
        this.#loadChart();
        this.#loadTable();
    }

    // Group by only changes the chart's buckets: the table keeps its rows.
    #onGroupByChange(event: CustomEvent<{ value: UaxGroupBy }>) {
        this._groupBy = event.detail.value;
        this.#loadChart();
    }

    // The table has already moved to page 1 itself on a sort, so only the product's own state needs to follow.
    #onSortChange(event: CustomEvent<UaxTableSortChangeDetail>) {
        this._sort = event.detail;
        this._page = 1;
        if (this.view === "pageviews") this.#loadTable();
    }

    #onPageChange(event: CustomEvent<UaxTablePageChangeDetail>) {
        this._page = event.detail.page;
        this._pageSize = event.detail.pageSize;
        this.#loadTable();
    }

    #onSearch(event: CustomEvent<UaxTableSearchDetail>) {
        this._query = event.detail.query;
        this._page = 1;
        this.#loadTable();
    }

    #renderTotal(label: string, total: { current: number; previous?: number }) {
        const change = percentChange(total.current, total.previous);
        return html`<div class="total">
            <span>${label}</span>
            <strong>${this.localize.number(total.current)}</strong>
            ${change === undefined ? nothing : html`<uax-delta-badge size="sm" .value=${change}></uax-delta-badge>`}
        </div>`;
    }

    #renderTable() {
        if (this.view === "visitors") {
            const visitors = this._visitors;
            return html`<uax-data-table
                .columns=${visitorColumns}
                .rows=${visitors?.rows ?? []}
                .compareRows=${visitors?.compareRows ?? []}
                .sort=${this._sort}
                row-key="type"
                ?loading=${this._tableLoading}
                @sort-change=${this.#onSortChange}>
                <div slot="toolbar" class="toolbar">
                    ${visitors ? this.#renderTotal("Total visitors", visitors.visitors) : nothing}
                </div>
            </uax-data-table>`;
        }
        const pages = this._pages;
        return html`<uax-data-table
            mode="server"
            .columns=${pageColumns}
            .rows=${pages?.rows ?? []}
            .compareRows=${pages?.compareRows ?? []}
            .totalRows=${pages?.totalRows ?? 0}
            .stats=${pages?.stats}
            .sort=${this._sort}
            .page=${this._page}
            .pageSize=${this._pageSize}
            .query=${this._query}
            row-key="url"
            empty-headline="No pages found"
            empty-description="No page matches your search."
            ?loading=${this._tableLoading}
            @sort-change=${this.#onSortChange}
            @page-change=${this.#onPageChange}
            @search=${this.#onSearch}>
            <div slot="toolbar" class="toolbar">
                <uax-table-search .value=${this._query}></uax-table-search>
                ${pages ? this.#renderTotal("Total pageviews", pages.pageviews) : nothing}
            </div>
        </uax-data-table>`;
    }

    override render() {
        const visitors = this.view === "visitors";
        return html`
            <div class="page">
                <header>
                    <h1>${visitors ? "Visitors" : "Pageviews"}</h1>
                    <div class="actions">
                        <uax-group-by .value=${this._groupBy} @change=${this.#onGroupByChange}></uax-group-by>
                        <uax-date-range
                            .value=${this._range}
                            .compare=${this._compare}
                            max-date="2026-06-29"
                            @change=${this.#onDateRangeChange}></uax-date-range>
                    </div>
                </header>

                <uui-box
                    headline=${visitors ? "New and returning visitors over time" : "Pageviews over time"}
                    headline-variant="h2"
                    style="--uui-box-default-padding: 0">
                    <uax-time-series-chart
                        .kind=${visitors ? "stacked-bar" : "area"}
                        .series=${this._series}
                        .compareSeries=${this._compareSeries}
                        .compareLabel=${this._compare ? formatRange(this.localize, this._compare) : undefined}
                        .markers=${markers}
                        .groupBy=${this._groupBy}
                        ?loading=${this._chartLoading}></uax-time-series-chart>
                    ${this.#renderTable()}
                </uui-box>
            </div>
        `;
    }

    static override styles = css`
        :host {
            display: block;
        }
        .page {
            display: flex;
            flex-direction: column;
            gap: var(--uui-size-layout-1);
        }
        header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--uui-size-space-4);
        }
        h1 {
            margin: 0;
            font-size: var(--uui-type-h3-size);
        }
        .actions {
            display: flex;
            align-items: center;
            gap: var(--uui-size-space-4);
        }
        .toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: var(--uui-size-space-4);
        }
        .total {
            display: flex;
            align-items: center;
            gap: var(--uui-size-space-3);
        }
    `;
}
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-engage-analytics-page": ExampleEngageAnalyticsPageElement;
    }
}
