import { css, customElement, html, nothing, property, ref, state, type PropertyValues } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import "../../../kpi-tile/kpi-tile.element.js";
import "../../../chart/time-series-chart.element.js";
import "../../../date-range/date-range.element.js";
import "../../../funnel/funnel.element.js";
import "../../../table/data-table.element.js";
import "../../../stat/stat.element.js";
import "../../../search-field/search-field.element.js";
import { UAUI_TABLE_CELL } from "../../../table/cells/cell-names.js";
import type { UauiSeries } from "../../../chart/types.js";
import type { UauiFunnelStep } from "../../../funnel/types.js";
import { uauiCompareFor, uauiFormatDateRange } from "../../../date-helpers/index.js";
import type { UauiCompare, UauiDateRange } from "../../../date-range/types.js";
import { UauiTableServerController } from "../../../table/table-server.controller.js";
import type { UauiTableColumn, UauiTableRowClickDetail, UauiTableServerState } from "../../../table/index.js";
import {
    loadBuyerCompare,
    loadBuyers,
    loadSnapshot,
    loadStockForecast,
    type BuyerPage,
    type BuyerRow,
    type CartConversion,
    type Day,
    type DiscountRow,
    type RefundReason,
    type Snapshot,
    type StockForecastRow,
    type Totals,
} from "./commerce-fake-data.js";

// #region page
// A product localizes labels, headlines and column names with this.localize.term(...). The examples keep English for readability.
const EUR: Intl.NumberFormatOptions = { style: "currency", currency: "EUR" };
// The buyers table uses whole euros: the column is narrow and a share cell also shows a percent and a change badge.
const EUR_WHOLE: Intl.NumberFormatOptions = { ...EUR, maximumFractionDigits: 0 };
const COUNT: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };
const PER_DAY: Intl.NumberFormatOptions = { maximumFractionDigits: 2 };
const DAYS: Intl.NumberFormatOptions = { style: "unit", unit: "day", unitDisplay: "long", maximumFractionDigits: 0 };
const PERCENT: Intl.NumberFormatOptions = { style: "unit", unit: "percent", maximumFractionDigits: 1 };

/** A rate in %, or undefined when there is nothing to divide by (no badge, no point). */
const rateOf = (part: number, whole: number) => (whole ? (part / whole) * 100 : undefined);

type Metric = {
    id: "revenue" | "orders" | "aov" | "conversion" | "recovery" | "repeatRate" | "discountsApplied";
    label: string;
    icon: string;
    format: Intl.NumberFormatOptions;
    /** A rate compares in percentage points, everything else in percent. */
    rate?: boolean;
    /** The period's figure, or undefined when it has no value (a rate with nothing to divide by). A rate of 0 is a value. */
    total: (t: Totals) => number | undefined;
    /** One day's value, or undefined when the day has none (the chart leaves a gap). */
    day: (d: Day) => number | undefined;
};
type MetricId = Metric["id"];

// One entry per KPI tile, each with a series over time, as in Commerce's endpoints. The tile, the chart's axis and
// tooltip, and the table columns all use the same number format, so a figure reads the same everywhere on the page.
const metrics: Metric[] = [
    { id: "revenue", label: "Revenue", icon: "icon-receipt-dollar", format: EUR, total: (t) => t.revenue, day: (d) => d.revenue },
    { id: "orders", label: "Orders", icon: "icon-inbox", format: COUNT, total: (t) => t.orders, day: (d) => d.orders },
    {
        id: "aov",
        label: "Average order value",
        icon: "icon-calculator",
        format: EUR,
        total: (t) => (t.orders ? t.aov : undefined),
        day: (d) => (d.orders ? d.revenue / d.orders : undefined),
    },
    {
        id: "conversion",
        label: "Cart conversion",
        icon: "icon-shopping-basket",
        format: PERCENT,
        rate: true,
        total: (t) => rateOf(t.orders, t.carts),
        day: (d) => rateOf(d.orders, d.carts),
    },
    {
        id: "recovery",
        label: "Abandoned cart recovery",
        icon: "icon-undo",
        format: PERCENT,
        rate: true,
        total: (t) => rateOf(t.recoveredCarts, t.notifiedCarts),
        day: (d) => rateOf(d.recoveredCarts, d.notifiedCarts),
    },
    {
        id: "repeatRate",
        label: "Repeat customers",
        icon: "icon-users",
        format: PERCENT,
        rate: true,
        total: (t) => rateOf(t.repeatCustomers, t.customers),
        day: (d) => rateOf(d.repeatCustomers, d.customers),
    },
    {
        id: "discountsApplied",
        label: "Applied discounts",
        icon: "icon-tag",
        format: COUNT,
        total: (t) => t.discountsApplied,
        day: (d) => d.discountsApplied,
    },
];

