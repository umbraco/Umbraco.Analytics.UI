// Example only: a made-up Umbraco Forms install that answers like Forms' analytics API would. A real product calls its
// own endpoints here. Everything is worked out from the date, so the same range always gives the same numbers.
// The shapes follow Forms' Management API (Umbraco.Forms.Web/Api/ManagementApi/Analytics): every endpoint is a POST
// that takes an `AnalyticsQueryGet` and answers an `AnalyticsQueryResult`, a table of `columns` and `rows`, with
// paging fields and `uniqueMembers`. Values are raw (counts, booleans, ISO date-times); the page formats them.
import { uauiDateBuckets } from "../../../date-helpers/index.js";
import type { UauiDateRange } from "../../../date-range/types.js";
import type { UauiGroupBy } from "../../../group-by/group-by.element.js";
import { wait } from "../fake-latency.js";

/**
 * A column of an answer: Forms' `Column` enum, which its `Metric` and `Dimension` enums are drawn from. Forms
 * serializes it as its name (`JsonStringEnumConverter`).
 */
export type FormsColumn =
    | "entries"
    | "workflowErrors"
    | "workflowCount"
    | "formId"
    | "formName"
    | "storeRecords"
    | "retentionDays"
    | "isMultiPage"
    | "sources"
    | "pageId"
    | "pageName"
    | "pageUrl"
    | "workflowId"
    | "workflowName"
    | "triggered"
    | "failures"
    | "success"
    | "date"
    | "hour"
    | "uniqueMembers"
    // Not in Forms today, proposed by this example (see `ProposedColumn`).
    | ProposedColumn;

/**
 * Columns this example asks for that Forms' API doesn't have yet. Its data has them: they would be new enum values.
 * - `week` and `month`: date dimensions, for unique members only. Forms answers days and its client adds them up into
 *   weeks and months, which is right for entries but not for unique members: one member who submits on two days of a
 *   week is one unique member that week. Only the submissions endpoint answers them here.
 * - `state`: a record state dimension (Forms' `FormState`: opened, partially submitted, submitted), for the funnel.
 */
export type ProposedColumn = "week" | "month" | "state";

/** Forms' `AnalyticsQueryGet`: what every analytics endpoint takes. Dates are local wall-clock date-times (`yyyy-MM-ddTHH:mm:ss`), sent with the time zone. */
export type FormsAnalyticsQuery = {
    startDate: string;
    endDate: string;
    /** The editor's time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`), so the server buckets days as the editor sees them. */
    timeZone?: string;
    metrics: FormsColumn[];
    dimensions: FormsColumn[];
    sort?: FormsColumn;
    ascending?: boolean;
    page?: number;
    pageSize?: number;
    /** The form, for the per-form endpoints (workflows, origins, origins overview). Absent: every form. */
    formId?: string;
};

/** Forms' `AnalyticsQueryResult`. `rows` hold one value per column, in the order of `columns`. */
export type FormsAnalyticsResult = {
    columns: FormsColumn[];
    rows: (string | number | boolean)[][];
    currentPage: number;
    rowsPerPage: number;
    totalRows: number;
    totalPages: number;
    fromRow: number;
    toRow: number;
    /** Distinct members who submitted in the range, across the rows. Forms fills it on the overview; the example on every answer. */
    uniqueMembers: number;
};

/** Forms started collecting analytics on this day: ranges before it have no entries. */
export const ANALYTICS_STARTED = "2026-01-01";

type Workflow = { id: string; name: string; failRate: number };
type Page = { id: string; name: string; url: string; weight: number };
type Form = {
    id: string;
    name: string;
    weight: number;
    storeRecords: boolean;
    /** As Forms formats it: days to keep submitted / approved / rejected records, or "Forever". */
    retentionDays: string;
    isMultiPage: boolean;
    /** The share of opened forms that get submitted, and of those that stop part-way (multi-page forms only). */
    completion: number;
    workflows: Workflow[];
    pages: Page[];
};

const page = (id: number, name: string, path: string, weight: number): Page => ({
    id: `3c1a9e70-0000-4000-8000-${String(id).padStart(12, "0")}`,
    name,
    url: `https://www.example.com${path}`,
    weight,
});

