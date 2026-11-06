import { css, customElement, html, nothing, property, state, type PropertyValues } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbTextStyles } from "@umbraco-cms/backoffice/style";
import "../../../kpi-tile/kpi-tile.element.js";
import "../../../chart/time-series-chart.element.js";
import "../../../chart/category-chart.element.js";
import "../../../date-range/date-range.element.js";
import "../../../group-by/group-by.element.js";
import "../../../funnel/funnel.element.js";
import "../../../table/data-table.element.js";
import "../../../stat/stat.element.js";
import "../../../toggle-group/toggle-group.element.js";
import { UAUI_TABLE_CELL } from "../../../table/cells/cell-names.js";
import type { UauiCategory, UauiChartStack, UauiSeries } from "../../../chart/types.js";
import type { UauiToggleGroupOption } from "../../../toggle-group/toggle-group.element.js";
import { uauiCompareFor, uauiFormatDateRange } from "../../../date-helpers/index.js";
import type { UauiCompare, UauiDateRange } from "../../../date-range/types.js";
import type { UauiGroupBy } from "../../../group-by/group-by.element.js";
import type { UauiTableColumn } from "../../../table/index.js";
import {
    formsBucketed,
    formsHourSeries,
    formsHours,
    formsRateSeries,
    formsRows,
    formsSeries,
    formsSeriesBy,
    formsSteps,
    formsTotal,
} from "./forms-analytics-adapter.js";
import {
    FORMS,
    postOrigins,
    postOriginsOverview,
    postOverview,
    postRecordStates,
    postSubmissions,
    postSubmissionsByHour,
    postWorkflows,
    type FormsAnalyticsQuery,
    type FormsAnalyticsResult,
    type FormsColumn,
} from "./forms-fake-data.js";

// #region page
// A product localizes labels, headlines and column names with this.localize.term(...). The examples keep English for readability.
const COUNT: Intl.NumberFormatOptions = { maximumFractionDigits: 0 };
const PERCENT: Intl.NumberFormatOptions = { style: "unit", unit: "percent", maximumFractionDigits: 1 };

/** A rate in %, or undefined when there is nothing to divide by (no badge, no point). */
const rateOf = (part: number, whole: number) => (whole ? (part / whole) * 100 : undefined);

// Fixed dates keep the example's data, and its screenshots, the same on every day.
const initialRange: UauiDateRange = { from: "2026-05-25", to: "2026-06-23" };

/** Forms sends the editor's time zone with every query, so the server buckets days as the editor sees them. */
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

/**
 * The time dimension for unique members by group-by. Forms' API has only `date`: it answers days, and its client adds
 * days up into weeks and months, as this page does for entries and workflow errors (`formsBucketed`). Unique members
 * can't be added up (one member who submits on two days of a week is one member that week), so for them the page asks
 * the server for the bucket: `week` and `month` are proposed dimensions (see `ProposedColumn`).
 */
// Forms has no hourly dimension and this page doesn't offer "Hour", so `hour` only completes the record.
const membersDimension: Record<UauiGroupBy, FormsColumn> = { hour: "date", day: "date", week: "week", month: "month" };

/**
 * A Forms query for one range. Forms sends local wall-clock date-times (`yyyy-MM-ddTHH:mm:ss`) with the time zone,
 * and the server takes the day of each, both days included.
 */
const queryFor = (range: UauiDateRange, rest: Omit<FormsAnalyticsQuery, "startDate" | "endDate" | "timeZone">): FormsAnalyticsQuery => ({
    startDate: `${range.from}T00:00:00`,
    endDate: `${range.to}T00:00:00`,
    timeZone,
    ...rest,
});

/** The overview chart's answers: entries, workflow errors and runs by day (bucketed here), and unique members bucketed by the server. */
type Summary = { submissions: FormsAnalyticsResult; members: FormsAnalyticsResult };

type MetricId = "entries" | "uniqueMembers" | "failureRate";
type Metric = {
    id: MetricId;
    label: string;
    icon: string;
    format: Intl.NumberFormatOptions;
    /** A rate compares in percentage points, and a rise in it is bad. */
    rate?: boolean;
    /** Whether the tile's figure comes from the overview answer rather than the submissions answer. */
    fromOverview?: boolean;
    /** The period's figure from a submissions (or, with `fromOverview`, an overview) answer, or undefined when it has none. */
    total: (r: FormsAnalyticsResult) => number | undefined;
    /** The chart's series. */
    series: (s: Summary) => UauiSeries[];
};

