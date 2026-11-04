import { css, customElement, html, ifDefined, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import "../../../kpi-tile/kpi-tile.element.js";
import "../../../chart/time-series-chart.element.js";
import "../../../table/data-table.element.js";
import "../../../stat/stat.element.js";
import "../../../toggle-group/toggle-group.element.js";
import { UAUI_TABLE_CELL } from "../../../table/cells/cell-names.js";
import type { UauiChartScale } from "../../../chart/types.js";
import type { UauiStatusColor } from "../../../theme/types.js";
import type { UauiTableColumn } from "../../../table/index.js";
import type { UauiToggleGroupOption } from "../../../toggle-group/toggle-group.element.js";
import {
    workflowApprovalTimes,
    workflowHistoryRows,
    workflowIsEmpty,
    workflowSeries,
    workflowChartToday,
    workflowStatusCodes,
    type WorkflowApprovalTimes,
    type WorkflowStatusId,
} from "./workflow-dashboard-adapter.js";
import { getActivity, getInstances, getReviews, type WorkflowActivityResponse, type WorkflowReviewsResponse } from "./workflow-fake-data.js";

// #region page
// A product localizes labels, headlines and column names with this.localize.term(...). The examples keep English for readability.
const COUNT: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };

/** The statuses with a tile, in Workflow's order. Each tile opens the history filtered by its status. */
type TileStatus = "approved" | "pending" | "rejected" | "cancelled";
const tiles: { status: TileStatus; label: string; icon: string; color: UauiStatusColor }[] = [
    { status: "approved", label: "Approved", icon: "icon-check", color: "positive" },
    { status: "pending", label: "Pending", icon: "icon-time", color: "warning" },
    { status: "rejected", label: "Rejected", icon: "icon-wrong", color: "danger" },
    { status: "cancelled", label: "Cancelled", icon: "icon-block", color: "default" },
];

/** What the history's status cell says for each status. */
const statusText: Record<WorkflowStatusId, string> = {
    approved: "Approved",
    pending: "Pending",
    rejected: "Rejected",
    cancelled: "Cancelled",
    errored: "Errored",
    notRequired: "Not required",
};

const typeText = { publish: "Publish", unpublish: "Unpublish" };

/** The period picker: Workflow's dashboard looks back a number of days from today. */
const periods: UauiToggleGroupOption[] = [
    { value: "7", label: "7 days" },
    { value: "30", label: "30 days" },
    { value: "90", label: "90 days" },
];

/** How far ahead the content review chart looks: reviews due in the next two weeks. */
const REVIEWS_AHEAD = 14;

const scales: UauiToggleGroupOption[] = [
    { value: "log", label: "Log" },
    { value: "linear", label: "Linear" },
];

/** The history's status filter. "All" asks for every status. */
type HistoryFilter = TileStatus | "all";
const historyFilters: { value: HistoryFilter; name: string }[] = [
    { value: "all", name: "All statuses" },
    ...tiles.map((t) => ({ value: t.status, name: t.label })),
];

/** Where a document opens in the backoffice. */
const documentUrl = (key: unknown) => `/umbraco/section/content/workspace/document/edit/${String(key)}`;

// The history table: the document (a link to edit it), type, who asked and when, when it finished, how many approval
// steps are done ("2 of 3", the progress cell), and the status in a status cell (the words carry the meaning, the
// colour repeats it).
const historyColumns: UauiTableColumn[] = [
    { key: "document", label: "Document", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "documentUrl" }, sortable: true, sortAs: "text", searchable: true },
    { key: "typeText", label: "Type" },
    { key: "requestedBy", label: "Requested by", sortable: true, sortAs: "text", searchable: true },
    { key: "requestedOn", label: "Requested", elementName: UAUI_TABLE_CELL.date, sortable: true, sortAs: "date" },
    { key: "completedOn", label: "Completed", elementName: UAUI_TABLE_CELL.date, sortable: true, sortAs: "date" },
    { key: "currentStep", label: "Steps", elementName: UAUI_TABLE_CELL.progress, valueFormat: COUNT, meta: { totalKey: "totalSteps" }, sortable: true, sortAs: "number" },
    { key: "status", label: "Status", elementName: UAUI_TABLE_CELL.status, meta: { textKey: "statusText", colorKey: "statusColor" }, sortable: true, sortAs: "text" },
];