const workflow = (id: number, name: string, failRate: number): Workflow => ({
    id: `8b7d0f10-0000-4000-8000-${String(id).padStart(12, "0")}`,
    name,
    failRate,
});

// The made-up site's forms. Event registration is the sample form: multi-page, five source pages (more lines than
// the chart's four palette slots) and a workflow that fails now and then.
export const FORMS: Form[] = [
    {
        id: "f0a1c2d3-0001-4e5f-8a9b-000000000001",
        name: "Event registration",
        weight: 0.3,
        storeRecords: true,
        retentionDays: "90 / Forever / 30",
        isMultiPage: true,
        completion: 0.42,
        workflows: [workflow(1, "Send confirmation email", 0.004), workflow(2, "Post to CRM", 0.06), workflow(3, "Notify events team", 0)],
        pages: [
            page(1, "Summer conference", "/events/summer-conference/", 0.34),
            page(2, "Events", "/events/", 0.22),
            page(3, "Workshop: Getting started", "/events/workshop-getting-started/", 0.18),
            page(4, "Home", "/", 0.15),
            page(5, "Newsletter, June", "/newsletter/june/", 0.11),
        ],
    },
    {
        id: "f0a1c2d3-0002-4e5f-8a9b-000000000002",
        name: "Contact us",
        weight: 0.26,
        storeRecords: true,
        retentionDays: "Forever",
        isMultiPage: false,
        completion: 0.55,
        workflows: [workflow(4, "Send email to support", 0.01), workflow(5, "Send auto reply", 0.002)],
        pages: [page(6, "Contact", "/contact/", 0.7), page(7, "Support", "/support/", 0.3)],
    },
    {
        id: "f0a1c2d3-0003-4e5f-8a9b-000000000003",
        name: "Newsletter signup",
        weight: 0.22,
        storeRecords: false,
        retentionDays: "Forever",
        isMultiPage: false,
        completion: 0.68,
        workflows: [workflow(6, "Add to mailing list", 0.03)],
        pages: [page(4, "Home", "/", 0.6), page(8, "Blog", "/blog/", 0.4)],
    },
    {
        id: "f0a1c2d3-0004-4e5f-8a9b-000000000004",
        name: "Job application",
        weight: 0.12,
        storeRecords: true,
        retentionDays: "180 / 365 / 30",
        isMultiPage: true,
        completion: 0.31,
        workflows: [workflow(7, "Send to HR", 0), workflow(8, "Save CV to media", 0.02)],
        pages: [page(9, "Careers", "/careers/", 1)],
    },
    {
        id: "f0a1c2d3-0005-4e5f-8a9b-000000000005",
        name: "Feedback survey",
        weight: 0.1,
        storeRecords: true,
        retentionDays: "30 / 30 / 30",
        isMultiPage: true,
        completion: 0.38,
        workflows: [],
        pages: [page(10, "Thank you", "/thank-you/", 1)],
    },
];

const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

/** A number from 0 up to (not including) 1 that depends only on the text. */
function noise(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return ((h >>> 0) % 10_000) / 10_000;
}

/** A form's entries on one day. */
function entriesOn(form: Form, date: string): number {
    if (date < ANALYTICS_STARTED) return 0;
    const weekday = new Date(toTime(date)).getUTCDay();
    const weekend = weekday === 0 || weekday === 6 ? 0.55 : 1;
    return Math.round((40 + noise(`${date}:entries`) * 30) * form.weight * weekend * (0.8 + noise(`${date}:${form.id}`) * 0.4));
}

/** How often a workflow failed on one day: a few days a month, a handful of runs. */
const failuresOn = (w: Workflow, date: string, triggered: number) => Math.round(triggered * w.failRate * noise(`${date}:${w.id}:fail`) * 2);

/** The members among a form's entries on one day (the rest are anonymous). */
const membersOn = (form: Form, date: string, entries: number) => Math.round(entries * (0.3 + noise(`${date}:${form.id}:members`) * 0.15));

/** A page's share of a form's entries on one day. */
const pageEntriesOn = (form: Form, p: Page, date: string, entries: number) => Math.round(entries * p.weight * (0.75 + noise(`${date}:${p.id}`) * 0.5));

type DayCounts = { entries: number; triggered: number; workflowErrors: number; uniqueMembers: number };