// Tiles Forms doesn't show today, though its data has them. Each picks the overview chart's metric, so each needs a
// series over time (a row of tiles is all selectable or none). Entries plots Forms' own submissions chart: entries,
// and workflow errors in the danger colour.
const metrics: Metric[] = [
    {
        id: "entries",
        label: "Entries",
        icon: "icon-inbox",
        format: COUNT,
        total: (r) => formsTotal(r, "entries"),
        series: (s) =>
            formsSeries(s.submissions, [
                { column: "entries", label: "Entries" },
                { column: "workflowErrors", label: "Workflow errors", color: "danger" },
            ]),
    },
    {
        id: "uniqueMembers",
        label: "Unique members",
        icon: "icon-users",
        format: COUNT,
        // Distinct members over the whole range: the overview answer's own figure (Forms fills `uniqueMembers` there),
        // not the buckets added up.
        fromOverview: true,
        total: (r) => r.uniqueMembers,
        series: (s) => formsSeries(s.members, [{ column: "uniqueMembers", label: "Unique members" }]),
    },
    {
        id: "failureRate",
        label: "Workflow failure rate",
        icon: "icon-alert",
        format: PERCENT,
        rate: true,
        total: (r) => rateOf(formsTotal(r, "workflowErrors"), formsTotal(r, "triggered")),
        series: (s) => formsRateSeries(s.submissions, "failureRate", "Workflow failure rate", "workflowErrors", "triggered"),
    },
];

/**
 * What the overview's submissions query asks for. Forms' endpoint answers its first two metrics, entries and workflow
 * errors; `triggered` (workflow runs, for the failure rate) is a proposal for the Forms team (see PLAN.md, T62).
 */
const SUMMARY_METRICS: FormsColumn[] = ["entries", "workflowErrors", "triggered"];

/** Where a form's analytics open in the backoffice, as Forms links its overview table. */
const formUrl = (id: unknown) => `/umbraco/section/forms/workspace/forms-form/edit/${String(id)}/view/analytics`;
/** Where a source page opens in the backoffice. */
const documentUrl = (id: unknown) => `/umbraco/section/content/workspace/document/edit/${String(id)}`;

// Forms' overview table, from the overview endpoint's columns. Yes and no go in a status cell (the words carry the
// meaning, the color repeats it); "Retention days" is Forms' own text ("90 / Forever / 30": submitted, approved, rejected).
const overviewColumns: UauiTableColumn[] = [
    { key: "formName", label: "Form", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "formUrl" }, sortable: true, sortAs: "text", searchable: true },
    { key: "entries", label: "Entries", elementName: UAUI_TABLE_CELL.share, width: "20%", valueFormat: COUNT, sortable: true, sortAs: "number" },
    { key: "uniqueMembers", label: "Unique members", elementName: UAUI_TABLE_CELL.number, valueFormat: COUNT, align: "end", sortable: true, sortAs: "number" },
    { key: "workflowCount", label: "Workflows", elementName: UAUI_TABLE_CELL.number, valueFormat: COUNT, align: "end", sortable: true, sortAs: "number" },
    {
        key: "workflowErrors",
        label: "Workflow errors",
        elementName: UAUI_TABLE_CELL.number,
        valueFormat: COUNT,
        align: "end",
        sortable: true,
        sortAs: "number",
        meta: { lowerIsBetter: true },
    },
    { key: "storeRecords", label: "Stores records", elementName: UAUI_TABLE_CELL.status, meta: { textKey: "storeRecordsText", colorKey: "storeRecordsColor" } },
    { key: "retentionDays", label: "Retention days" },
    { key: "isMultiPage", label: "Multi-page", elementName: UAUI_TABLE_CELL.status, meta: { textKey: "isMultiPageText" } },
    { key: "sources", label: "Sources", elementName: UAUI_TABLE_CELL.number, valueFormat: COUNT, align: "end", sortable: true, sortAs: "number" },
];