/**
 * Umbraco Workflow's admin dashboard, handled by this package: a period picker; status tiles (approved, pending,
 * rejected, cancelled) in their status colours, each opening the history filtered by its status; the approval
 * activity chart (approved, rejected and cancelled as daily bars, pending as a running-total line over them, a today
 * line, and a log or linear y-axis) with the fastest, slowest and average approval time; the content review chart
 * (reviews due each day, back and ahead of today); and the workflow history table with a status filter.
 */
@customElement("example-workflow-dashboard-page")
export class ExampleWorkflowDashboardPageElement extends UmbLitElement {
    /** Milliseconds each request to the fake API takes. Raise it to see the loading states. */
    @property({ type: Number })
    latency = 150;

    /** Makes every request to the fake API fail, to show the error states and Retry. */
    @property({ type: Boolean })
    failing = false;

    @state() private _days = 30;
    @state() private _scale: UauiChartScale = "log";
    @state() private _filter: HistoryFilter = "all";

    @state() private _activity?: WorkflowActivityResponse;
    @state() private _times?: WorkflowApprovalTimes;
    @state() private _activityLoading = true;
    @state() private _activityError = false;

    @state() private _reviews?: WorkflowReviewsResponse;
    @state() private _reviewsLoading = true;
    @state() private _reviewsError = false;

    @state() private _historyRows: Record<string, unknown>[] = [];
    @state() private _historyLoading = true;
    @state() private _historyError = false;

    // A newer request makes an older answer stale, so only the latest one is shown. A real fetch should also abort the
    // previous request (AbortController) and abort on disconnect.
    #activityRequest = 0;
    #reviewsRequest = 0;
    #historyRequest = 0;

