import { css, customElement, html, property, ref, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import "../../../kpi-tile/kpi-tile.element.js";
import "../../../chart/time-series-chart.element.js";
import "../../../group-by/group-by.element.js";
import "../../../toggle-group/toggle-group.element.js";
import type { UauiToggleGroupChangeDetail } from "../../../toggle-group/toggle-group.element.js";
import "../../../date-range/date-range.element.js";
import "../../../table/data-table.element.js";
import "../../../search-field/search-field.element.js";
import { UAUI_TABLE_CELL } from "../../../table/cells/cell-names.js";
import type { UauiSeries } from "../../../chart/types.js";
import { uauiCompareFor, uauiFormatDateRange } from "../../../date-helpers/index.js";
import type { UauiColorSlot } from "../../../theme/types.js";
import type { UauiCompare, UauiDateRange } from "../../../date-range/types.js";
import type { UauiGroupBy } from "../../../group-by/group-by.element.js";
import { UauiTableServerController } from "../../../table/table-server.controller.js";
import type { UauiTableColumn, UauiTableServerState } from "../../../table/index.js";
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

// #region page
// A product localizes labels, headlines and column names with this.localize.term(...). The examples keep English for readability.
type Metric = "requests" | "inputTokens" | "outputTokens" | "totalTokens";

// Fixed dates keep the example's data, and its screenshots, the same on every day.
const initialRange: UauiDateRange = { from: "2026-05-25", to: "2026-06-23" };
const initialCompare = uauiCompareFor("previous-period", initialRange);

const metricLabels: Record<Metric, string> = {
    requests: "Requests",
    inputTokens: "Input tokens",
    outputTokens: "Output tokens",
    totalTokens: "Total tokens",
};

/** What each metric stacks into. A tile picks the metric, and this turns the buckets into the chart's series. */
const stacks: Record<Metric, { id: string; label: string; color: UauiColorSlot; of: (b: UsageBucket) => number }[]> = {
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

const toSeries = (metric: Metric, buckets: UsageBucket[] = []): UauiSeries[] =>
    stacks[metric].map(({ id, label, color, of }) => ({ id, label, color, points: buckets.map((b) => ({ date: b.date, value: of(b) })) }));

const tableColumns = (by: BreakdownBy): UauiTableColumn[] => [
    { key: "name", label: by === "model" ? "Model" : "Profile", elementName: UAUI_TABLE_CELL.text, sortable: true, searchable: true, width: "28%" },
    { key: "requests", label: "Requests", elementName: UAUI_TABLE_CELL.share, sortable: true, sortAs: "number", width: "24%" },
    { key: "totalTokens", label: "Tokens", elementName: UAUI_TABLE_CELL.share, sortable: true, sortAs: "number", width: "24%" },
    { key: "successRate", label: "Success rate", elementName: UAUI_TABLE_CELL.percent, align: "end", sortable: true, sortAs: "number" },
    {
        key: "avgDurationMs",
        label: "Avg duration",
        elementName: UAUI_TABLE_CELL.number,
        align: "end",
        sortable: true,
        sortAs: "number",
        valueFormat: { style: "unit", unit: "millisecond", maximumFractionDigits: 0 },
        meta: { lowerIsBetter: true }, // a faster average is the improvement, so the compare badge shows a fall as green
    },
];

const breakdownOptions = [
    { label: "Model", value: "model" },
    { label: "Profile", value: "profile" },
];

@customElement("example-ai-usage-page")
export class ExampleAiUsagePageElement extends UmbLitElement {
    /** Milliseconds each request to the fake API takes. Raise it to see the loading states. */
    @property({ type: Number })
    latency = 150;

    /** Makes every request to the fake API fail, to show the error states and Retry. */
    @property({ type: Boolean })
    failing = false;

    @state() private _range: UauiDateRange = initialRange;
    @state() private _compare?: UauiCompare = initialCompare;
    @state() private _groupBy: UauiGroupBy = "day";
    @state() private _metric: Metric = "requests";
    @state() private _by: BreakdownBy = "model";

    @state() private _usage?: UsageResult;
    @state() private _usageLoading = true;
    @state() private _usageError = false;

    // A newer request makes an older answer stale, so only the latest one is shown. A real fetch should also abort the
    // previous request (AbortController) and abort on disconnect, so nothing runs for a page that is gone.
    #usageRequest = 0;

    // The table's sort, page, page size and search, the request guard and the table's rows, loading and totals.
    // The controller loads on connect and when the table raises sort-change, page-change or search.
    #breakdown = new UauiTableServerController<BreakdownResult>(this, {
        sort: { key: "requests", direction: "desc" },
        pageSize: 5,
        load: (state, signal) => this.#loadBreakdown(state, signal),
    });

    override connectedCallback() {
        super.connectedCallback();
        this.#loadUsage();
    }

    async #loadUsage() {
        const request = ++this.#usageRequest;
        this._usageLoading = true;
        this._usageError = false;
        const usage = await getUsage({ range: this._range, compare: this._compare, groupBy: this._groupBy }, this.latency);
        if (request !== this.#usageRequest) return;
        if (this.failing) {
            this._usageError = true;
            this._usageLoading = false;
            return;
        }
        this._usage = usage;
        this._usageLoading = false;
    }

    async #loadBreakdown(state: Readonly<UauiTableServerState>, signal: AbortSignal) {
        if (this.failing) throw new Error("The breakdown request failed.");
        const breakdown = await getBreakdown(
            {
                by: this._by,
                range: this._range,
                compare: this._compare,
                sort: { key: (state.sort?.key ?? "requests") as BreakdownSortKey, direction: state.sort?.direction ?? "desc" },
                page: state.page,
                pageSize: state.pageSize,
                query: state.query,
            },
            this.latency,
        );
        signal.throwIfAborted();
        return breakdown;
    }

    // The date range changed: every part reloads. The table goes back to page 1.
    #onDateRange(event: CustomEvent<{ value: UauiDateRange; compare?: UauiCompare }>) {
        this._range = event.detail.value;
        this._compare = event.detail.compare;
        this.#loadUsage();
        void this.#breakdown.reload({ resetPage: true });
    }

    // Group by only changes how the chart's points are bucketed.
    #onGroupBy(event: CustomEvent<{ value: UauiGroupBy }>) {
        this._groupBy = event.detail.value;
        this.#loadUsage();
    }

    // A tile was pressed: the chart plots that metric. Nothing is fetched, the buckets already hold every metric.
    #selectMetric(metric: Metric) {
        this._metric = metric;
    }

    #onBreakdownBy(event: CustomEvent<UauiToggleGroupChangeDetail>) {
        this._by = event.detail.value as BreakdownBy;
        void this.#breakdown.reload({ resetPage: true });
    }

    #tile(metric: Metric, icon: string, pick: (t: UsageTotals) => number) {
        const summary = this._usage?.summary;
        return html`<uaui-kpi-tile
            label=${metricLabels[metric]}
            icon=${icon}
            .value=${summary && this.#compact(pick(summary))}
            ?no-data=${summary !== undefined && !summary.requests}
            .current=${summary && pick(summary)}
            .previous=${this._usage?.compareSummary && pick(this._usage.compareSummary)}
            ?loading=${this._usageLoading}
            ?error=${this._usageError}
            selectable
            .deselectable=${false}
            .selected=${this._metric === metric}
            @selected=${() => this.#selectMetric(metric)}></uaui-kpi-tile>`;
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
        // A period with no requests has no rate or average: unknown, not 0, so there is nothing to compare either.
        const noData = now !== undefined && !now.requests;
        const comparable = !!now?.requests && !!before?.requests;
        const successRate = now && this.#successRate(now);
        const duration = now && this.#avgDuration(now);
        return html`<div class="tiles">
            ${this.#tile("requests", "icon-chart", (t) => t.requests)} ${this.#tile("inputTokens", "icon-inbox", (t) => t.inputTokens)}
            ${this.#tile("outputTokens", "icon-navigation-right", (t) => t.outputTokens)}
            ${this.#tile("totalTokens", "icon-coins", (t) => t.inputTokens + t.outputTokens)}
            <uaui-kpi-tile
                label="Success rate"
                icon="icon-check"
                .value=${successRate === undefined
                    ? undefined
                    : this.localize.number(successRate, { style: "percent", maximumFractionDigits: 1 })}
                ?no-data=${noData}
                .current=${comparable ? this.#successRate(now) * 100 : undefined}
                .previous=${comparable ? this.#successRate(before) * 100 : undefined}
                delta-unit="points"
                ?loading=${this._usageLoading}
                ?error=${this._usageError}></uaui-kpi-tile>
            <uaui-kpi-tile
                label="Avg duration"
                icon="icon-time"
                .value=${duration === undefined
                    ? undefined
                    : this.localize.number(duration / 1000, { style: "unit", unit: "second", maximumFractionDigits: 2 })}
                ?no-data=${noData}
                .current=${comparable ? this.#avgDuration(now) : undefined}
                .previous=${comparable ? this.#avgDuration(before) : undefined}
                lower-is-better
                ?loading=${this._usageLoading}
                ?error=${this._usageError}></uaui-kpi-tile>
        </div>`;
    }

    override render() {
        const usage = this._usage;
        return html`
            <div class="actions">
                <h2 class="uui-h3">Usage</h2>
                <div class="controls">
                    <uaui-group-by .value=${this._groupBy} @change=${this.#onGroupBy}></uaui-group-by>
                    <uaui-date-range today="2026-06-23" .value=${this._range} .compare=${this._compare} @change=${this.#onDateRange}></uaui-date-range>
                </div>
            </div>

            ${this.#tiles()}

            <uui-box headline="${metricLabels[this._metric]} over time" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-time-series-chart
                    kind="stacked-bar"
                    .series=${toSeries(this._metric, usage?.buckets)}
                    .compareSeries=${toSeries(this._metric, usage?.compareBuckets)}
                    .range=${this._range}
                    .compare=${this._compare}
                    .compareLabel=${this._compare ? uauiFormatDateRange(this.localize, this._compare) : undefined}
                    .groupBy=${this._groupBy}
                    ?loading=${this._usageLoading}
                    ?error=${this._usageError}
                    retryable
                    @retry=${() => this.#loadUsage()}></uaui-time-series-chart>
            </uui-box>

            <uui-box headline="Breakdown" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-toggle-group
                    slot="header-actions"
                    label="Break down by"
                    .value=${this._by}
                    .options=${breakdownOptions}
                    @change=${this.#onBreakdownBy}></uaui-toggle-group>
                <uaui-data-table
                    ${ref(this.#breakdown.attach)}
                    row-key="name"
                    .columns=${tableColumns(this._by)}>
                    <div slot="toolbar"><uaui-search-field></uaui-search-field></div>
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
            .tiles {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
                gap: var(--uui-size-space-4);
            }
        `,
    ];
}
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-ai-usage-page": ExampleAiUsagePageElement;
    }
}