// Forms' workflows table: triggered, success and failures, plus the failure rate in a status cell whose tone says how
// bad it is (none is positive, under 5% warning, 5% or more danger).
const workflowColumns: UauiTableColumn[] = [
    { key: "workflowName", label: "Workflow", sortable: true, sortAs: "text" },
    { key: "triggered", label: "Triggered", elementName: UAUI_TABLE_CELL.number, valueFormat: COUNT, align: "end", sortable: true, sortAs: "number" },
    { key: "success", label: "Success", elementName: UAUI_TABLE_CELL.number, valueFormat: COUNT, align: "end", sortable: true, sortAs: "number" },
    {
        key: "failures",
        label: "Failures",
        elementName: UAUI_TABLE_CELL.number,
        valueFormat: COUNT,
        align: "end",
        sortable: true,
        sortAs: "number",
        meta: { lowerIsBetter: true },
    },
    {
        key: "failureRate",
        label: "Failure rate",
        elementName: UAUI_TABLE_CELL.status,
        valueFormat: PERCENT,
        align: "end",
        sortable: true,
        sortAs: "number",
        meta: { colorKey: "failureRateColor" },
    },
];

// Forms' pages table under the origins chart: the page (a link to edit it), its URL (a link to the live page),
// entries and unique members.
const pageColumns: UauiTableColumn[] = [
    { key: "pageName", label: "Page", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "editUrl" }, sortable: true, sortAs: "text" },
    { key: "pageUrl", label: "URL", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "pageUrl" } },
    { key: "entries", label: "Entries", elementName: UAUI_TABLE_CELL.share, width: "25%", valueFormat: COUNT, sortable: true, sortAs: "number" },
    { key: "uniqueMembers", label: "Unique members", elementName: UAUI_TABLE_CELL.number, valueFormat: COUNT, align: "end", sortable: true, sortAs: "number" },
];

/** The funnel's steps, from the record states answer. */
const funnelStates = [
    { state: "opened", label: "Opened" },
    { state: "partiallySubmitted", label: "Partially submitted" },
    { state: "submitted", label: "Submitted" },
];

/** The failure rate's tone: none is positive, under 5% warning, 5% or more danger. */
const failureTone = (rate: number | undefined) => (rate === undefined ? "default" : rate === 0 ? "positive" : rate < 5 ? "warning" : "danger");

/** A workflows answer's rows, with the failure rate worked out (none when the workflow never ran). */
const workflowRows = (r: FormsAnalyticsResult | undefined) =>
    r
        ? formsRows(r).map((row) => {
              const failureRate = rateOf(Number(row.failures), Number(row.triggered));
              return { ...row, failureRate, failureRateColor: failureTone(failureRate) };
          })
        : [];

// One example arrangement, not the only layout: the package leaves layout to each product. Each section's boxes sit in
// a grid of at most two equal columns, and each box says whether it spans one column or both. Forms registers its
// form widgets by manifest with `meta.size` ("small" or "large"), which maps to the span. On a narrow page the grid has
// one column, so every box takes the full width whatever its span.
type BoxSpan = 1 | 2;
type OverviewBoxId = "submissions" | "forms";
type FormBoxId = "formSubmissions" | "byHour" | "workflows" | "funnel" | "origins";
const overviewBoxes: { id: OverviewBoxId; span: BoxSpan }[] = [
    { id: "submissions", span: 2 },
    { id: "forms", span: 2 },
];
const formBoxes: { id: FormBoxId; span: BoxSpan }[] = [
    { id: "formSubmissions", span: 2 },
    { id: "byHour", span: 2 },
    { id: "workflows", span: 1 },
    { id: "funnel", span: 1 },
    { id: "origins", span: 2 },
];

// The origins chart's switch: entries per page, or each page's share of the day's entries (a 100% chart).
const originViews: UauiToggleGroupOption[] = [
    { value: "normal", label: "Entries" },
    { value: "percent", label: "Share" },
];

/** The answers of the form section, for one range. */
type FormAnswers = { workflows: FormsAnalyticsResult; pages: FormsAnalyticsResult; states: FormsAnalyticsResult; hours: FormsAnalyticsResult };
type FormSeriesAnswers = { submissions: FormsAnalyticsResult; origins: FormsAnalyticsResult };

/**
 * Forms > Analytics, handled by this package: an actions row with the group-by and date range (with compare), then
 * the overview (KPI tiles that pick the metric of the submissions chart, and the forms overview table), then one
 * form's analytics, as on the form's Analytics tab (its submissions, submissions by hour of day, workflows, a funnel
 * of record states, and the source pages chart and table). Forms has these on two screens with a date range each; the
 * example puts them on one page under one date range. The origins chart switches between each page's entries and its
 * share of the day's entries.
 */
@customElement("example-forms-analytics-page")
export class ExampleFormsAnalyticsPageElement extends UmbLitElement {
    /** Milliseconds each request to the fake API takes. Raise it to see the loading states. */
    @property({ type: Number })
    latency = 150;