    /**
     * The editor's time zone, sent with every query: the server buckets the chart days, and writes `today` and the
     * history's date-times, as the editor sees them. Today comes from each chart answer (`workflowChartToday`), never
     * from the browser's clock, so it is always one of the answer's days.
     */
    #timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    override connectedCallback() {
        super.connectedCallback();
        void this.#loadActivity();
        void this.#loadReviews();
        void this.#loadHistory();
    }

    /** How each call to the fake API behaves. A real product passes its own request options here. */
    get #api() {
        return { latencyMs: this.latency, fail: this.failing };
    }

    // The tiles, the activity chart and the approval times. The times come from the instances of the period, every
    // status, so they don't follow the history's filter.
    async #loadActivity() {
        const request = ++this.#activityRequest;
        this._activityLoading = true;
        this._activityError = false;
        try {
            const [activity, instances] = await Promise.all([getActivity({ days: this._days, timeZone: this.#timeZone }, this.#api), getInstances({ days: this._days, timeZone: this.#timeZone }, this.#api)]);
            if (request !== this.#activityRequest) return;
            this._activity = activity;
            this._times = workflowApprovalTimes(instances.items);
        } catch {
            if (request !== this.#activityRequest) return;
            this._activityError = true;
        }
        this._activityLoading = false;
    }

    async #loadReviews() {
        const request = ++this.#reviewsRequest;
        this._reviewsLoading = true;
        this._reviewsError = false;
        try {
            const reviews = await getReviews({ days: this._days, ahead: REVIEWS_AHEAD, timeZone: this.#timeZone }, this.#api);
            if (request !== this.#reviewsRequest) return;
            this._reviews = reviews;
        } catch {
            if (request !== this.#reviewsRequest) return;
            this._reviewsError = true;
        }
        this._reviewsLoading = false;
    }

    // The history, filtered on the server by status, as Workflow's history filters are.
    async #loadHistory() {
        const request = ++this.#historyRequest;
        this._historyLoading = true;
        this._historyError = false;
        try {
            // Pending is two codes (pending approval and resubmitted), as on its tile.
            const statuses = this._filter === "all" ? undefined : workflowStatusCodes(this._filter);
            const answer = await getInstances({ days: this._days, statuses, timeZone: this.#timeZone }, this.#api);
            if (request !== this.#historyRequest) return;
            this._historyRows = workflowHistoryRows(answer.items).map((row) => ({
                ...row,
                documentUrl: documentUrl(row.nodeKey),
                typeText: typeText[row.type],
                statusText: statusText[row.status],
            }));
        } catch {
            if (request !== this.#historyRequest) return;
            this._historyError = true;
        }
        this._historyLoading = false;
    }

    #onPeriodChange(e: CustomEvent<{ value: string }>) {
        this._days = Number(e.detail.value);
        void this.#loadActivity();
        void this.#loadReviews();
        void this.#loadHistory();
    }

    #onScaleChange(e: CustomEvent<{ value: string }>) {
        this._scale = e.detail.value === "linear" ? "linear" : "log";
    }

    #onFilterChange(e: Event) {
        this._filter = String((e.target as HTMLSelectElement).value) as HistoryFilter;
        void this.#loadHistory();
    }

    // A tile was opened: the history below shows that status only, and focus moves to its filter, so a keyboard or
    // screen reader user lands where the list changed. A product with a separate history view would give each tile an
    // `href` to that view, filtered, instead.
    async #openStatus(status: TileStatus) {
        this._filter = status;
        void this.#loadHistory();
        await this.updateComplete;
        const filter = this.shadowRoot?.querySelector<HTMLElement>("[data-box='history'] uui-select");
        filter?.scrollIntoView({ block: "nearest" });
        filter?.focus();
    }

    /** A duration as a stat, formatted in the editor's culture: minutes under an hour, hours under two days, else days. */
    #durationStat(label: string, ms: number) {
        const minutes = ms / 60_000;
        const [value, unit] = minutes < 60 ? [minutes, "minute"] : minutes < 48 * 60 ? [minutes / 60, "hour"] : [minutes / (24 * 60), "day"];
        const format: Intl.NumberFormatOptions = { style: "unit", unit, unitDisplay: "long", maximumFractionDigits: unit === "minute" ? 0 : 1 };
        return html`<uaui-stat label=${label} .value=${value} .valueFormat=${format}></uaui-stat>`;
    }

    #renderTile(tile: (typeof tiles)[number]) {
        const totals = this._activity?.totals;
        const value = totals ? totals[tile.status] : undefined;
        return html`<uaui-kpi-tile
            label=${tile.label}
            icon=${tile.icon}
            color=${tile.color}
            .value=${value}
            .valueFormat=${COUNT}
            ?loading=${this._activityLoading}
            ?error=${this._activityError}
            openable
            @open=${() => this.#openStatus(tile.status)}></uaui-kpi-tile>`;
    }

    // Fastest, slowest and average approval time. With no finished approval in the period there is no time to show,
    // which the box says in words rather than three dashes.
    #renderTimes() {
        if (this._activityError) return nothing;
        const times = this._times;
        // While loading, as the tiles do: no figures of the period before, which would read as the new one's.
        if (this._activityLoading)
            return html`<div class="times-loading" role="progressbar" aria-label=${this.localize.term("general_loading")}><uui-loader-bar></uui-loader-bar></div>`;
        if (!times || times.count === 0) return html`<p class="times-none">No approvals finished in this period.</p>`;
        return html`<div class="times" role="group" aria-label="Approval time">
            ${this.#durationStat("Fastest approval", times.fastest!)} ${this.#durationStat("Average approval", times.average!)}
            ${this.#durationStat("Slowest approval", times.slowest!)}
        </div>`;
    }

    #renderActivity() {
        const series = this._activity && !workflowIsEmpty(this._activity.series) ? this._activity.series : undefined;
        return html`<uui-box headline="Approval activity" headline-variant="h3" style="--uui-box-default-padding: 0">
            <uaui-toggle-group slot="header-actions" label="Y-axis scale" .options=${scales} .value=${this._scale} @change=${this.#onScaleChange}></uaui-toggle-group>
            ${this.#renderTimes()}
            <uaui-time-series-chart
                kind="bar"
                y-scale=${this._scale}
                today=${ifDefined(workflowChartToday(this._activity))}
                .series=${workflowSeries(series, [
                    { name: "approved", label: "Approved", color: "positive" },
                    { name: "rejected", label: "Rejected", color: "danger" },
                    { name: "cancelled", label: "Cancelled", color: "default" },
                    // Waiting at the end of each day: a running total, so a line over the daily bars.
                    { name: "pending", label: "Pending", color: "warning", kind: "line" },
                ])}
                .valueFormat=${COUNT}
                empty-headline="No workflow activity in this period"
                ?loading=${this._activityLoading}
                ?error=${this._activityError}
                retryable
                @retry=${() => this.#loadActivity()}></uaui-time-series-chart>
        </uui-box>`;
    }

    // Reviews due each day: reviewed and overdue up to today, upcoming after it, stacked, so each bar is the day's due count.
    #renderReviews() {
        const series = this._reviews && !workflowIsEmpty(this._reviews.series) ? this._reviews.series : undefined;
        return html`<uui-box headline="Content reviews" headline-variant="h3" style="--uui-box-default-padding: 0">
            <uaui-time-series-chart
                kind="stacked-bar"
                today=${ifDefined(workflowChartToday(this._reviews))}
                .series=${workflowSeries(series, [
                    { name: "reviewed", label: "Reviewed", color: "positive" },
                    { name: "overdue", label: "Overdue", color: "danger" },
                    { name: "upcoming", label: "Upcoming", color: 1 },
                ])}
                .valueFormat=${COUNT}
                empty-headline="No content reviews due"
                ?loading=${this._reviewsLoading}
                ?error=${this._reviewsError}
                retryable
                @retry=${() => this.#loadReviews()}></uaui-time-series-chart>
        </uui-box>`;
    }

    #renderHistory() {
        return html`<uui-box headline="Workflow history" headline-variant="h3" style="--uui-box-default-padding: 0">
            <uui-select
                slot="header-actions"
                label="Status"
                .options=${historyFilters.map((f) => ({ name: f.name, value: f.value, selected: f.value === this._filter }))}
                .value=${this._filter}
                @change=${this.#onFilterChange}></uui-select>
            <uaui-data-table
                label="Workflow history"
                row-key="key"
                .columns=${historyColumns}
                .rows=${this._historyRows}
                page-size="10"
                reset-page-on-rows
                empty-headline="No workflows match this filter"
                ?loading=${this._historyLoading}
                ?error=${this._historyError}
                retryable
                @retry=${() => this.#loadHistory()}></uaui-data-table>
        </uui-box>`;
    }

    override render() {
        return html`
            <umb-body-layout headline="Workflow">
                <div slot="action-menu" class="actions">
                    <uaui-toggle-group label="Period" .options=${periods} .value=${String(this._days)} @change=${this.#onPeriodChange}></uaui-toggle-group>
                </div>

                <div class="content">
                    <div class="kpis">${tiles.map((t) => this.#renderTile(t))}</div>

                    <div class="box" data-box="activity">${this.#renderActivity()}</div>
                    <div class="box" data-box="reviews">${this.#renderReviews()}</div>
                    <div class="box" data-box="history">${this.#renderHistory()}</div>
                </div>

                <uui-breadcrumbs slot="footer-info">
                    <uui-breadcrumb-item href="#">Content</uui-breadcrumb-item>
                    <uui-breadcrumb-item last-item>Workflow</uui-breadcrumb-item>
                </uui-breadcrumbs>
            </umb-body-layout>
        `;
    }

    static override styles = [
        UmbTextStyles,
        css`
            /* Fills the space the backoffice gives the view, so umb-body-layout keeps its header and footer in place while the content scrolls. */
            :host {
                display: block;
                height: 100%;
            }
            .content {
                display: flex;
                flex-direction: column;
                gap: var(--uui-size-4);
            }
            /* Inset from the footer's edge, as the backoffice's umb-workspace-breadcrumb is. */
            uui-breadcrumbs {
                margin-inline-start: var(--uui-size-layout-1);
            }
            /* The page-wide controls, in the header's action-menu slot. */
            .actions {
                display: flex;
                align-items: center;
                gap: var(--uui-size-4);
                padding-inline-end: var(--uui-size-layout-1);
            }
            .kpis {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: var(--uui-size-space-5);
            }
            .box {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                min-width: 0;
            }
            .times {
                display: flex;
                flex-wrap: wrap;
                gap: var(--uui-size-layout-2);
                padding: var(--uui-size-space-5) var(--uui-size-space-5) 0;
            }
            .times-loading {
                padding: var(--uui-size-space-5) var(--uui-size-space-5) 0;
            }
            .times-none {
                margin: 0;
                padding: var(--uui-size-space-5) var(--uui-size-space-5) 0;
                color: var(--uui-color-text-alt);
            }
        `,
    ];
}
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-workflow-dashboard-page": ExampleWorkflowDashboardPageElement;
    }
}