// Commerce's refund reasons, as words. A product would use its own localization keys.
const refundReasons: Record<RefundReason, string> = {
    itemDefectiveOrDamaged: "Item defective or damaged",
    wrongItemSent: "Wrong item sent",
    itemNotAsDescribed: "Item not as described",
    itemDidNotArrive: "Item did not arrive",
    customerChangedMind: "Customer changed mind",
    productQualityNotSatisfactory: "Product quality not satisfactory",
};

/** The cart funnel's three steps, from the cart conversion endpoint's answer. */
const cartSteps = (c: CartConversion | undefined): UauiFunnelStep[] =>
    c
        ? [
              { id: "carts", label: "Carts created", value: c.totalCarts },
              { id: "checkout", label: "Reached checkout", value: c.reachedCheckout },
              { id: "orders", label: "Orders placed", value: c.finalized },
          ]
        : [];

/** The abandoned cart funnel's two steps, as Commerce's abandoned cart widget counts them: carts notified, then purchased. */
const abandonedSteps = (t: Totals | undefined): UauiFunnelStep[] =>
    t
        ? [
              { id: "notified", label: "Notified", value: t.notifiedCarts },
              { id: "purchased", label: "Purchased", value: t.recoveredCarts },
          ]
        : [];

// One example arrangement, not the only layout: the package leaves layout to each product. Here the boxes below the KPI
// row sit in a grid of at most two equal columns, and each box says whether it spans one column or both. A product with
// extensible widgets could place them this way: Commerce's analytics widgets are registered by manifest, so a widget's
// manifest could carry `meta.span` and the dashboard would render the widgets in order like this. On a narrow page the
// grid has one column, so every box takes the full width whatever its span.
type BoxSpan = 1 | 2;
type BoxId = "chart" | "cartConversion" | "abandonedCarts" | "topProducts" | "popularDiscounts" | "refunds" | "stockForecast" | "topBuyers";
const boxes: { id: BoxId; span: BoxSpan }[] = [
    { id: "chart", span: 2 },
    { id: "cartConversion", span: 1 },
    { id: "abandonedCarts", span: 1 },
    { id: "topProducts", span: 1 },
    { id: "popularDiscounts", span: 1 },
    { id: "refunds", span: 1 },
    { id: "stockForecast", span: 1 },
    { id: "topBuyers", span: 2 },
];

/** A page of buyers and last period's buyers, which the controller hands to the table. */
type BuyerResult = BuyerPage & { compareRows: BuyerRow[] };

// Top products and stock forecast rows are per variant. Commerce identifies a variant by its product and variant
// references, so those tables key on both; a product without variants has no variant reference, which the table reads
// as empty. Refunds by product is per product (no variant reference), so it keys on the product reference alone.
const PRODUCT_ROW_KEY = ["productReference", "productVariantReference"];