    /** Makes every request to the fake API fail, to show the error states and Retry. */
    @property({ type: Boolean })
    failing = false;

    @state() private _range: UauiDateRange = initialRange;
    @state() private _compare?: UauiCompare = uauiCompareFor("previous-period", initialRange);
    @state() private _groupBy: UauiGroupBy = "day";
    // The form section's two charts have their own group by, beside the form picker, so it sits with the charts it changes.
    @state() private _formGroupBy: UauiGroupBy = "day";
    @state() private _metric: MetricId = "entries";
    /** The origins chart: entries per page (`"normal"`) or each page's share of the day's entries (`"percent"`). */
    @state() private _originView: UauiChartStack = "normal";
    /** On the form's Analytics tab the form comes from the workspace; the example picks one. */
    @state() private _formId = FORMS[0].id;

    @state() private _summary?: Summary;
    @state() private _compareSummary?: Summary;
    @state() private _summaryLoading = true;
    @state() private _summaryError = false;

    @state() private _overview?: FormsAnalyticsResult;
    @state() private _compareOverview?: FormsAnalyticsResult;
    @state() private _overviewLoading = true;
    @state() private _overviewError = false;

    @state() private _formSeries?: FormSeriesAnswers;
    @state() private _compareFormSeries?: FormSeriesAnswers;
    @state() private _formSeriesLoading = true;
    @state() private _formSeriesError = false;

    @state() private _form?: FormAnswers;
    @state() private _compareForm?: FormAnswers;
    @state() private _formLoading = true;
    @state() private _formError = false;

    // Table rows, worked out once when an answer arrives rather than on every render.
    @state() private _overviewRows: Record<string, unknown>[] = [];
    @state() private _overviewCompareRows: Record<string, unknown>[] = [];
    @state() private _workflowRows: Record<string, unknown>[] = [];
    @state() private _workflowCompareRows: Record<string, unknown>[] = [];
    @state() private _pageRows: Record<string, unknown>[] = [];
    @state() private _pageCompareRows: Record<string, unknown>[] = [];

    // A newer request makes an older answer stale, so only the latest one is shown. A real fetch should also abort the
    // previous request (AbortController) and abort on disconnect, so nothing runs for a page that is gone.
    #summaryRequest = 0;
    #overviewRequest = 0;
    #formSeriesRequest = 0;
    #formRequest = 0;

    /** The hours of the day in the editor's culture, made again only when the language changes. */
    #hours?: { lang: string; categories: UauiCategory[] };

    /** The date range to open with, instead of the example's last 30 days. Compare starts as the previous period. */
    @property({ attribute: false })
    startRange?: UauiDateRange;

    override connectedCallback() {
        super.connectedCallback();
        if (this.startRange) {
            this._range = this.startRange;
            this._compare = uauiCompareFor("previous-period", this.startRange);
        }
        void this.#loadSummary();
        void this.#loadOverview();
        void this.#loadFormSeries();
        void this.#loadForm();
    }

