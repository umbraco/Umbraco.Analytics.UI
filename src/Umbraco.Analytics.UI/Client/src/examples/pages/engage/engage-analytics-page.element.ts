import { css, customElement, html, nothing, property, ref, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../../../chart/time-series-chart.element.js";
import "../../../date-range/date-range.element.js";
import "../../../delta-badge/delta-badge.element.js";
import "../../../group-by/group-by.element.js";
import "../../../table/data-table.element.js";
import "../../../table-search/table-search.element.js";
import type { UaxSeries } from "../../../chart/types.js";
import { uaxCompareFor, uaxFormatDateRange } from "../../../date-helpers/index.js";
import type { UaxCompare, UaxDateRange } from "../../../date-range/types.js";
import type { UaxGroupBy } from "../../../group-by/group-by.element.js";
import { UAX_TABLE_CELL } from "../../../table/cells/cell-names.js";
import { UaxTableServerController } from "../../../table/table-server.controller.js";
import type { UaxTableColumn, UaxTableServerState, UaxTableSort } from "../../../table/index.js";
import {
    fetchChartSeries,
    fetchCompareSeries,
    fetchPages,
    fetchVisitorTypes,
    markers,
    type ChartView,
    type PagesResult,
    type VisitorTypeRow,
} from "./engage-fake-data.js";
import { wait } from "../fake-latency.js";

// #region page
// A product localizes labels, headlines and column names with this.localize.term(...). The examples keep English for readability.
const pageColumns: UaxTableColumn[] = [
    { key: "url", label: "Page URL", elementName: UAX_TABLE_CELL.link, meta: { hrefKey: "url" }, sortable: true },
    { key: "pageviews", label: "Pageviews", elementName: UAX_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
    { key: "sessions", label: "Page sessions", elementName: UAX_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
];

const visitorColumns: UaxTableColumn[] = [
    { key: "type", label: "User type", sortable: true },
    { key: "visitors", label: "Visitors", elementName: UAX_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
    { key: "sessions", label: "Sessions", elementName: UAX_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
];

// The visitors table is `client` mode, so the table sorts its three rows itself.
const visitorSort: UaxTableSort = { key: "visitors", direction: "desc" };

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

    /** Makes every request to the fake API fail, to show the error states and Retry. */
    @property({ type: Boolean })
    failing = false;

    @state() private _range: UaxDateRange = { from: "2026-05-25", to: "2026-06-23" };
    @state() private _compare?: UaxCompare = uaxCompareFor("previous-period", { from: "2026-05-25", to: "2026-06-23" });
    @state() private _groupBy: UaxGroupBy = "day";

    @state() private _series: UaxSeries[] = [];
    @state() private _compareSeries: UaxSeries[] = [];
    @state() private _chartLoading = true;
    @state() private _chartError = false;
    @state() private _visitors?: { rows: VisitorTypeRow[]; compareRows: VisitorTypeRow[]; visitors: { current: number; previous?: number } };
    @state() private _tableLoading = true;

    // A newer request makes an older answer stale, so only the latest one is shown. A real fetch should also abort the
    // previous request (AbortController) and abort on disconnect, so nothing runs for a page that is gone.
    #chartRequest = 0;
    #tableRequest = 0;

    // The pageviews table is paged by the server: the controller keeps its sort, page, page size and search, drops stale
    // answers and gives the table its rows, loading and totals. Made on connect, when the view is known.
    #pages?: UaxTableServerController<PagesResult>;

    override connectedCallback() {
        super.connectedCallback();
        this.#loadChart();
        if (this.view === "pageviews") {
            this.#pages ??= new UaxTableServerController<PagesResult>(this, {
                sort: { key: "pageviews", direction: "desc" },
                load: (state, signal) => this.#loadPages(state, signal),
            });
        } else {
            this.#loadVisitors();
        }
    }

    async #loadChart() {
        const request = ++this.#chartRequest;
        this._chartLoading = true;
        this._chartError = false;
        await wait(this.latency);
        if (request !== this.#chartRequest) return;
        if (this.failing) {
            this._chartError = true;
            this._chartLoading = false;
            return;
        }
        this._series = fetchChartSeries(this.view, this._range, this._groupBy);
        this._compareSeries = this._compare ? fetchCompareSeries(this.view, this._compare, this._groupBy) : [];
        this._chartLoading = false;
    }

    async #loadPages(state: Readonly<UaxTableServerState>, signal: AbortSignal): Promise<PagesResult> {
        await wait(this.latency);
        signal.throwIfAborted();
        if (this.failing) throw new Error("The pages request failed.");
        return fetchPages({
            range: this._range,
            compare: this._compare,
            sort: state.sort ?? { key: "pageviews", direction: "desc" },
            page: state.page,
            pageSize: state.pageSize,
            query: state.query,
        });
    }

    async #loadVisitors() {
        const request = ++this.#tableRequest;
        this._tableLoading = true;
        await wait(this.latency);
        if (request !== this.#tableRequest) return;
        this._visitors = fetchVisitorTypes(this._range, this._compare);
        this._tableLoading = false;
    }

    // The editor saved the date range dialog: new dates, and a comparison range or none. Back to page 1.
    #onDateRangeChange(event: CustomEvent<{ value: UaxDateRange; compare?: UaxCompare }>) {
        this._range = event.detail.value;
        this._compare = event.detail.compare;
        this.#loadChart();
        if (this.#pages) void this.#pages.reload({ resetPage: true });
        else this.#loadVisitors();
    }

    // Group by only changes the chart's buckets: the table keeps its rows.
    #onGroupByChange(event: CustomEvent<{ value: UaxGroupBy }>) {
        this._groupBy = event.detail.value;
        this.#loadChart();
    }

    // The total sits in the summary row, under its own column: the label in the first column's slot, the number and
    // its change in the slot of the column it totals.
    #renderTotal(labelKey: string, valueKey: string, label: string, total: { current: number; previous?: number }) {
        const change = percentChange(total.current, total.previous);
        return html`<span slot=${`summary-${labelKey}`}>${label}</span>
            <span slot=${`summary-${valueKey}`} class="total">
                ${this.localize.number(total.current)}
                ${change === undefined ? nothing : html`<uax-delta-badge size="sm" .value=${change}></uax-delta-badge>`}
            </span>`;
    }

    #renderTable() {
        if (this.view === "visitors") {
            const visitors = this._visitors;
            return html`<uax-data-table
                .columns=${visitorColumns}
                .rows=${visitors?.rows ?? []}
                .compareRows=${visitors?.compareRows ?? []}
                .sort=${visitorSort}
                row-key="type"
                ?loading=${this._tableLoading}>
                ${visitors ? this.#renderTotal("type", "visitors", "Total visitors", visitors.visitors) : nothing}
            </uax-data-table>`;
        }
        const pages = this.#pages?.result;
        return html`<uax-data-table
            ${ref(this.#pages?.attach)}
            .columns=${pageColumns}
            row-key="url"
            empty-headline="No pages found"
            empty-description="No page matches your search.">
            <div slot="toolbar"><uax-table-search></uax-table-search></div>
            ${pages ? this.#renderTotal("url", "pageviews", "Total pageviews", pages.pageviews) : nothing}
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
                            today="2026-06-29"
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
                        .range=${this._range}
                        .compare=${this._compare}
                        .compareLabel=${this._compare ? uaxFormatDateRange(this.localize, this._compare) : undefined}
                        .markers=${markers}
                        .groupBy=${this._groupBy}
                        ?loading=${this._chartLoading}
                        ?error=${this._chartError}
                        retryable
                        @retry=${() => this.#loadChart()}></uax-time-series-chart>
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
