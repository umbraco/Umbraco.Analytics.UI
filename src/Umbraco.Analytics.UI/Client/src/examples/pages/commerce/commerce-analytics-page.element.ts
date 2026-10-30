import { css, customElement, html, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../../../kpi-tile/kpi-tile.element.js";
import "../../../chart/time-series-chart.element.js";
import "../../../date-range/date-range.element.js";
import "../../../table/data-table.element.js";
import "../../../table-search/table-search.element.js";
import { UAX_TABLE_CELL } from "../../../table/cells/cell-names.js";
import type { UaxSeries } from "../../../chart/types.js";
import type { UaxCompare, UaxDateRange } from "../../../date-range/types.js";
import type {
    UaxTableColumn,
    UaxTablePageChangeDetail,
    UaxTableSearchDetail,
    UaxTableSort,
    UaxTableSortChangeDetail,
} from "../../../table/types.js";
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
import { formatRange } from "../format-range.js";

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

const productColumns: UaxTableColumn[] = [
    { key: "name", label: "Product", elementName: UAX_TABLE_CELL.link, hrefKey: "url", searchable: true, sortable: true, sortAs: "text" },
    { key: "sku", label: "SKU", searchable: true },
    { key: "units", label: "Units sold", elementName: UAX_TABLE_CELL.share, width: "28%", valueFormat: COUNT, sortable: true, sortAs: "number" },
    { key: "revenue", label: "Revenue", elementName: UAX_TABLE_CELL.share, width: "32%", valueFormat: EUR_WHOLE, color: 2, sortable: true, sortAs: "number" },
];

// The buyers table is `server` mode: the product sorts, pages and searches, so no `sortAs` here.
const buyerColumns: UaxTableColumn[] = [
    { key: "name", label: "Buyer", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "orders", label: "Orders", elementName: UAX_TABLE_CELL.number, align: "end", sortable: true },
    { key: "spent", label: "Total spent", elementName: UAX_TABLE_CELL.share, width: "30%", valueFormat: EUR_WHOLE, sortable: true },
];

const discountColumns: UaxTableColumn[] = [
    { key: "name", label: "Discount", sortable: true, sortAs: "text" },
    { key: "code", label: "Code" },
    { key: "uses", label: "Times used", elementName: UAX_TABLE_CELL.share, width: "30%", valueFormat: COUNT, sortable: true, sortAs: "number" },
    { key: "given", label: "Value given", elementName: UAX_TABLE_CELL.number, valueFormat: EUR_WHOLE, align: "end", sortable: true, sortAs: "number" },
];

/**
 * Commerce > Analytics: a page header with the date range, a row of KPI tiles that pick the metric of one chart,
 * then top products, popular discounts and top buyers tables. The page owns the state, asks the API for data when
 * it changes, and hands the answer to the parts.
 */
@customElement("example-commerce-analytics-page")
export class ExampleCommerceAnalyticsPageElement extends UmbLitElement {
    /** Milliseconds each request to the fake API takes. Raise it to see the loading states. */
    @property({ type: Number })
    latency = 150;

    @state() private _range: UaxDateRange = { from: "2026-05-25", to: "2026-06-23" };
    @state() private _compare?: UaxCompare = { mode: "previous-period", from: "2026-04-25", to: "2026-05-24" };
    @state() private _metric: MetricId = "revenue";

    @state() private _data?: Snapshot;
    @state() private _compareData?: Snapshot;
    @state() private _loading = true;

    // Top buyers load a page at a time, so they carry their own table state and loading flag.
    @state() private _buyers?: BuyerPage;
    @state() private _buyerCompare: BuyerRow[] = [];
    @state() private _buyersLoading = true;
    @state() private _buyerSort?: UaxTableSort = { key: "spent", direction: "desc" };
    @state() private _buyerPage = 1;
    @state() private _buyerPageSize = 5;
    @state() private _buyerQuery = "";

    // A newer request makes an older answer stale, so only the latest one is shown. A real fetch should also abort the
    // previous request (AbortController) and abort on disconnect, so nothing runs for a page that is gone.
    #summaryRequest = 0;
    #buyersRequest = 0;

    override connectedCallback() {
        super.connectedCallback();
        this.#loadSummary();
        this.#loadBuyers();
    }

    async #loadSummary() {
        const request = ++this.#summaryRequest;
        this._loading = true;
        const [data, compareData] = await Promise.all([
            loadSnapshot(this._range, this.latency),
            this._compare ? loadSnapshot(this._compare, this.latency) : undefined,
        ]);
        if (request !== this.#summaryRequest) return;
        this._data = data;
        this._compareData = compareData;
        this._loading = false;
    }

    async #loadBuyers() {
        const request = ++this.#buyersRequest;
        this._buyersLoading = true;
        const [buyers, compare] = await Promise.all([
            loadBuyers(
                this._range,
                { sort: this._buyerSort, page: this._buyerPage, pageSize: this._buyerPageSize, query: this._buyerQuery },
                this.latency,
            ),
            this._compare ? loadBuyerCompare(this._compare, this.latency) : [],
        ]);
        if (request !== this.#buyersRequest) return;
        this._buyers = buyers;
        this._buyerCompare = compare;
        this._buyersLoading = false;
    }

    // The date range updates everything. A new range starts the buyers back on page 1.
    #onRangeChange(e: CustomEvent<{ value: UaxDateRange; compare?: UaxCompare }>) {
        this._range = e.detail.value;
        this._compare = e.detail.compare;
        this._buyerPage = 1;
        this.#loadSummary();
        this.#loadBuyers();
    }

    // A tile was pressed: the chart plots that metric. Nothing is fetched, the snapshot already holds every metric.
    #selectMetric(metric: MetricId) {
        this._metric = metric;
    }

    #onBuyerSort(e: CustomEvent<UaxTableSortChangeDetail>) {
        this._buyerSort = e.detail;
        this._buyerPage = 1;
        this.#loadBuyers();
    }

    #onBuyerPage(e: CustomEvent<UaxTablePageChangeDetail>) {
        this._buyerPage = e.detail.page;
        this._buyerPageSize = e.detail.pageSize;
        this.#loadBuyers();
    }

    #onBuyerSearch(e: CustomEvent<UaxTableSearchDetail>) {
        this._buyerQuery = e.detail.query;
        this._buyerPage = 1;
        this.#loadBuyers();
    }

    // The change against last period: a percent change, or points for a rate. Nothing without a comparison.
    #delta(id: MetricId) {
        const current = this._data?.totals;
        const previous = this._compareData?.totals;
        if (!current || !previous) return undefined;
        if (id === "conversion") return previous.carts ? current.conversion - previous.conversion : undefined;
        return previous[id] ? ((current[id] - previous[id]) / previous[id]) * 100 : undefined;
    }

    #series(days: Day[] | undefined, id: MetricId): UaxSeries[] {
        const metric = metrics.find((m) => m.id === id)!;
        // No orders in the range: no points, so the chart shows its empty state.
        if (!days?.some((d) => d.orders)) return [];
        return [{ id, label: metric.label, points: days.map((d) => ({ date: d.date, value: dayValue(d, id) })) }];
    }

    #renderTile(metric: (typeof metrics)[number]) {
        const totals = this._data?.totals;
        return html`<uax-kpi-tile
            label=${metric.label}
            icon=${metric.icon}
            .value=${totals ? this.localize.number(totals[metric.id], metric.format) : undefined}
            .delta=${this.#delta(metric.id)}
            delta-unit=${metric.id === "conversion" ? "points" : "percent"}
            ?loading=${this._loading}
            selectable
            .deselectable=${false}
            .selected=${this._metric === metric.id}
            @selected=${() => this.#selectMetric(metric.id)}></uax-kpi-tile>`;
    }

    override render() {
        const metric = metrics.find((m) => m.id === this._metric)!;
        const compare = this._compare;
        return html`
            <div class="page">
                <header>
                    <h1>Analytics</h1>
                    <div class="actions">
                        <uax-date-range .value=${this._range} .compare=${compare} @change=${this.#onRangeChange}></uax-date-range>
                    </div>
                </header>

                <div class="kpis">${metrics.map((m) => this.#renderTile(m))}</div>

                <uui-box headline=${metric.label} headline-variant="h2" style="--uui-box-default-padding: 0">
                    <uax-time-series-chart
                        kind="line"
                        .series=${this.#series(this._data?.days, this._metric)}
                        .compareSeries=${this.#series(this._compareData?.days, this._metric)}
                        .compareLabel=${compare ? formatRange(this.localize, compare) : undefined}
                        .valueFormat=${metric.format}
                        ?loading=${this._loading}></uax-time-series-chart>
                </uui-box>

                <div class="tables">
                    <uui-box headline="Top products" headline-variant="h2" style="--uui-box-default-padding: 0">
                        <uax-data-table
                            row-key="sku"
                            .columns=${productColumns}
                            .rows=${this._data?.products ?? []}
                            .compareRows=${this._compareData?.products ?? []}
                            ?loading=${this._loading}>
                            <div slot="toolbar"><uax-table-search></uax-table-search></div>
                        </uax-data-table>
                    </uui-box>

                    <uui-box headline="Popular discounts" headline-variant="h2" style="--uui-box-default-padding: 0">
                        <uax-data-table
                            row-key="code"
                            .columns=${discountColumns}
                            .rows=${this._data?.discounts ?? []}
                            .compareRows=${this._compareData?.discounts ?? []}
                            ?loading=${this._loading}></uax-data-table>
                    </uui-box>
                </div>

                <uui-box headline="Top buyers" headline-variant="h2" style="--uui-box-default-padding: 0">
                    <uax-data-table
                        mode="server"
                        row-key="email"
                        .columns=${buyerColumns}
                        .rows=${this._buyers?.rows ?? []}
                        .compareRows=${this._buyerCompare}
                        .totalRows=${this._buyers?.totalRows}
                        .stats=${this._buyers?.stats}
                        .sort=${this._buyerSort}
                        .page=${this._buyerPage}
                        .pageSize=${this._buyerPageSize}
                        ?loading=${this._buyersLoading}
                        @sort-change=${this.#onBuyerSort}
                        @page-change=${this.#onBuyerPage}
                        @search=${this.#onBuyerSearch}>
                        <div slot="toolbar"><uax-table-search></uax-table-search></div>
                    </uax-data-table>
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
        .kpis {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: var(--uui-size-space-5);
        }
        .tables {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
            gap: var(--uui-size-layout-1);
            align-items: start;
        }
    `;
}
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-commerce-analytics-page": ExampleCommerceAnalyticsPageElement;
    }
}
