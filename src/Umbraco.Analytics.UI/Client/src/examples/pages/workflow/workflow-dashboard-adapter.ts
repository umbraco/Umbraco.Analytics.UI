import type { UauiSeries, UauiSeriesKind } from "../../../chart/types.js";
import type { UauiColorSlot, UauiStatusColor } from "../../../theme/types.js";
import { WORKFLOW_STATUS, type WorkflowChartResponse, type WorkflowChartSeries, type WorkflowInstance, type WorkflowStatusCode } from "./workflow-fake-data.js";

// #region adapter
// Workflow's dashboard API, as this example imagines it (the types are in the fake API, `workflow-fake-data.ts`):
//
// Every query sends the editor's time zone (`timeZone`, an IANA name), so the server buckets days as the editor sees them.
// - Charts: `GET /workflow/chart/activity?days=N` and `GET /workflow/chart/reviews?days=N&ahead=M` answer
//   `{ series: [{ name, data: [{ x, y }] }], today }`. `x` names one of the editor's calendar days, written as that
//   day's UTC midnight in epoch milliseconds, and `y` is that day's count; `today` is the editor's current day in the
//   same frame. The activity answer also has `totals` (`approved`, `rejected`, `cancelled` in the period; `pending`
//   waiting now).
// - History: `GET /workflow/instances?days=N&status=S&status=T` answers `{ items, total }`; each item has `node`,
//   `type`, `status` (a numeric `WorkflowStatus` code), `requestedBy`, `requestedOn` and `completedOn` (ISO 8601 with
//   an offset, `completedOn` null while open), and `currentStep` of `totalSteps`.
//
// These functions are the only code that knows those shapes. They turn an answer into what the package's elements
// take: series for `uaui-time-series-chart`, rows for `uaui-data-table`, and plain numbers for the tiles and stats.

/** The statuses the page names and colours. Workflow's codes map onto them in `workflowStatus`. */
export type WorkflowStatusId = "approved" | "pending" | "rejected" | "cancelled" | "errored" | "notRequired";

/**
 * A status code as the page shows it: its id (the page names it) and its colour, for the status cell, the tiles and
 * the chart series alike. Resubmitted is waiting for approval again, so it counts as pending. An unknown code is
 * shown as pending in the neutral colour rather than dropped.
 */
export function workflowStatus(code: WorkflowStatusCode | number): { id: WorkflowStatusId; color: UauiStatusColor } {
    switch (code) {
        case WORKFLOW_STATUS.approved:
            return { id: "approved", color: "positive" };
        case WORKFLOW_STATUS.rejected:
            return { id: "rejected", color: "danger" };
        case WORKFLOW_STATUS.pendingApproval:
        case WORKFLOW_STATUS.resubmitted:
            return { id: "pending", color: "warning" };
        case WORKFLOW_STATUS.cancelled:
            return { id: "cancelled", color: "default" };
        case WORKFLOW_STATUS.errored:
            return { id: "errored", color: "danger" };
        case WORKFLOW_STATUS.notRequired:
            return { id: "notRequired", color: "positive" };
        default:
            return { id: "pending", color: "default" };
    }
}

/**
 * The status codes to ask the history endpoint for, for a status the page filters on: every code that
 * `workflowStatus` shows as that status. Pending is pending approval and resubmitted, so the Pending tile's count
 * (waiting now, both codes) and the rows it opens agree.
 */
export function workflowStatusCodes(id: WorkflowStatusId): WorkflowStatusCode[] {
    return Object.values(WORKFLOW_STATUS).filter((code) => workflowStatus(code).id === id);
}

/** The ISO day a chart point's `x` names (that day's UTC midnight in epoch milliseconds). */
export const workflowDay = (x: number): string => new Date(x).toISOString().slice(0, 10);

/**
 * The chart's `today`: the answer's own `today`, read in the same frame as its points' `x`, so the today line always
 * lands on the answer's day and never on the day before or after.
 *
 * Workflow's own chart compared each day's timestamp with the current time, which is never exactly midnight, so its
 * "Today" label never showed. Working today out from the browser's clock instead would still miss: the points are
 * the server's days, and in the morning east of UTC (or the evening west of it) the browser's day is another one.
 */