function countsOn(forms: Form[], date: string): DayCounts {
    const counts: DayCounts = { entries: 0, triggered: 0, workflowErrors: 0, uniqueMembers: 0 };
    for (const form of forms) {
        const entries = entriesOn(form, date);
        counts.entries += entries;
        counts.uniqueMembers += membersOn(form, date, entries);
        for (const w of form.workflows) {
            counts.triggered += entries;
            counts.workflowErrors += failuresOn(w, date, entries);
        }
    }
    return counts;
}

/**
 * Distinct members over several days: some come back, so they are fewer than the days' members added up. A real
 * server counts distinct member keys; the example takes off a share for members who came back.
 */
const distinctMembers = (perDay: number[]) => {
    const sum = perDay.reduce((a, b) => a + b, 0);
    return Math.round(sum * (perDay.length > 1 ? 0.82 : 1));
};

const rangeOf = (query: FormsAnalyticsQuery): UauiDateRange => ({ from: query.startDate.slice(0, 10), to: query.endDate.slice(0, 10) });

/** The time dimension asked for, as the group-by the buckets follow. */
function bucketsOf(query: FormsAnalyticsQuery) {
    const dimension = query.dimensions[0];
    const groupBy: UauiGroupBy = dimension === "week" ? "week" : dimension === "month" ? "month" : "day";
    return uauiDateBuckets(rangeOf(query), groupBy);
}

/** Forms answers dates as .NET `DateTime`s, serialized without a zone: "2026-06-01T00:00:00". */
const dateTime = (iso: string) => `${iso}T00:00:00`;

const formsFor = (query: FormsAnalyticsQuery) => (query.formId ? FORMS.filter((f) => f.id === query.formId) : FORMS);

/** Builds an answer from all rows, paging them as Forms does (`page` from 1, `pageSize` 1000 by default). */
function result(columns: FormsColumn[], all: FormsAnalyticsResult["rows"], query: FormsAnalyticsQuery, uniqueMembers: number): FormsAnalyticsResult {
    const page = query.page ?? 1;
    const rowsPerPage = query.pageSize ?? 1000;
    const rows = all.slice((page - 1) * rowsPerPage, page * rowsPerPage);
    const fromRow = 1 + (page - 1) * rowsPerPage;
    return {
        columns,
        rows,
        currentPage: page,
        rowsPerPage,
        totalRows: all.length,
        totalPages: Math.max(1, Math.ceil(all.length / rowsPerPage)),
        fromRow,
        toRow: Math.min(all.length, fromRow + rowsPerPage - 1),
        uniqueMembers,
    };
}

/** Sorts rows by the `sort` column, as Forms' repository does. */
function sortRows(columns: FormsColumn[], rows: FormsAnalyticsResult["rows"], query: FormsAnalyticsQuery) {
    const index = query.sort ? columns.indexOf(query.sort) : -1;
    if (index < 0) return rows;
    const sign = query.ascending ? 1 : -1;
    return [...rows].sort((a, b) => {
        const x = a[index];
        const y = b[index];
        return sign * (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y)));
    });
}

/** How a call to the fake API behaves: how long it takes, and whether it fails (rejects) like a server error would. */
export type FakeApiOptions = { latencyMs?: number; fail?: boolean };

async function respond({ latencyMs = 0, fail = false }: FakeApiOptions, what: string): Promise<void> {
    await wait(latencyMs);
    if (fail) throw new Error(`The ${what} request failed.`);
}

/**
 * POST /analytics/submissions: one row per day, `[date, ...metrics]`. Forms answers its first two metrics, `entries`
 * and `workflowErrors`; the example also answers `triggered` and `uniqueMembers` (columns Forms has, proposed for this
 * endpoint), and a proposed `week` or `month` dimension for unique members, which can't be added up from days.
 */
export async function postSubmissions(query: FormsAnalyticsQuery, options: FakeApiOptions = {}): Promise<FormsAnalyticsResult> {
    await respond(options, "submissions");
    const forms = formsFor(query);
    const columns: FormsColumn[] = [query.dimensions[0], ...query.metrics];
    const allDays: number[] = [];
    const rows = bucketsOf(query).map(({ start, days }) => {
        const counts = days.map((d) => countsOn(forms, d));
        allDays.push(...counts.map((c) => c.uniqueMembers));
        const total = (key: keyof DayCounts) => counts.reduce((sum, c) => sum + c[key], 0);
        const values = query.metrics.map((m) => (m === "uniqueMembers" ? distinctMembers(counts.map((c) => c.uniqueMembers)) : total(m as keyof DayCounts)));
        return [dateTime(start), ...values];
    });
    return result(columns, rows, { ...query, page: 1, pageSize: 9999 }, distinctMembers(allDays));
}

