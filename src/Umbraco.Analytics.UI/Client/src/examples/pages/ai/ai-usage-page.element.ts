import { css, customElement, html, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../../../kpi-tile/kpi-tile.element.js";
import "../../../chart/time-series-chart.element.js";
import "../../../group-by/group-by.element.js";
import "../../../date-range/date-range.element.js";
import "../../../table/data-table.element.js";
import "../../../table-search/table-search.element.js";
import { UAX_TABLE_CELL } from "../../../table/cells/cell-names.js";
import type { UaxSeries } from "../../../chart/types.js";
import type { UaxColorSlot } from "../../../theme/types.js";
import type { UaxCompare, UaxDateRange } from "../../../date-range/types.js";
import type { UaxGroupBy } from "../../../group-by/group-by.element.js";
import type { UaxTableColumn, UaxTablePageChangeDetail, UaxTableSearchDetail, UaxTableSort, UaxTableSortChangeDetail } from "../../../table/types.js";
import {
    getBreakdown,
    getUsage,
    type BreakdownBy,
    type BreakdownResult,
    type BreakdownSortKey,
    type UsageBucket,
    type UsageResult,
    type UsageTotals,
} from "./ai-usage-fake-data.js";
import { formatRange } from "../format-range.js";

// #region page
// A product localizes labels, headlines and column names with this.localize.term(...). The examples keep English for readability.
type Metric = "requests" | "inputTokens" | "outputTokens" | "totalTokens";

// Fixed dates keep the example's data, and its screenshots, the same on every day.
const initialRange: UaxDateRange = { from: "2026-05-25", to: "2026-06-23" };
const initialCompare: UaxCompare = { mode: "previous-period", from: "2026-04-25", to: "2026-05-24" };

const metricLabels: Record<Metric, string> = {
    requests: "Requests",
    inputTokens: "Input tokens",
    outputTokens: "Output tokens",
    totalTokens: "Total tokens",
};

/** What each metric stacks into. A tile picks the metric, and this turns the buckets into the chart's series. */
const stacks: Record<Metric, { id: string; label: string; color: UaxColorSlot; of: (b: UsageBucket) => number }[]> = {
    requests: [
        { id: "succeeded", label: "Succeeded", color: 1, of: (b) => b.requests - b.failed },
        { id: "failed", label: "Failed", color: 2, of: (b) => b.failed },
    ],
    inputTokens: [
        { id: "uncached", label: "Input", color: 1, of: (b) => b.inputTokens - b.cachedInputTokens },
        { id: "cached", label: "Cached input", color: 3, of: (b) => b.cachedInputTokens },
    ],
    outputTokens: [{ id: "output", label: "Output", color: 2, of: (b) => b.outputTokens }],
    totalTokens: [
        { id: "input", label: "Input", color: 1, of: (b) => b.inputTokens },
        { id: "output", label: "Output", color: 2, of: (b) => b.outputTokens },
    ],
};

const toSeries = (metric: Metric, buckets: UsageBucket[] = []): UaxSeries[] =>
    stacks[metric].map(({ id, label, color, of }) => ({ id, label, color, points: buckets.map((b) => ({ date: b.date, value: of(b) })) }));

/** Percent change against the comparison period. `undefined` when there is nothing to divide by. */
const change = (now: number, before?: number) => (before ? ((now - before) / before) * 100 : undefined);

const tableColumns = (by: BreakdownBy): UaxTableColumn[] => [
    { key: "name", label: by === "model" ? "Model" : "Profile", elementName: UAX_TABLE_CELL.text, sortable: true, searchable: true, width: "28%" },
    { key: "requests", label: "Requests", elementName: UAX_TABLE_CELL.share, sortable: true, sortAs: "number", width: "24%" },
    { key: "totalTokens", label: "Tokens", elementName: UAX_TABLE_CELL.share, sortable: true, sortAs: "number", width: "24%" },
    { key: "successRate", label: "Success rate", elementName: UAX_TABLE_CELL.percent, align: "end", sortable: true, sortAs: "number" },
    {
        key: "avgDurationMs",
        label: "Avg duration",
        elementName: UAX_TABLE_CELL.number,
        align: "end",
        sortable: true,
        sortAs: "number",
        valueFormat: { style: "unit", unit: "millisecond", maximumFractionDigits: 0 },
        meta: { lowerIsBetter: true }, // a faster average is the improvement, so the compare badge shows a fall as green
    },
];

const breakdownOptions = [
    { name: "Model", value: "model" },
    { name: "Profile", value: "profile" },
];

@customElement("example-ai-usage-page")
export class ExampleAiUsagePageElement extends UmbLitElement {
    /** Milliseconds each request to the fake API takes. Raise it to see the loading states. */
    @property({ type: Number })
    latency = 150;

    @state() private _range: UaxDateRange = initialRange;
    @state() private _compare?: UaxCompare = initialCompare;
    @state() private _groupBy: UaxGroupBy = "day";
    @state() private _metric: Metric = "requests";
    @state() private _by: BreakdownBy = "model";
    @state() private _sort: UaxTableSort = { key: "requests", direction: "desc" };
    @state() private _page = 1;
    @state() private _pageSize = 5;
    @state() private _query = "";

    @state() private _usage?: UsageResult;
    @state() private _breakdown?: BreakdownResult;
    @state() private _usageLoading = true;
    @state() private _breakdownLoading = true;

    // A newer request makes an older answer stale, so only the latest one is shown. A real fetch should also abort the
    // previous request (AbortController) and abort on disconnect, so nothing runs for a page that is gone.
    #usageRequest = 0;
    #breakdownRequest = 0;

    override connectedCallback() {
        super.connectedCallback();
        this.#loadUsage();
        this.#loadBreakdown();
    }

    async #loadUsage() {
        const request = ++this.#usageRequest;
        this._usageLoading = true;
        const usage = await getUsage({ range: this._range, compare: this._compare, groupBy: this._groupBy }, this.latency);
        if (request !== this.#usageRequest) return;
        this._usage = usage;
        this._usageLoading = false;
    }

    async #loadBreakdown() {
        const request = ++this.#breakdownRequest;
        this._breakdownLoading = true;
        const breakdown = await getBreakdown(
            {
                by: this._by,
                range: this._range,
                compare: this._compare,
                sort: { key: this._sort.key as BreakdownSortKey, direction: this._sort.direction },
                page: this._page,
                pageSize: this._pageSize,
                query: this._query,
            },
            this.latency,
        );
        if (request !== this.#breakdownRequest) return;
        this._breakdown = breakdown;
        this._breakdownLoading = false;
    }

    // The date range changed: every part reloads. The table goes back to page 1.
    #onDateRange(event: CustomEvent<{ value: UaxDateRange; compare?: UaxCompare }>) {
        this._range = event.detail.value;
        this._compare = event.detail.compare;
        this._page = 1;
        this.#loadUsage();
        this.#loadBreakdown();
    }

    // Group by only changes how the chart's points are bucketed.
    #onGroupBy(event: CustomEvent<{ value: UaxGroupBy }>) {
        this._groupBy = event.detail.value;
        this.#loadUsage();
    }

    // A tile was pressed: the chart plots that metric. Nothing is fetched, the buckets already hold every metric.
    #selectMetric(metric: Metric) {
        this._metric = metric;
    }

    #onBreakdownBy(event: Event) {
        this._by = (event.target as HTMLSelectElement).value as BreakdownBy;
        this._page = 1;
        this.#loadBreakdown();
    }

    // The table has already changed its own `sort` and gone back to page 1. In server mode it is up to us to load that page.
    #onSort(event: CustomEvent<UaxTableSortChangeDetail>) {
        this._sort = event.detail;
        this._page = 1;
        this.#loadBreakdown();
    }

    #onPage(event: CustomEvent<UaxTablePageChangeDetail>) {
        this._page = event.detail.page;
        this._pageSize = event.detail.pageSize;
        this.#loadBreakdown();
    }

    // The search box lives in the table's toolbar slot. Server mode ignores `query`, so the search is ours to run.
    #onSearch(event: CustomEvent<UaxTableSearchDetail>) {
        this._query = event.detail.query;
        this._page = 1;
        this.#loadBreakdown();
    }

    #tile(metric: Metric, icon: string, pick: (t: UsageTotals) => number) {
        const summary = this._usage?.summary;
        return html`<uax-kpi-tile
            label=${metricLabels[metric]}
            icon=${icon}
            .value=${summary && this.#compact(pick(summary))}
            .delta=${summary && change(pick(summary), this._usage?.compareSummary && pick(this._usage.compareSummary))}
            ?loading=${this._usageLoading}
            selectable
            .deselectable=${false}
            .selected=${this._metric === metric}
            @selected=${() => this.#selectMetric(metric)}></uax-kpi-tile>`;
    }

    #compact(value: number) {
        return this.localize.number(value, { notation: "compact", maximumFractionDigits: 1 });
    }

    #successRate(t: UsageTotals) {
        return t.requests ? (t.requests - t.failed) / t.requests : 0;
    }

    #avgDuration(t: UsageTotals) {
        return t.requests ? t.durationMs / t.requests : 0;
    }

    // Success rate and average duration can't be stacked by day, so their tiles don't pick a chart metric.
    #tiles() {
        const now = this._usage?.summary;
        const before = this._usage?.compareSummary;
        const successRate = now && this.#successRate(now);
        const duration = now && this.#avgDuration(now);
        return html`<div class="tiles">
            ${this.#tile("requests", "icon-chart", (t) => t.requests)} ${this.#tile("inputTokens", "icon-inbox", (t) => t.inputTokens)}
            ${this.#tile("outputTokens", "icon-navigation-right", (t) => t.outputTokens)}
            ${this.#tile("totalTokens", "icon-coins", (t) => t.inputTokens + t.outputTokens)}
            <uax-kpi-tile
                label="Success rate"
                icon="icon-check"
                .value=${successRate === undefined
                    ? undefined
                    : this.localize.number(successRate, { style: "percent", maximumFractionDigits: 1 })}
                .delta=${now && before ? (this.#successRate(now) - this.#successRate(before)) * 100 : undefined}
                delta-unit="points"
                ?loading=${this._usageLoading}></uax-kpi-tile>
            <uax-kpi-tile
                label="Avg duration"
                icon="icon-time"
                .value=${duration === undefined
                    ? undefined
                    : this.localize.number(duration / 1000, { style: "unit", unit: "second", maximumFractionDigits: 2 })}
                .delta=${now && before ? change(this.#avgDuration(now), this.#avgDuration(before)) : undefined}
                lower-is-better
                ?loading=${this._usageLoading}></uax-kpi-tile>
        </div>`;
    }

    override render() {
        const usage = this._usage;
        const breakdown = this._breakdown;
        return html`
            <div class="page">
                <header>
                    <h1>Usage</h1>
                    <div class="actions">
                        <uax-group-by .value=${this._groupBy} @change=${this.#onGroupBy}></uax-group-by>
                        <uax-date-range .value=${this._range} .compare=${this._compare} @change=${this.#onDateRange}></uax-date-range>
                    </div>
                </header>

                ${this.#tiles()}

                <uui-box headline="${metricLabels[this._metric]} over time" headline-variant="h2" style="--uui-box-default-padding: 0">
                    <uax-time-series-chart
                        kind="stacked-bar"
                        .series=${toSeries(this._metric, usage?.buckets)}
                        .compareSeries=${toSeries(this._metric, usage?.compareBuckets)}
                        .compareLabel=${this._compare ? formatRange(this.localize, this._compare) : undefined}
                        .groupBy=${this._groupBy}
                        ?loading=${this._usageLoading}></uax-time-series-chart>
                </uui-box>

                <uui-box headline="Breakdown" headline-variant="h2" style="--uui-box-default-padding: 0">
                    <uui-select
                        slot="header-actions"
                        label="Break down by"
                        .options=${breakdownOptions.map((o) => ({ ...o, selected: o.value === this._by }))}
                        @change=${this.#onBreakdownBy}></uui-select>
                    <uax-data-table
                        mode="server"
                        row-key="name"
                        .columns=${tableColumns(this._by)}
                        .rows=${breakdown?.rows ?? []}
                        .compareRows=${breakdown?.compareRows ?? []}
                        .totalRows=${breakdown?.totalRows}
                        .stats=${breakdown?.stats}
                        .sort=${this._sort}
                        .page=${this._page}
                        .pageSize=${this._pageSize}
                        ?loading=${this._breakdownLoading}
                        @sort-change=${this.#onSort}
                        @page-change=${this.#onPage}
                        @search=${this.#onSearch}>
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
        .tiles {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
            gap: var(--uui-size-space-4);
        }
    `;
}
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-ai-usage-page": ExampleAiUsagePageElement;
    }
}
