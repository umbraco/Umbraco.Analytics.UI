import { css, customElement, html, property, ref, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import "../../../kpi-tile/kpi-tile.element.js";
import "../../../chart/time-series-chart.element.js";
import "../../../date-range/date-range.element.js";
import "../../../table/data-table.element.js";
import "../../../table-search/table-search.element.js";
import { UAUI_TABLE_CELL } from "../../../table/cells/cell-names.js";
import type { UauiSeries } from "../../../chart/types.js";
import { uauiCompareFor, uauiFormatDateRange } from "../../../date-helpers/index.js";
import type { UauiCompare, UauiDateRange } from "../../../date-range/types.js";
import { UauiTableServerController } from "../../../table/table-server.controller.js";
import type { UauiTableColumn, UauiTableServerState } from "../../../table/index.js";
import {
    loadBuyerCompare,
    loadBuyers,
    loadSnapshot,
    type BuyerPage,
    type BuyerRow,
    type Day,
    type Snapshot,
    type Totals,
} from "./commerce-fake-data.js";

// #region page
// A product localizes labels, headlines and column names with this.localize.term(...). The examples keep English for readability.
type MetricId = keyof Totals;

const EUR: Intl.NumberFormatOptions = { style: "currency", currency: "EUR" };
// Tables use whole euros: the column is narrow and a share cell also shows a percent and a change badge.
const EUR_WHOLE: Intl.NumberFormatOptions = { ...EUR, maximumFractionDigits: 0 };
const COUNT: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };
const PERCENT: Intl.NumberFormatOptions = { style: "unit", unit: "percent", maximumFractionDigits: 1 };

// One entry per KPI tile. The tile, the chart's axis and tooltip, and the table columns all use the same
// number format, so a figure reads the same everywhere on the page.
const metrics: { id: MetricId; label: string; icon: string; format: Intl.NumberFormatOptions }[] = [
    { id: "revenue", label: "Revenue", icon: "icon-receipt-dollar", format: EUR },
    { id: "orders", label: "Orders", icon: "icon-inbox", format: COUNT },
    { id: "aov", label: "Average order value", icon: "icon-calculator", format: EUR },
    { id: "carts", label: "Carts", icon: "icon-shopping-basket", format: COUNT },
    { id: "conversion", label: "Cart conversion", icon: "icon-trending-up-down", format: PERCENT },
];

/** One day's value of a metric. */
const dayValue = (day: Day, id: MetricId): number => {
    switch (id) {
        case "revenue":
            return day.revenue;
        case "orders":
            return day.orders;
        case "carts":
            return day.carts;
        case "aov":
            return day.orders ? day.revenue / day.orders : 0;
        case "conversion":
            return day.carts ? (day.orders / day.carts) * 100 : 0;
    }
};

/** A page of buyers and last period's buyers, which the controller hands to the table. */
type BuyerResult = BuyerPage & { compareRows: BuyerRow[] };

