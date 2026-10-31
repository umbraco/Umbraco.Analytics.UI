import { css, customElement, html, nothing, property, ref, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import "../../../chart/time-series-chart.element.js";
import "../../../date-range/date-range.element.js";
import "../../../group-by/group-by.element.js";
import "../../../table/data-table.element.js";
import "../../../search-field/search-field.element.js";
import "../../../stat/stat.element.js";
import type { UauiSeries } from "../../../chart/types.js";
import { uauiCompareFor, uauiFormatDateRange } from "../../../date-helpers/index.js";
import type { UauiCompare, UauiDateRange } from "../../../date-range/types.js";
import type { UauiGroupBy } from "../../../group-by/group-by.element.js";
import { UAUI_TABLE_CELL } from "../../../table/cells/cell-names.js";
import { UauiTableServerController } from "../../../table/table-server.controller.js";
import type { UauiTableColumn, UauiTableServerState, UauiTableSort } from "../../../table/index.js";
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
const pageColumns: UauiTableColumn[] = [
    { key: "url", label: "Page URL", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" }, sortable: true },
    { key: "pageviews", label: "Pageviews", elementName: UAUI_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
    { key: "sessions", label: "Page sessions", elementName: UAUI_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
];

const visitorColumns: UauiTableColumn[] = [
    { key: "type", label: "User type", sortable: true },
    { key: "visitors", label: "Visitors", elementName: UAUI_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
    { key: "sessions", label: "Sessions", elementName: UAUI_TABLE_CELL.share, width: "27%", sortable: true, sortAs: "number" },
];

// The visitors table is `client` mode, so the table sorts its three rows itself.
const visitorSort: UauiTableSort = { key: "visitors", direction: "desc" };

/**
 * Engage > Analytics > Pageviews (`view="pageviews"`) or Visitors (`view="visitors"`): an actions row with the group-by
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

    @state() private _range: UauiDateRange = { from: "2026-05-25", to: "2026-06-23" };
    @state() private _compare?: UauiCompare = uauiCompareFor("previous-period", { from: "2026-05-25", to: "2026-06-23" });
    @state() private _groupBy: UauiGroupBy = "day";

    @state() private _series: UauiSeries[] = [];
    @state() private _compareSeries: UauiSeries[] = [];
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
    #pages?: UauiTableServerController<PagesResult>;

    override connectedCallback() {
        super.connectedCallback();
        this.#loadChart();
        if (this.view === "pageviews") {
            this.#pages ??= new UauiTableServerController<PagesResult>(this, {
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

    async #loadPages(state: Readonly<UauiTableServerState>, signal: AbortSignal): Promise<PagesResult> {
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
    #onDateRangeChange(event: CustomEvent<{ value: UauiDateRange; compare?: UauiCompare }>) {
        this._range = event.detail.value;
        this._compare = event.detail.compare;
        this.#loadChart();
        if (this.#pages) void this.#pages.reload({ resetPage: true });
        else this.#loadVisitors();
    }

    // Group by only changes the chart's buckets: the table keeps its rows.
    #onGroupByChange(event: CustomEvent<{ value: UauiGroupBy }>) {
        this._groupBy = event.detail.value;
        this.#loadChart();
    }

    // The total sits in the column toolbar, above the headings and over the column it totals. The total works out its own
    // change from the two numbers, and shows none when there is no previous period to compare with.
    #renderTotal(valueKey: string, label: string, total: { current: number; previous?: number }) {
        return html`<uaui-stat
            slot=${`toolbar-${valueKey}`}
            .label=${label}
            .value=${this.localize.number(total.current)}
            .current=${total.current}
            .previous=${total.previous}></uaui-stat>`;
    }

    #renderTable() {
        if (this.view === "visitors") {
            const visitors = this._visitors;
            return html`<uaui-data-table
                label="Visitors"
                .columns=${visitorColumns}
                .rows=${visitors?.rows ?? []}
                .compareRows=${visitors?.compareRows ?? []}
                .sort=${visitorSort}
                row-key="type"
                ?loading=${this._tableLoading}>
                ${visitors ? this.#renderTotal("visitors", "Total visitors", visitors.visitors) : nothing}
            </uaui-data-table>`;
        }
        const pages = this.#pages?.result;
        return html`<uaui-data-table
            ${ref(this.#pages?.attach)}
            label="Pages"
            .columns=${pageColumns}
            row-key="url"
            empty-headline="No pages found"
            empty-description="No page matches your search.">
            <uaui-search-field slot="toolbar-start"></uaui-search-field>
            ${pages ? this.#renderTotal("pageviews", "Total pageviews", pages.pageviews) : nothing}
        </uaui-data-table>`;
    }

    override render() {
        const visitors = this.view === "visitors";
        return html`
            <div class="actions">
                <h2 class="uui-h3">${visitors ? "Visitors" : "Pageviews"}</h2>
                <div class="controls">
                    <uaui-group-by .value=${this._groupBy} @change=${this.#onGroupByChange}></uaui-group-by>
                    <uaui-date-range
                        .value=${this._range}
                        .compare=${this._compare}
                        today="2026-06-29"
                        @change=${this.#onDateRangeChange}></uaui-date-range>
                </div>
            </div>

            <uui-box
                headline=${visitors ? "New and returning visitors over time" : "Pageviews over time"}
                headline-variant="h3"
                style="--uui-box-default-padding: 0">
                <uaui-time-series-chart
                    .kind=${visitors ? "stacked-bar" : "area"}
                    .series=${this._series}
                    .compareSeries=${this._compareSeries}
                    .range=${this._range}
                    .compare=${this._compare}
                    .compareLabel=${this._compare ? uauiFormatDateRange(this.localize, this._compare) : undefined}
                    .markers=${markers}
                    .groupBy=${this._groupBy}
                    ?loading=${this._chartLoading}
                    ?error=${this._chartError}
                    retryable
                    @retry=${() => this.#loadChart()}></uaui-time-series-chart>
                ${this.#renderTable()}
            </uui-box>
        `;
    }

    static override styles = [
        UmbTextStyles,
        css`
            :host {
                display: flex;
                flex-direction: column;
                gap: var(--uui-size-4);
                padding: var(--uui-size-layout-1);
            }
            /* UUI's .uui-h3 (written .uui-h3.uui-h3, so a plain h2 rule loses) adds a 24px bottom margin, which pushed the title above the controls' centre. Keep its -2px optical inset. */
            .actions h2.uui-h3 {
                margin-block: 0;
            }
            .controls {
                display: flex;
                align-items: center;
                gap: var(--uui-size-4);
            }
            .actions {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--uui-size-4);
            }
        `,
    ];
}
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-engage-analytics-page": ExampleEngageAnalyticsPageElement;
    }
}