    /** How each call to the fake API behaves. A real product passes its own request options here. */
    get #api() {
        return { latencyMs: this.latency, fail: this.failing };
    }

    // Compare is a second query for the comparison range, as Forms' analytics context sends it.
    async #both<T>(load: (range: UauiDateRange) => Promise<T>): Promise<[T, T | undefined]> {
        return Promise.all([load(this._range), this._compare ? load(this._compare) : undefined]);
    }

    // The overview's tiles and chart. A rejected request shows the error state, with Retry. A stale answer, or a stale
    // failure, is dropped either way.
    async #loadSummary() {
        const request = ++this.#summaryRequest;
        this._summaryLoading = true;
        this._summaryError = false;
        try {
            const groupBy = this._groupBy;
            const [summary, compare] = await this.#both(async (range): Promise<Summary> => {
                const [submissions, members] = await Promise.all([
                    postSubmissions(queryFor(range, { metrics: SUMMARY_METRICS, dimensions: ["date"] }), this.#api),
                    postSubmissions(queryFor(range, { metrics: ["uniqueMembers"], dimensions: [membersDimension[groupBy]] }), this.#api),
                ]);
                // Days to the group-by's buckets, as Forms' own chart does on the client. Only counts, which add up.
                return { submissions: formsBucketed(submissions, range, groupBy), members };
            });
            if (request !== this.#summaryRequest) return;
            this._summary = summary;
            this._compareSummary = compare;
        } catch {
            if (request !== this.#summaryRequest) return;
            this._summaryError = true;
        }
        this._summaryLoading = false;
    }

    // The forms overview table: the columns Forms' overview asks for. Group-by doesn't change it.
    async #loadOverview() {
        const request = ++this.#overviewRequest;
        this._overviewLoading = true;
        this._overviewError = false;
        try {
            const [overview, compare] = await this.#both((range) =>
                postOverview(
                    queryFor(range, {
                        dimensions: ["formId", "formName"],
                        metrics: ["entries", "uniqueMembers", "workflowCount", "workflowErrors", "storeRecords", "retentionDays", "isMultiPage", "sources"],
                        sort: "entries",
                    }),
                    this.#api,
                ),
            );
            if (request !== this.#overviewRequest) return;
            this._overview = overview;
            this._compareOverview = compare;
        } catch {
            if (request !== this.#overviewRequest) return;
            this._overviewError = true;
        }
        this._overviewLoading = false;
    }

    // The form's two charts, which follow the form section's group by.
    async #loadFormSeries() {
        const request = ++this.#formSeriesRequest;
        this._formSeriesLoading = true;
        this._formSeriesError = false;
        const formId = this._formId;
        const groupBy = this._formGroupBy;
        try {
            const [current, compare] = await this.#both(async (range): Promise<FormSeriesAnswers> => {
                const [submissions, origins] = await Promise.all([
                    postSubmissions(queryFor(range, { formId, metrics: ["entries", "workflowErrors"], dimensions: ["date"] }), this.#api),
                    postOrigins(queryFor(range, { formId, metrics: ["entries"], dimensions: ["date", "pageName"] }), this.#api),
                ]);
                return { submissions: formsBucketed(submissions, range, groupBy), origins: formsBucketed(origins, range, groupBy) };
            });
            if (request !== this.#formSeriesRequest) return;
            this._formSeries = current;
            this._compareFormSeries = compare;
        } catch {
            if (request !== this.#formSeriesRequest) return;
            this._formSeriesError = true;
        }
        this._formSeriesLoading = false;
    }

    // The form's workflows, record states, source pages and submissions by hour of day. Group-by doesn't change them.
    async #loadForm() {
        const request = ++this.#formRequest;
        this._formLoading = true;
        this._formError = false;
        const formId = this._formId;
        try {
            const [current, compare] = await this.#both(async (range): Promise<FormAnswers> => {
                const [workflows, pages, states, hours] = await Promise.all([
                    postWorkflows(queryFor(range, { formId, dimensions: ["workflowId", "workflowName"], metrics: ["triggered", "success", "failures"] }), this.#api),
                    postOriginsOverview(
                        queryFor(range, { formId, dimensions: ["pageId", "pageName", "pageUrl"], metrics: ["entries", "uniqueMembers"], sort: "entries" }),
                        this.#api,
                    ),
                    postRecordStates(queryFor(range, { formId, dimensions: ["state"], metrics: ["entries"] }), this.#api),
                    postSubmissionsByHour(queryFor(range, { formId, dimensions: ["hour"], metrics: ["entries"] }), this.#api),
                ]);
                return { workflows, pages, states, hours };
            });
            if (request !== this.#formRequest) return;
            this._form = current;
            this._compareForm = compare;
        } catch {
            if (request !== this.#formRequest) return;
            this._formError = true;
        }
        this._formLoading = false;
    }

    override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        if (changed.has("_overview" as keyof ExampleFormsAnalyticsPageElement) || changed.has("_compareOverview" as keyof ExampleFormsAnalyticsPageElement)) {
            this._overviewRows = (this._overview ? formsRows(this._overview) : []).map((row) => ({
                ...row,
                formUrl: formUrl(row.formId),
                storeRecordsText: row.storeRecords ? "Yes" : "No",
                // Entries of a form that doesn't store records are gone once the workflows ran: worth a second look.
                storeRecordsColor: row.storeRecords ? "positive" : "warning",
                isMultiPageText: row.isMultiPage ? "Yes" : "No",
            }));
            // The number of workflows is a setting, not something that happened in the period, so it gets no change
            // badge: the compare rows leave it out.
            this._overviewCompareRows = (this._compareOverview ? formsRows(this._compareOverview) : []).map((row) => {
                delete row.workflowCount;
                return row;
            });
        }
        if (changed.has("_form" as keyof ExampleFormsAnalyticsPageElement) || changed.has("_compareForm" as keyof ExampleFormsAnalyticsPageElement)) {
            this._workflowRows = workflowRows(this._form?.workflows);
            this._workflowCompareRows = workflowRows(this._compareForm?.workflows);
            this._pageRows = (this._form ? formsRows(this._form.pages) : []).map((row) => ({ ...row, editUrl: documentUrl(row.pageId) }));
            this._pageCompareRows = this._compareForm ? formsRows(this._compareForm.pages) : [];
        }
    }

    // The date range updates every part.
    #onRangeChange(e: CustomEvent<{ value: UauiDateRange; compare?: UauiCompare }>) {
        this._range = e.detail.value;
        this._compare = e.detail.compare;
        void this.#loadSummary();
        void this.#loadOverview();
        void this.#loadFormSeries();
        void this.#loadForm();
    }

    // Group by changes the buckets of the charts only: the tables and the funnel keep theirs.
    #onGroupByChange(e: CustomEvent<{ value: UauiGroupBy }>) {
        this._groupBy = e.detail.value;
        void this.#loadSummary();
    }

    #onFormGroupByChange(e: CustomEvent<{ value: UauiGroupBy }>) {
        this._formGroupBy = e.detail.value;
        void this.#loadFormSeries();
    }

    #onOriginViewChange(e: CustomEvent<{ value: string }>) {
        this._originView = e.detail.value === "percent" ? "percent" : "normal";
    }

    #onFormChange(e: Event) {
        this._formId = String((e.target as HTMLSelectElement).value);
        void this.#loadFormSeries();
        void this.#loadForm();
    }

    // A tile was pressed: the chart plots that metric. Nothing is fetched, the submissions answer holds every metric.
    #selectMetric(metric: MetricId) {
        this._metric = metric;
    }

    /** No entries in the range: the tiles say "no data" and the chart shows its empty state, rather than 0. */
    #noEntries(r: FormsAnalyticsResult | undefined) {
        return r !== undefined && formsTotal(r, "entries") === 0;
    }

    #renderTile(metric: Metric) {
        // Unique members come from the overview answer, so that tile loads and fails with the forms table.
        const [summary, compare, loading, error] = metric.fromOverview
            ? [this._overview, this._compareOverview, this._overviewLoading, this._overviewError]
            : [this._summary?.submissions, this._compareSummary?.submissions, this._summaryLoading, this._summaryError];
        const value = summary ? metric.total(summary) : undefined;
        const previous = compare && !this.#noEntries(compare) ? metric.total(compare) : undefined;
        return html`<uaui-kpi-tile
            label=${metric.label}
            icon=${metric.icon}
            .value=${value}
            .valueFormat=${metric.format}
            ?no-data=${summary !== undefined && (value === undefined || this.#noEntries(summary))}
            .previous=${previous}
            delta-unit=${metric.rate ? "points" : "percent"}
            ?lower-is-better=${metric.rate}
            ?loading=${loading}
            ?error=${error}
            selectable
            .deselectable=${false}
            .selected=${this._metric === metric.id}
            @selected=${() => this.#selectMetric(metric.id)}></uaui-kpi-tile>`;
    }

    #chartSeries(metric: Metric, s: Summary | undefined) {
        return s && !this.#noEntries(s.submissions) ? metric.series(s) : [];
    }

    get #hourCategories(): UauiCategory[] {
        const lang = this.localize.lang();
        if (this.#hours?.lang !== lang) this.#hours = { lang, categories: formsHours(lang) };
        return this.#hours.categories;
    }

    #compareLabel() {
        return this._compare ? uauiFormatDateRange(this.localize, this._compare) : undefined;
    }

    #renderOverviewBoxes() {
        const metric = metrics.find((m) => m.id === this._metric)!;
        // Forms calls its chart "Submissions"; the other tiles name it after their metric.
        const headline = metric.id === "entries" ? "Submissions" : metric.label;
        const rendered: Record<OverviewBoxId, unknown> = {
            submissions: html`<uui-box headline=${headline} headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-group-by slot="header-actions" .value=${this._groupBy} @change=${this.#onGroupByChange}></uaui-group-by>
                <uaui-time-series-chart
                    kind="line"
                    .series=${this.#chartSeries(metric, this._summary)}
                    .compareSeries=${this.#chartSeries(metric, this._compareSummary)}
                    .range=${this._range}
                    .compare=${this._compare}
                    .compareLabel=${this.#compareLabel()}
                    .groupBy=${this._groupBy}
                    .valueFormat=${metric.format}
                    ?lower-is-better=${metric.rate}
                    ?loading=${this._summaryLoading}
                    ?error=${this._summaryError}
                    retryable
                    @retry=${() => this.#loadSummary()}></uaui-time-series-chart>
            </uui-box>`,
            forms: html`<uui-box headline="Forms" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-data-table
                    label="Forms"
                    row-key="formId"
                    .columns=${overviewColumns}
                    .rows=${this._overviewRows}
                    .compareRows=${this._overviewCompareRows}
                    page-size="10"
                    empty-headline="No forms"
                    ?loading=${this._overviewLoading}
                    ?error=${this._overviewError}
                    retryable
                    @retry=${() => this.#loadOverview()}></uaui-data-table>
            </uui-box>`,
        };
        return html`<div class="boxes" data-section="overview">
            ${overviewBoxes.map((b) => html`<div class=${b.span === 2 ? "box span-2" : "box"} data-box=${b.id}>${rendered[b.id]}</div>`)}
        </div>`;
    }

    // The pane recipe: the share of opened forms that were submitted goes in the box header, in points against last period.
    #renderFunnel() {
        const steps = formsSteps(this._form?.states, funnelStates);
        const compareSteps = formsSteps(this._compareForm?.states, funnelStates);
        // A single-page form has no "partially submitted" step, so the last step is submitted either way.
        const completion = steps.length ? rateOf(steps[steps.length - 1].value, steps[0].value) : undefined;
        const compare = this._compare;
        return html`<uui-box headline="Completion" headline-variant="h3" style="--uui-box-default-padding: 0">
            ${completion === undefined || this._formError
                ? nothing
                : html`<uaui-stat
                      slot="header-actions"
                      layout="inline"
                      label="Submitted"
                      .value=${completion}
                      .valueFormat=${PERCENT}
                      .previous=${compareSteps.length ? rateOf(compareSteps[compareSteps.length - 1].value, compareSteps[0].value) : undefined}
                      delta-unit="points"></uaui-stat>`}
            <uaui-funnel
                .steps=${steps}
                .compareSteps=${compareSteps}
                current-label=${uauiFormatDateRange(this.localize, this._range)}
                compare-label=${compare ? uauiFormatDateRange(this.localize, compare) : nothing}
                .valueFormat=${COUNT}
                ?loading=${this._formLoading}
                ?error=${this._formError}
                retryable
                @retry=${() => this.#loadForm()}></uaui-funnel>
        </uui-box>`;
    }

    #renderFormBoxes() {
        const series = this._formSeries;
        const compareSeries = this._compareFormSeries;
        const submissions = (r?: FormsAnalyticsResult) =>
            r && !this.#noEntries(r)
                ? formsSeries(r, [
                      { column: "entries", label: "Entries" },
                      { column: "workflowErrors", label: "Workflow errors", color: "danger" },
                  ])
                : [];
        const rendered: Record<FormBoxId, unknown> = {
            formSubmissions: html`<uui-box headline="Submissions" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-time-series-chart
                    kind="line"
                    .series=${submissions(series?.submissions)}
                    .compareSeries=${submissions(compareSeries?.submissions)}
                    .range=${this._range}
                    .compare=${this._compare}
                    .compareLabel=${this.#compareLabel()}
                    .groupBy=${this._formGroupBy}
                    .valueFormat=${COUNT}
                    ?loading=${this._formSeriesLoading}
                    ?error=${this._formSeriesError}
                    retryable
                    @retry=${() => this.#loadFormSeries()}></uaui-time-series-chart>
            </uui-box>`,
            // The range's entries by the hour of day they came in: the 24 hours are the x-axis, labelled in the editor's
            // culture. Compare puts last period's hours behind them.
            byHour: html`<uui-box headline="Submissions by hour of day" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-category-chart
                    .categories=${this.#hourCategories}
                    .series=${formsHourSeries(this._form?.hours, "entries", "Entries")}
                    .compareSeries=${formsHourSeries(this._compareForm?.hours, "entries", "Entries")}
                    .compareLabel=${this.#compareLabel()}
                    category-label="Hour of day"
                    .valueFormat=${COUNT}
                    ?loading=${this._formLoading}
                    ?error=${this._formError}
                    retryable
                    @retry=${() => this.#loadForm()}></uaui-category-chart>
            </uui-box>`,
            workflows: html`<uui-box headline="Workflows" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-data-table
                    label="Workflows"
                    row-key="workflowId"
                    .columns=${workflowColumns}
                    .rows=${this._workflowRows}
                    .compareRows=${this._workflowCompareRows}
                    empty-headline="This form has no workflows"
                    ?loading=${this._formLoading}
                    ?error=${this._formError}
                    retryable
                    @retry=${() => this.#loadForm()}></uaui-data-table>
            </uui-box>`,
            funnel: this.#renderFunnel(),
            // One line per source page, or in the share view one band per page stacked to 100%. No compare lines
            // here: with a line per page they would double the lines, and the pages table below compares each page's
            // entries instead. With more than eight pages the colours repeat and the legend folds; the pages come
            // largest first, so the fold hides the smallest.
            origins: html`<uui-box headline="Origins by source page" headline-variant="h3" style="--uui-box-default-padding: 0">
                <uaui-toggle-group
                    slot="header-actions"
                    label="Show"
                    .options=${originViews}
                    .value=${this._originView}
                    @change=${this.#onOriginViewChange}></uaui-toggle-group>
                <uaui-time-series-chart
                    kind=${this._originView === "percent" ? "area" : "line"}
                    stack=${this._originView}
                    .series=${series && !this.#noEntries(series.submissions) ? formsSeriesBy(series.origins, "pageName", "entries") : []}
                    .range=${this._range}
                    .groupBy=${this._formGroupBy}
                    .valueFormat=${COUNT}
                    ?loading=${this._formSeriesLoading}
                    ?error=${this._formSeriesError}
                    retryable
                    @retry=${() => this.#loadFormSeries()}></uaui-time-series-chart>
                <uaui-data-table
                    label="Source pages"
                    row-key="pageId"
                    .columns=${pageColumns}
                    .rows=${this._pageRows}
                    .compareRows=${this._pageCompareRows}
                    empty-headline="No source pages in this period"
                    ?loading=${this._formLoading}
                    ?error=${this._formError}
                    retryable
                    @retry=${() => this.#loadForm()}></uaui-data-table>
            </uui-box>`,
        };
        return html`<div class="boxes" data-section="form">
            ${formBoxes.map((b) => html`<div class=${b.span === 2 ? "box span-2" : "box"} data-box=${b.id}>${rendered[b.id]}</div>`)}
        </div>`;
    }

    override render() {
        return html`
            <umb-body-layout headline="Analytics">
                <div slot="action-menu" class="actions">
                    <uaui-date-range today="2026-06-23" .value=${this._range} .compare=${this._compare} @change=${this.#onRangeChange}></uaui-date-range>
                </div>

                <div class="content">
                    <div class="kpis">${metrics.map((m) => this.#renderTile(m))}</div>

                    ${this.#renderOverviewBoxes()}

                    <div class="section">
                        <h2 class="uui-h3">Form analytics</h2>
                        <uui-select
                            label="Form"
                            .options=${FORMS.map((f) => ({ name: f.name, value: f.id, selected: f.id === this._formId }))}
                            .value=${this._formId}
                            @change=${this.#onFormChange}></uui-select>
                        <uaui-group-by .value=${this._formGroupBy} @change=${this.#onFormGroupByChange}></uaui-group-by>
                    </div>

                    ${this.#renderFormBoxes()}
                </div>

                <uui-breadcrumbs slot="footer-info">
                    <uui-breadcrumb-item href="#">Forms</uui-breadcrumb-item>
                    <uui-breadcrumb-item last-item>Analytics</uui-breadcrumb-item>
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
                /* The box grid picks one or two columns from the page's own width, not the window's. */
                container-type: inline-size;
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
            /* The form picker's row, partway down the page. */
            .section {
                display: flex;
                align-items: center;
                gap: var(--uui-size-4);
                margin-top: var(--uui-size-layout-1);
            }
            /* UUI's .uui-h3 (written .uui-h3.uui-h3, so a plain h2 rule loses) adds a 24px bottom margin, which pushed the title above the controls' centre. Keep its -2px optical inset. */
            .section h2.uui-h3 {
                margin-block: 0;
                margin-inline-end: auto;
            }
            .kpis {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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
        `,
    ];
}
// #endregion

declare global {
    interface HTMLElementTagNameMap {
        "example-forms-analytics-page": ExampleFormsAnalyticsPageElement;
    }
}