// What Commerce's top selling products endpoint answers: the product, its SKU and the quantity sold, with its change.
const productColumns: UauiTableColumn[] = [
    { key: "name", label: "Product", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" }, sortable: true, sortAs: "text" },
    { key: "sku", label: "SKU" },
    { key: "totalQuantity", label: "Quantity sold", elementName: UAUI_TABLE_CELL.share, width: "40%", valueFormat: COUNT, sortable: true, sortAs: "number" },
];

// The buyers table is `server` mode: the product sorts, pages and searches, so no `sortAs` here.
const buyerColumns: UauiTableColumn[] = [
    { key: "name", label: "Buyer", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "orders", label: "Orders", elementName: UAUI_TABLE_CELL.number, align: "end", sortable: true },
    { key: "products", label: "Products", elementName: UAUI_TABLE_CELL.number, align: "end", sortable: true },
    { key: "spent", label: "Total spent", elementName: UAUI_TABLE_CELL.share, width: "30%", valueFormat: EUR_WHOLE, sortable: true },
];

// What Commerce's popular discounts endpoint answers: the discount, whether it is active and when it is valid, and how
// often it was used, with its change. The page turns the status into words; the date cells format the ISO dates.
const discountColumns: UauiTableColumn[] = [
    { key: "name", label: "Discount", sortable: true, sortAs: "text" },
    { key: "statusText", label: "Status", elementName: UAUI_TABLE_CELL.status, meta: { toneKey: "statusTone" } },
    { key: "startDate", label: "Valid from", elementName: UAUI_TABLE_CELL.date, sortable: true, sortAs: "date" },
    { key: "expiryDate", label: "Valid to", elementName: UAUI_TABLE_CELL.date, sortable: true, sortAs: "date" },
    { key: "usageCount", label: "Times used", elementName: UAUI_TABLE_CELL.share, width: "30%", valueFormat: COUNT, sortable: true, sortAs: "number" },
];

// Each product's refund rate is compared with last period's breakdown, in points (5% to 6% is +1 pp), and a rise is bad.
const refundColumns: UauiTableColumn[] = [
    { key: "productName", label: "Product", sortable: true, sortAs: "text" },
    { key: "sku", label: "SKU" },
    {
        key: "refundRate",
        label: "Refund rate",
        elementName: UAUI_TABLE_CELL.number,
        valueFormat: PERCENT,
        align: "end",
        sortable: true,
        sortAs: "number",
        meta: { deltaUnit: "points", lowerIsBetter: true },
    },
    { key: "topReasonText", label: "Top reason" },
];

// The forecast follows the date range (sales per day are over the range) but has no compare. "Days left" is a status
// cell on the number of days, so it sorts by days: 0 days reads "Out of stock" like in Commerce, and the tone follows
// Commerce's thresholds (danger up to 7 days, warning up to 14, then positive). The rows come soonest first.
const stockColumns: UauiTableColumn[] = [
    { key: "name", label: "Product", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" }, sortable: true, sortAs: "text" },
    { key: "sku", label: "SKU" },
    { key: "currentStock", label: "In stock", elementName: UAUI_TABLE_CELL.number, valueFormat: COUNT, align: "end", sortable: true, sortAs: "number" },
    { key: "averageDailySales", label: "Sold per day", elementName: UAUI_TABLE_CELL.number, valueFormat: PER_DAY, align: "end", sortable: true, sortAs: "number" },
    {
        key: "estimatedDaysRemaining",
        label: "Days left",
        elementName: UAUI_TABLE_CELL.status,
        valueFormat: DAYS,
        align: "end",
        sortable: true,
        sortAs: "number",
        meta: { toneKey: "daysLeftTone", textKey: "daysLeftText" },
    },
];

// Commerce shows 5 forecast rows a page, and a reload for a new range goes back to page 1 (the table's `reset-page-on-rows`).
const STOCK_PAGE_SIZE = 5;

/** Which ranges of the cart conversion answer are older than the cart cleanup policy. */
type CleanupScope = "range" | "compare" | "both";

const cleanupNotices: Record<CleanupScope, { headline: string; text: string }> = {
    range: {
        headline: "The date range is older than the cart cleanup policy",
        text: "Carts that never became orders have been deleted for part of this range, so cart conversion (the tile, the chart and the funnel) may read higher than it was.",
    },
    compare: {
        headline: "The comparison range is older than the cart cleanup policy",
        text: "Carts that never became orders have been deleted for part of the comparison range, so its cart conversion may read higher than it was, and the change against it lower.",
    },
    both: {
        headline: "The date range and comparison range are older than the cart cleanup policy",
        text: "Carts that never became orders have been deleted for part of both ranges, so cart conversion (the tile, the chart and the funnel) may read higher than it was.",
    },
};

/**
 * Commerce > Analytics: an actions row with the date range, a cart cleanup notice when a range is too old for cart
 * conversion to be right, a row of KPI tiles that pick the metric of one chart,
 * the cart conversion funnel and the refunds box side by side, then top products, popular discounts, top buyers and
 * the stock forecast. The page owns the state, asks the API for data when it changes, and hands the answer to the parts.
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

    @state() private _stock?: StockForecastRow[];
    @state() private _stockLoading = true;
    @state() private _stockError = false;

    // The table rows, worked out once when an answer arrives rather than on every render, so the tables get the same
    // arrays until the data changes. Top products and stock forecast rows are per variant, so they key on product and
    // variant (PRODUCT_ROW_KEY); refunds are per product.
    @state() private _refundRows: Record<string, unknown>[] = [];
    @state() private _discountRows: Record<string, unknown>[] = [];
    @state() private _stockRows: Record<string, unknown>[] = [];

    /** The buyer last opened from Top buyers. Commerce opens a buyer detail dialog here; the example names the buyer. */
    @state() private _openedBuyer?: BuyerRow;

    // A newer request makes an older answer stale, so only the latest one is shown. A real fetch should also abort the
    // previous request (AbortController) and abort on disconnect, so nothing runs for a page that is gone.
    #summaryRequest = 0;
    #stockRequest = 0;

    // Top buyers load a page at a time: the controller keeps their sort, page, page size and search, drops stale
    // answers and gives the table its rows, loading and totals. It loads on connect and on the table's own events.
    #buyers = new UauiTableServerController<BuyerResult>(this, {
        sort: { key: "spent", direction: "desc" },
        // Commerce shows 10 top buyers a page.
        pageSize: 10,
        load: (state, signal) => this.#loadBuyers(state, signal),
    });

    override connectedCallback() {
        super.connectedCallback();
        void this.#loadSummary();
        void this.#loadStock();
    }

    /** How each call to the fake API behaves. A real product passes its own request options here. */
    get #api() {
        return { latencyMs: this.latency, fail: this.failing };
    }

    // A rejected request shows the error state, with Retry. A stale answer, or a stale failure, is dropped either way.
    async #loadSummary() {
        const request = ++this.#summaryRequest;
        this._loading = true;
        this._error = false;
        try {
            const [data, compareData] = await Promise.all([
                loadSnapshot(this._range, this.#api),
                this._compare ? loadSnapshot(this._compare, this.#api) : undefined,
            ]);
            if (request !== this.#summaryRequest) return;
            this._data = data;
            this._compareData = compareData;
        } catch {
            if (request !== this.#summaryRequest) return;
            this._error = true;
        }
        this._loading = false;
    }

    // Like Commerce, the forecast averages sales over the chosen range, so it reloads when the range changes. No compare.
    async #loadStock() {
        const request = ++this.#stockRequest;
        this._stockLoading = true;
        this._stockError = false;
        try {
            const stock = await loadStockForecast(this._range, this.#api);
            if (request !== this.#stockRequest) return;
            this._stock = stock;
        } catch {
            if (request !== this.#stockRequest) return;
            this._stockError = true;
        }
        this._stockLoading = false;
    }

    async #loadBuyers(state: Readonly<UauiTableServerState>, signal: AbortSignal): Promise<BuyerResult> {
        const [buyers, compareRows] = await Promise.all([
            loadBuyers(this._range, { sort: state.sort, page: state.page, pageSize: state.pageSize, query: state.query }, this.#api),
            this._compare ? loadBuyerCompare(this._compare, this.#api) : [],
        ]);
        signal.throwIfAborted();
        return { ...buyers, compareRows };
    }

    // The date range updates every part. A new range starts the buyers back on page 1, and forgets the opened buyer.
    #onRangeChange(e: CustomEvent<{ value: UauiDateRange; compare?: UauiCompare }>) {
        this._range = e.detail.value;
        this._compare = e.detail.compare;
        this._openedBuyer = undefined;
        void this.#loadSummary();
        void this.#loadStock();
        void this.#buyers.reload({ resetPage: true });
    }

    override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        if (changed.has("_data" as keyof ExampleCommerceAnalyticsPageElement)) {
            this._refundRows = this.#refundRows(this._data);
            this._discountRows = this.#discountRows(this._data?.discounts);
        }
        if (changed.has("_stock" as keyof ExampleCommerceAnalyticsPageElement)) this._stockRows = this.#stockRows(this._stock);
    }

    // A tile was pressed: the chart plots that metric. Nothing is fetched, the snapshot already holds every metric.
    #selectMetric(metric: MetricId) {
        this._metric = metric;
    }

    // A buyer row was opened. Commerce shows the buyer's orders in a dialog; the example says which buyer it would show.
    #onBuyerClick(e: CustomEvent<UauiTableRowClickDetail>) {
        this._openedBuyer = e.detail.row as BuyerRow;
    }

    // Last period's figure for a tile, which the tile compares with this period's to draw the change: a percent change,
    // or points for a rate. Undefined (no badge) when there is nothing to compare with.
    #previous(metric: Metric) {
        const previous = this._compareData?.totals;
        return previous ? metric.total(previous) : undefined;
    }

    #series(days: Day[] | undefined, metric: Metric): UauiSeries[] {
        // Nothing in the range (no orders, or for a rate nothing to divide by): no points, so the chart shows its empty state.
        if (!days?.some((d) => (metric.rate ? metric.day(d) !== undefined : d.orders))) return [];
        const points = days.flatMap((d) => {
            const value = metric.day(d);
            return value === undefined ? [] : [{ date: d.date, value }];
        });
        return [{ id: metric.id, label: metric.label, points }];
    }

    #renderTile(metric: Metric) {
        const totals = this._data?.totals;
        const value = totals ? metric.total(totals) : undefined;
        return html`<uaui-kpi-tile
            label=${metric.label}
            icon=${metric.icon}
            .value=${value === undefined ? undefined : this.localize.number(value, metric.format)}
            ?no-data=${totals !== undefined && (value === undefined || (!metric.rate && !totals.orders))}
            .current=${value}
            .previous=${this.#previous(metric)}
            delta-unit=${metric.rate ? "points" : "percent"}
            ?loading=${this._loading}
            ?error=${this._error}
            selectable
            .deselectable=${false}
            .selected=${this._metric === metric.id}
            @selected=${() => this.#selectMetric(metric.id)}></uaui-kpi-tile>`;
    }

    // The pane recipe: the overall conversion (orders over carts) goes in the box header, in points against last period.
    #renderCartConversion() {
        const current = this._data?.cartConversion;
        const previous = this._compareData?.cartConversion;
        const overall = current ? rateOf(current.finalized, current.totalCarts) : undefined;
        const compare = this._compare;
        return html`<uui-box headline="Cart conversion" headline-variant="h3" style="--uui-box-default-padding: 0">
            ${overall === undefined || this._error
                ? nothing
                : html`<uaui-stat
                      slot="header-actions"
                      layout="inline"
                      label="Overall"
                      value=${this.localize.number(overall, PERCENT)}
                      .current=${overall}
                      .previous=${previous ? rateOf(previous.finalized, previous.totalCarts) : undefined}
                      delta-unit="points"></uaui-stat>`}
            <uaui-funnel
                .steps=${cartSteps(current)}
                .compareSteps=${cartSteps(previous)}
                current-label=${uauiFormatDateRange(this.localize, this._range)}
                compare-label=${compare ? uauiFormatDateRange(this.localize, compare) : nothing}
                .valueFormat=${COUNT}
                ?loading=${this._loading}
                ?error=${this._error}
                retryable
                @retry=${() => this.#loadSummary()}></uaui-funnel>
        </uui-box>`;
    }

    // Commerce's cart conversion answer flags a range (or comparison range) older than the cart cleanup policy. The
    // notice sits above the KPI row because it affects the Cart conversion tile, the chart when it plots cart conversion,
    // and the funnel, and those sit apart on the page. While a new answer loads it keeps the last one's notice, so the
    // KPI row doesn't jump.
    #renderCleanupNotice() {
        if (this._error) return nothing;
        const range = this._data?.cartConversion.dateRangeExceedsCartCleanupPolicy ?? false;
        const compare = this._compareData?.cartConversion.dateRangeExceedsCartCleanupPolicy ?? false;
        if (!range && !compare) return nothing;
        const notice = cleanupNotices[range && compare ? "both" : range ? "range" : "compare"];
        return html`<div class="notice" role="note">
            <uui-icon name="icon-alert"></uui-icon>
            <div>
                <strong>${notice.headline}</strong>
                <p>${notice.text}</p>
            </div>
        </div>`;
    }

    // The status in words, the way Commerce writes it under the discount's name. The validity dates stay ISO dates for the date cells.
    #discountRows(discounts: DiscountRow[] | undefined) {
        return (discounts ?? []).map((d) => ({
            ...d,
            statusText: d.isActive ? "Active" : "Inactive",
            statusTone: d.isActive ? "positive" : "default",
        }));
    }

    // The top reason in words.
    #refundRows(data: Snapshot | undefined) {
        return data?.refunds.productBreakdown.map((r) => ({ ...r, topReasonText: r.topReason ? refundReasons[r.topReason] : "" })) ?? [];
    }

    // 0 days left reads "Out of stock", as in Commerce; other rows show the days, formatted by the column. The tone uses
    // Commerce's thresholds: 7 days or fewer is danger, 14 or fewer warning, more positive.
    #stockRows(stock: StockForecastRow[] | undefined) {
        return (stock ?? []).map((s) => ({
            ...s,
            daysLeftText: s.estimatedDaysRemaining === 0 ? "Out of stock" : undefined,
            daysLeftTone: s.estimatedDaysRemaining <= 7 ? "danger" : s.estimatedDaysRemaining <= 14 ? "warning" : "positive",
        }));
    }

    // Commerce's abandoned cart widget: carts notified and carts purchased, and the rate between them. The rate goes in
    // the header, in points against last period, and matches the Abandoned cart recovery tile.
    #renderAbandonedCarts() {
        const current = this._data?.totals;
        const previous = this._compareData?.totals;
        const rate = current ? rateOf(current.recoveredCarts, current.notifiedCarts) : undefined;
        const compare = this._compare;
        return html`<uui-box headline="Abandoned carts" headline-variant="h3" style="--uui-box-default-padding: 0">
            ${rate === undefined || this._error
                ? nothing
                : html`<uaui-stat
                      slot="header-actions"
                      layout="inline"
                      label="Recovered"
                      value=${this.localize.number(rate, PERCENT)}
                      .current=${rate}
                      .previous=${previous ? rateOf(previous.recoveredCarts, previous.notifiedCarts) : undefined}
                      delta-unit="points"></uaui-stat>`}
            <uaui-funnel
                .steps=${abandonedSteps(current)}
                .compareSteps=${abandonedSteps(previous)}
                current-label=${uauiFormatDateRange(this.localize, this._range)}
                compare-label=${compare ? uauiFormatDateRange(this.localize, compare) : nothing}
                .valueFormat=${COUNT}
                ?loading=${this._loading}
                ?error=${this._error}
                retryable
                @retry=${() => this.#loadSummary()}></uaui-funnel>
        </uui-box>`;
    }

    // The overall refund rate goes in the box header. A fall is good, so the badge reads it as an improvement.
    #renderRefunds() {
        const current = this._data;
        const previous = this._compareData;
        return html`<uui-box headline="Refunds" headline-variant="h3" style="--uui-box-default-padding: 0">
            ${!current?.totals.orders || this._error
                ? nothing
                : html`<uaui-stat
                      slot="header-actions"
                      layout="inline"
                      label="Refund rate"
                      value=${this.localize.number(current.refunds.refundRate, PERCENT)}
                      .current=${current.refunds.refundRate}
                      .previous=${previous?.totals.orders ? previous.refunds.refundRate : undefined}
                      delta-unit="points"
                      lower-is-better></uaui-stat>`}
            <uaui-data-table
                label="Refunds by product"
                row-key="productReference"
                .columns=${refundColumns}
                .rows=${this._refundRows}
                .compareRows=${this._compareData?.refunds.productBreakdown ?? []}
                empty-headline="No refunds in this period"
                ?loading=${this._loading}
                ?error=${this._error}
                retryable
                @retry=${() => this.#loadSummary()}></uaui-data-table>
        </uui-box>`;
    }

    // The boxes below the KPI row, in the order and with the span of the `boxes` list.
    #renderBoxes() {
        const metric = metrics.find((m) => m.id === this._metric)!;
        const compare = this._compare;
        const opened = this._openedBuyer;
        const chart = html`<uui-box headline=${metric.label} headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-time-series-chart
                    kind="line"
                    .series=${this.#series(this._data?.days, metric)}
                    .compareSeries=${this.#series(this._compareData?.days, metric)}
                    .range=${this._range}
                    .compare=${this._compare}
                    .compareLabel=${compare ? uauiFormatDateRange(this.localize, compare) : undefined}
                    .valueFormat=${metric.format}
                    ?loading=${this._loading}
                    ?error=${this._error}
                    retryable
                    @retry=${() => this.#loadSummary()}></uaui-time-series-chart>
            </uui-box>`;
        const cart = this.#renderCartConversion();
        const abandoned = this.#renderAbandonedCarts();
        const refunds = this.#renderRefunds();
        const products = html`<uui-box headline="Top products" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-data-table
                    label="Top products"
                    .rowKey=${PRODUCT_ROW_KEY}
                    .columns=${productColumns}
                    .rows=${this._data?.products ?? []}
                    .compareRows=${this._compareData?.products ?? []}
                    ?loading=${this._loading}
                    ?error=${this._error}
                    retryable
                    @retry=${() => this.#loadSummary()}></uaui-data-table>
            </uui-box>`;
        const discounts = html`<uui-box headline="Popular discounts" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-data-table
                    label="Popular discounts"
                    row-key="id"
                    .columns=${discountColumns}
                    .rows=${this._discountRows}
                    .compareRows=${this._compareData?.discounts ?? []}
                    ?loading=${this._loading}
                    ?error=${this._error}
                    retryable
                    @retry=${() => this.#loadSummary()}></uaui-data-table>
            </uui-box>`;
        const buyers = html`<uui-box headline="Top buyers" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-data-table
                    label="Top buyers"
                    ${ref(this.#buyers.attach)}
                    row-key="email"
                    .columns=${buyerColumns}
                    clickable-rows
                    @row-click=${this.#onBuyerClick}>
                    <div slot="toolbar"><uaui-search-field></uaui-search-field></div>
                    <!-- Always mounted, so screen readers can announce its text when a buyer is opened: announcement relies on the region staying mounted (and in the accessibility tree; the table only visually hides an empty footer), and has not been tested with a real screen reader. Empty, the table shows no footer. -->
                    <div slot="footer" class="opened" role="status">${opened ? `Showing orders for ${opened.name} (${opened.email})` : nothing}</div>
                </uaui-data-table>
            </uui-box>`;
        const stock = html`<uui-box headline="Stock forecast" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-data-table
                    label="Stock forecast"
                    .rowKey=${PRODUCT_ROW_KEY}
                    .columns=${stockColumns}
                    .rows=${this._stockRows}
                    page-size=${STOCK_PAGE_SIZE}
                    reset-page-on-rows
                    empty-headline="No products to forecast"
                    ?loading=${this._stockLoading}
                    ?error=${this._stockError}
                    retryable
                    @retry=${() => this.#loadStock()}></uaui-data-table>
            </uui-box>`;
        const rendered: Record<BoxId, unknown> = {
            chart,
            cartConversion: cart,
            abandonedCarts: abandoned,
            topProducts: products,
            popularDiscounts: discounts,
            refunds,
            stockForecast: stock,
            topBuyers: buyers,
        };
        return html`<div class="boxes">
            ${boxes.map((b) => html`<div class=${b.span === 2 ? "box span-2" : "box"} data-box=${b.id}>${rendered[b.id]}</div>`)}
        </div>`;
    }

    override render() {
        return html`
            <div class="actions">
                <h2 class="uui-h3">Analytics</h2>
                <uaui-date-range today="2026-06-23" .value=${this._range} .compare=${this._compare} @change=${this.#onRangeChange}></uaui-date-range>
            </div>

            ${this.#renderCleanupNotice()}

            <div class="kpis">${metrics.map((m) => this.#renderTile(m))}</div>

            ${this.#renderBoxes()}
        `;
    }

    static override styles = [
        UmbTextStyles,
        css`
            :host {
                /* The box grid picks one or two columns from the page's own width, not the window's. */
                container-type: inline-size;
                display: flex;
                flex-direction: column;
                gap: var(--uui-size-4);
                padding: var(--uui-size-layout-1);
            }
            /* UUI's .uui-h3 (written .uui-h3.uui-h3, so a plain h2 rule loses) adds a 24px bottom margin, which pushed the title above the controls' centre. Keep its -2px optical inset. */
            .actions h2.uui-h3 {
                margin-block: 0;
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
            /* One column on a narrow page, exactly two (never more) once two 480px boxes fit. The two boxes of a pair share a height. */
            .boxes {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                gap: var(--uui-size-4);
                align-items: stretch;
            }
            @container (min-width: 980px) {
                .boxes {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }
            .span-2 {
                grid-column: 1 / -1;
            }
            /* A grid, so the box fills its cell's full height when the pair's other box is taller. */
            .box {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                min-width: 0;
            }
            .notice {
                display: flex;
                gap: var(--uui-size-space-3);
                padding: var(--uui-size-space-3) var(--uui-size-space-4);
                border-inline-start: 4px solid var(--uui-color-warning);
                border-radius: var(--uui-border-radius);
                background: var(--uui-color-surface-alt);
                color: var(--uui-color-text);
            }
            .notice uui-icon {
                flex: none;
                margin-top: 2px;
                color: var(--uui-color-warning-emphasis);
            }
            .notice p {
                margin: var(--uui-size-space-1) 0 0;
            }
            .opened {
                color: var(--uui-color-text-alt);
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