export const workflowChartToday = (response: Pick<WorkflowChartResponse<string>, "today"> | undefined): string | undefined =>
    response ? workflowDay(response.today) : undefined;

/** A chart series to plot: which named series of the answer, and how. */
export type WorkflowSeriesSpec<TName extends string> = { name: TName; label: string; color?: UauiColorSlot | UauiStatusColor; kind?: UauiSeriesKind };

/** One series per spec, in the order of the specs, from a chart answer. A spec the answer has no series for is left out. */
export function workflowSeries<TName extends string>(series: WorkflowChartSeries<TName>[] | undefined, specs: WorkflowSeriesSpec<TName>[]): UauiSeries[] {
    if (!series) return [];
    return specs.flatMap(({ name, label, color, kind }) => {
        const found = series.find((s) => s.name === name);
        if (!found) return [];
        return [{ id: name, label, ...(color ? { color } : {}), ...(kind ? { kind } : {}), points: found.data.map((p) => ({ date: workflowDay(p.x), value: Number(p.y) || 0 })) }];
    });
}

/** Whether every count of a chart answer is 0: nothing to draw, so the chart shows its empty state. */
export const workflowIsEmpty = (series: WorkflowChartSeries<string>[] | undefined): boolean => !!series && series.every((s) => s.data.every((p) => !p.y));

/** How long approvals took, in milliseconds. Each is undefined when no approval finished. */
export type WorkflowApprovalTimes = { fastest?: number; slowest?: number; average?: number; count: number };

/**
 * Fastest, slowest and average approval time, from approved instances that have finished (`completedOn` set).
 *
 * Two bugs in Workflow's own dashboard are not repeated here:
 * - "Fastest" always showed "-": it started from 0 and took the smaller value, so it stayed 0, which then read as "no
 *   value". Here fastest starts from the first approval, and an approval that took 0 ms (approved on the spot) is a
 *   real fastest of 0, not "no value": only no approvals at all gives undefined.
 * - The average counted unfinished instances (still pending, or rejected and cancelled ones): here only approvals
 *   that finished count, for the average as for fastest and slowest.
 */
export function workflowApprovalTimes(instances: readonly WorkflowInstance[] | undefined): WorkflowApprovalTimes {
    const times = (instances ?? []).flatMap((w) => {
        if (w.status !== WORKFLOW_STATUS.approved || !w.completedOn) return [];
        // Both carry their offset, so this is the elapsed time even across a daylight saving change.
        const took = Date.parse(w.completedOn) - Date.parse(w.requestedOn);
        return Number.isFinite(took) && took >= 0 ? [took] : [];
    });
    if (!times.length) return { count: 0 };
    return {
        fastest: Math.min(...times),
        slowest: Math.max(...times),
        average: times.reduce((sum, t) => sum + t, 0) / times.length,
        count: times.length,
    };
}

/** A history row: the instance's fields flattened for `uaui-data-table`, with its status id and colour. */
export type WorkflowHistoryRow = {
    key: string;
    nodeKey: string;
    document: string;
    type: WorkflowInstance["type"];
    requestedBy: string;
    requestedOn: string;
    completedOn: string | null;
    currentStep: number;
    totalSteps: number;
    status: WorkflowStatusId;
    statusColor: UauiStatusColor;
};

/** History rows from the instances endpoint's items. */
export function workflowHistoryRows(instances: readonly WorkflowInstance[] | undefined): WorkflowHistoryRow[] {
    return (instances ?? []).map((w) => {
        const { id, color } = workflowStatus(w.status);
        return {
            key: w.key,
            nodeKey: w.node.key,
            document: w.node.name,
            type: w.type,
            requestedBy: w.requestedBy.name,
            requestedOn: w.requestedOn,
            completedOn: w.completedOn,
            currentStep: w.currentStep,
            totalSteps: w.totalSteps,
            status: id,
            statusColor: color,
        };
    });
}
// #endregion