/** How a form's entries spread over the hours of one day: quiet at night, busiest around lunch and mid-afternoon. */
function hourWeights(form: Form, date: string): number[] {
    return Array.from({ length: 24 }, (_, h) => {
        const busy = 0.15 + Math.exp(-((h - 11) ** 2) / 10) + 0.8 * Math.exp(-((h - 15) ** 2) / 6);
        return busy * (0.7 + noise(`${date}:${form.id}:${h}`) * 0.6);
    });
}

/** A form's entries on one day, per hour (0 to 23), adding up to that day's entries. */
function entriesByHourOn(form: Form, date: string): number[] {
    const entries = entriesOn(form, date);
    const weights = hourWeights(form, date);
    const sum = weights.reduce((a, b) => a + b, 0);
    // Rounded on the running total, so the hours add up to the day exactly.
    let before = 0;
    let running = 0;
    return weights.map((w) => {
        running += w;
        const upTo = Math.round((running / sum) * entries);
        const count = upTo - before;
        before = upTo;
        return count;
    });
}

/**
 * POST /analytics/submissions with the `hour` dimension: one row per hour of the day (0 to 23, in the query's time
 * zone), `[hour, entries]`, the range's entries added up by the hour they came in. Like a SQL `GROUP BY`, an hour with
 * no entries has no row.
 */
export async function postSubmissionsByHour(query: FormsAnalyticsQuery, options: FakeApiOptions = {}): Promise<FormsAnalyticsResult> {
    await respond(options, "submissions by hour");
    const forms = formsFor(query);
    const days = uauiDateBuckets(rangeOf(query), "day").map((b) => b.start);
    const totals = Array.from({ length: 24 }, () => 0);
    for (const form of forms) for (const d of days) entriesByHourOn(form, d).forEach((count, h) => (totals[h] += count));
    const rows = totals.flatMap((entries, hour) => (entries ? [[hour, entries]] : []));
    return result(["hour", "entries"], rows, { ...query, page: 1, pageSize: 9999 }, 0);
}

/** POST /analytics/overview: one row per form, the columns asked for (dimensions, then metrics). */
export async function postOverview(query: FormsAnalyticsQuery, options: FakeApiOptions = {}): Promise<FormsAnalyticsResult> {
    await respond(options, "forms overview");
    const columns: FormsColumn[] = [...query.dimensions, ...query.metrics];
    const days = uauiDateBuckets(rangeOf(query), "day").map((b) => b.start);
    let allMembers: number[] = [];
    const rows = FORMS.map((form) => {
        const entriesByDay = days.map((d) => entriesOn(form, d));
        const members = days.map((d, i) => membersOn(form, d, entriesByDay[i]));
        allMembers = allMembers.concat(members);
        const entries = entriesByDay.reduce((a, b) => a + b, 0);
        const errors = form.workflows.reduce((sum, w) => sum + days.reduce((s, d, i) => s + failuresOn(w, d, entriesByDay[i]), 0), 0);
        const sources = form.pages.filter((p) => days.some((d, i) => pageEntriesOn(form, p, d, entriesByDay[i]) > 0)).length;
        const value: Partial<Record<FormsColumn, string | number | boolean>> = {
            formId: form.id,
            formName: form.name,
            entries,
            uniqueMembers: distinctMembers(members),
            workflowCount: form.workflows.length,
            workflowErrors: errors,
            storeRecords: form.storeRecords,
            retentionDays: form.retentionDays,
            isMultiPage: form.isMultiPage,
            sources,
        };
        return columns.map((c) => value[c] ?? "");
    });
    return result(columns, sortRows(columns, rows, query), query, distinctMembers(allMembers));
}