const productColumns: UauiTableColumn[] = [
    { key: "name", label: "Product", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" }, searchable: true, sortable: true, sortAs: "text" },
    { key: "sku", label: "SKU", searchable: true },
    { key: "units", label: "Units sold", elementName: UAUI_TABLE_CELL.share, width: "28%", valueFormat: COUNT, sortable: true, sortAs: "number" },
    { key: "revenue", label: "Revenue", elementName: UAUI_TABLE_CELL.share, width: "32%", valueFormat: EUR_WHOLE, meta: { color: 2 }, sortable: true, sortAs: "number" },
];

// The buyers table is `server` mode: the product sorts, pages and searches, so no `sortAs` here.
const buyerColumns: UauiTableColumn[] = [
    { key: "name", label: "Buyer", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "orders", label: "Orders", elementName: UAUI_TABLE_CELL.number, align: "end", sortable: true },
    { key: "spent", label: "Total spent", elementName: UAUI_TABLE_CELL.share, width: "30%", valueFormat: EUR_WHOLE, sortable: true },
];

const discountColumns: UauiTableColumn[] = [
    { key: "name", label: "Discount", sortable: true, sortAs: "text" },
    { key: "code", label: "Code" },
    { key: "uses", label: "Times used", elementName: UAUI_TABLE_CELL.share, width: "30%", valueFormat: COUNT, sortable: true, sortAs: "number" },
    { key: "given", label: "Value given", elementName: UAUI_TABLE_CELL.number, valueFormat: EUR_WHOLE, align: "end", sortable: true, sortAs: "number" },
];

/**
 * Commerce > Analytics: an actions row with the date range, a row of KPI tiles that pick the metric of one chart,
 * then top products, popular discounts and top buyers tables. The page owns the state, asks the API for data when
 * it changes, and hands the answer to the parts.
 */
@customElement("example-commerce-analytics-page")
export class ExampleCommerceAnalyticsPageElement extends UmbLitElement {
    /** Milliseconds each request to the fake API takes. Raise it to see the loading states. */
    @property({ type: Number })
    latency = 150;

    /** Makes every request to the fake API fail, to show the error states and Retry. */
    @property({ type: Boolean })
    failing = false;

    @state() private _range: UauiDateRange = { from: "2026-05-25", to: "2026-06-23" };
    @state() private _compare?: UauiCompare = uauiCompareFor("previous-period", { from: "2026-05-25", to: "2026-06-23" });
    @state() private _metric: MetricId = "revenue";

    @state() private _data?: Snapshot;
    @state() private _compareData?: Snapshot;
    @state() private _loading = true;
    @state() private _error = false;

    // A newer request makes an older answer stale, so only the latest one is shown. A real fetch should also abort the
    // previous request (AbortController) and abort on disconnect, so nothing runs for a page that is gone.
    #summaryRequest = 0;

    // Top buyers load a page at a time: the controller keeps their sort, page, page size and search, drops stale
    // answers and gives the table its rows, loading and totals. It loads on connect and on the table's own events.
    #buyers = new UauiTableServerController<BuyerResult>(this, {
        sort: { key: "spent", direction: "desc" },
        pageSize: 5,
        load: (state, signal) => this.#loadBuyers(state, signal),
    });

    override connectedCallback() {
        super.connectedCallback();
        this.#loadSummary();
    }

    async #loadSummary() {
        const request = ++this.#summaryRequest;
        this._loading = true;
        this._error = false;
        const [data, compareData] = await Promise.all([
            loadSnapshot(this._range, this.latency),
            this._compare ? loadSnapshot(this._compare, this.latency) : undefined,
        ]);
        if (request !== this.#summaryRequest) return;
        if (this.failing) {
            this._error = true;
            this._loading = false;
            return;
        }
        this._data = data;
        this._compareData = compareData;
        this._loading = false;
    }

    async #loadBuyers(state: Readonly<UauiTableServerState>, signal: AbortSignal): Promise<BuyerResult> {
        if (this.failing) throw new Error("The buyers request failed.");
        const [buyers, compareRows] = await Promise.all([
            loadBuyers(this._range, { sort: state.sort, page: state.page, pageSize: state.pageSize, query: state.query }, this.latency),
            this._compare ? loadBuyerCompare(this._compare, this.latency) : [],
        ]);
        signal.throwIfAborted();
        return { ...buyers, compareRows };
    }

    // The date range updates everything. A new range starts the buyers back on page 1.
    #onRangeChange(e: CustomEvent<{ value: UauiDateRange; compare?: UauiCompare }>) {
        this._range = e.detail.value;
        this._compare = e.detail.compare;
        this.#loadSummary();
        void this.#buyers.reload({ resetPage: true });
    }

    // A tile was pressed: the chart plots that metric. Nothing is fetched, the snapshot already holds every metric.
    #selectMetric(metric: MetricId) {
        this._metric = metric;
    }

    // Last period's number for a tile, which the tile compares with this period's to draw the change: a percent change,
    // or points for a rate. Undefined (no badge) when there is nothing to compare with. A rate has no value to compare
    // with when last period had no carts.
    #previous(id: MetricId) {
        const previous = this._compareData?.totals;
        if (!previous) return undefined;
        if (id === "conversion" && !previous.carts) return undefined;
        return previous[id];
    }

    #series(days: Day[] | undefined, id: MetricId): UauiSeries[] {
        const metric = metrics.find((m) => m.id === id)!;
        // No orders in the range: no points, so the chart shows its empty state.
        if (!days?.some((d) => d.orders)) return [];
        return [{ id, label: metric.label, points: days.map((d) => ({ date: d.date, value: dayValue(d, id) })) }];
    }

    #renderTile(metric: (typeof metrics)[number]) {
        const totals = this._data?.totals;
        return html`<uaui-kpi-tile
            label=${metric.label}
            icon=${metric.icon}
            .value=${totals ? this.localize.number(totals[metric.id], metric.format) : undefined}
            ?no-data=${totals !== undefined && !totals.orders}
            .current=${totals?.[metric.id]}
            .previous=${this.#previous(metric.id)}
            delta-unit=${metric.id === "conversion" ? "points" : "percent"}
            ?loading=${this._loading}
            ?error=${this._error}
            selectable
            .deselectable=${false}
            .selected=${this._metric === metric.id}
            @selected=${() => this.#selectMetric(metric.id)}></uaui-kpi-tile>`;
    }

    override render() {
        const metric = metrics.find((m) => m.id === this._metric)!;
        const compare = this._compare;
        return html`
            <div class="actions">
                <h2 class="uui-h3">Analytics</h2>
                <uaui-date-range today="2026-06-23" .value=${this._range} .compare=${compare} @change=${this.#onRangeChange}></uaui-date-range>
            </div>

            <div class="kpis">${metrics.map((m) => this.#renderTile(m))}</div>

            <uui-box headline=${metric.label} headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-time-series-chart
                    kind="line"
                    .series=${this.#series(this._data?.days, this._metric)}
                    .compareSeries=${this.#series(this._compareData?.days, this._metric)}
                    .range=${this._range}
                    .compare=${this._compare}
                    .compareLabel=${compare ? uauiFormatDateRange(this.localize, compare) : undefined}
                    .valueFormat=${metric.format}
                    ?loading=${this._loading}
                    ?error=${this._error}
                    retryable
                    @retry=${() => this.#loadSummary()}></uaui-time-series-chart>
            </uui-box>

            <div class="tables">
                <uui-box headline="Top products" headline-variant="h3" style="--uui-box-default-padding: 0">
                    <uaui-data-table
                        row-key="sku"
                        .columns=${productColumns}
                        .rows=${this._data?.products ?? []}
                        .compareRows=${this._compareData?.products ?? []}
                        ?loading=${this._loading}
                        ?error=${this._error}
                        retryable
                        @retry=${() => this.#loadSummary()}>
                        <div slot="toolbar"><uaui-table-search></uaui-table-search></div>
                    </uaui-data-table>
                </uui-box>

                <uui-box headline="Popular discounts" headline-variant="h3" style="--uui-box-default-padding: 0">
                    <uaui-data-table
                        row-key="code"
                        .columns=${discountColumns}
                        .rows=${this._data?.discounts ?? []}
                        .compareRows=${this._compareData?.discounts ?? []}
                        ?loading=${this._loading}
                        ?error=${this._error}
                        retryable
                        @retry=${() => this.#loadSummary()}></uaui-data-table>
                </uui-box>
            </div>

            <uui-box headline="Top buyers" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-data-table
                    ${ref(this.#buyers.attach)}
                    row-key="email"
                    .columns=${buyerColumns}>
                    <div slot="toolbar"><uaui-table-search></uaui-table-search></div>
                </uaui-data-table>
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
            h2 {
                margin: 0;
            }
            .actions {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: var(--uui-size-4);
            }
            .kpis {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: var(--uui-size-space-5);
            }
            .tables {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
                gap: var(--uui-size-4);
                align-items: start;
            }
        `,
    ];
}
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-commerce-analytics-page": ExampleCommerceAnalyticsPageElement;
    }
}