/** POST /analytics/workflows: one row per workflow of `formId`. Success is triggered minus failures, as in Forms. */
export async function postWorkflows(query: FormsAnalyticsQuery, options: FakeApiOptions = {}): Promise<FormsAnalyticsResult> {
    await respond(options, "workflows");
    const form = FORMS.find((f) => f.id === query.formId);
    if (!form) throw new Error("A form identifier is required for the workflows overview.");
    const columns: FormsColumn[] = [...query.dimensions, ...query.metrics];
    const days = uauiDateBuckets(rangeOf(query), "day").map((b) => b.start);
    const rows = form.workflows.map((w) => {
        const triggered = days.reduce((sum, d) => sum + entriesOn(form, d), 0);
        const failures = days.reduce((sum, d) => sum + failuresOn(w, d, entriesOn(form, d)), 0);
        const value: Partial<Record<FormsColumn, string | number>> = { workflowId: w.id, workflowName: w.name, triggered, failures, success: triggered - failures };
        return columns.map((c) => value[c] ?? "");
    });
    return result(columns, sortRows(columns, rows, query), query, 0);
}

/**
 * POST /analytics/origins: one row per date bucket and source page, `[date, pageName, entries]`, as Forms'
 * `BuildOriginTimeSeriesChart` answers. The page is named, not identified: two pages with one name share a line.
 */
export async function postOrigins(query: FormsAnalyticsQuery, options: FakeApiOptions = {}): Promise<FormsAnalyticsResult> {
    await respond(options, "origins");
    const form = FORMS.find((f) => f.id === query.formId);
    if (!form) throw new Error("A form identifier is required for the origins.");
    const days = uauiDateBuckets(rangeOf(query), "day").map((b) => b.start);
    const rows = days.flatMap((d) => form.pages.map((p) => [dateTime(d), p.name, pageEntriesOn(form, p, d, entriesOn(form, d))]));
    return result(["date", "pageName", query.metrics[0]], rows, { ...query, page: 1, pageSize: 9999 }, 0);
}

/** POST /analytics/origins-overview: one row per source page of `formId`. */
export async function postOriginsOverview(query: FormsAnalyticsQuery, options: FakeApiOptions = {}): Promise<FormsAnalyticsResult> {
    await respond(options, "origins overview");
    const form = FORMS.find((f) => f.id === query.formId);
    if (!form) throw new Error("A form identifier is required for the origins overview.");
    const columns: FormsColumn[] = [...query.dimensions, ...query.metrics];
    const days = uauiDateBuckets(rangeOf(query), "day").map((b) => b.start);
    const rows = form.pages.map((p) => {
        const perDay = days.map((d) => pageEntriesOn(form, p, d, entriesOn(form, d)));
        const entries = perDay.reduce((a, b) => a + b, 0);
        const value: Partial<Record<FormsColumn, string | number>> = {
            pageId: p.id,
            pageName: p.name,
            pageUrl: p.url,
            entries,
            uniqueMembers: distinctMembers(days.map((d, i) => membersOn(form, d, perDay[i]))),
        };
        return columns.map((c) => value[c] ?? "");
    });
    return result(columns, sortRows(columns, rows, query), query, 0);
}

/**
 * POST /analytics/record-states (proposed, not in Forms): how many records of `formId` reached each state in the
 * range, `[state, entries]`. Forms stores a record per opened form and moves it through its `FormState`s, so the data
 * is there. States: "opened", "partiallySubmitted" (stopped on a later page of a multi-page form), "submitted". A single-page form has no partially submitted state.
 */
export async function postRecordStates(query: FormsAnalyticsQuery, options: FakeApiOptions = {}): Promise<FormsAnalyticsResult> {
    await respond(options, "record states");
    const form = FORMS.find((f) => f.id === query.formId);
    if (!form) throw new Error("A form identifier is required for the record states.");
    const days = uauiDateBuckets(rangeOf(query), "day").map((b) => b.start);
    const submitted = days.reduce((sum, d) => sum + entriesOn(form, d), 0);
    const opened = Math.round(submitted / form.completion);
    const partial = Math.round(submitted + (opened - submitted) * 0.45);
    // A single-page form is submitted in one go, so it has no partially submitted records.
    const rows = [["opened", opened], ...(form.isMultiPage ? [["partiallySubmitted", partial]] : []), ["submitted", submitted]];
    return result(["state", "entries"], rows, query, 0);
}
