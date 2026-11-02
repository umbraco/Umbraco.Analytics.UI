// Example only: a made-up Umbraco Workflow install that answers like Workflow's admin dashboard API might. A real
// product calls its own endpoints here. Everything is worked out from the date, so the same request always gives the
// same answer. The shapes are invented for this example, modelled on what Workflow's dashboard shows (approval
// activity and content review charts, status totals, a history of workflow instances); `workflow-dashboard-adapter.ts`
// is the only place that reads them. Values are raw (counts, epoch milliseconds, ISO date-times with offsets, numeric
// status codes); the page formats them.
import { uauiDaysIn } from "../../../date-helpers/index.js";
import { wait } from "../fake-latency.js";

/**
 * A workflow instance's status: a numeric code, as Workflow's `WorkflowStatus` enum is serialized. Only the adapter
 * turns it into a status the page names and colours.
 */
export const WORKFLOW_STATUS = {
    approved: 1,
    rejected: 2,
    pendingApproval: 3,
    notRequired: 4,
    cancelled: 5,
    errored: 6,
    resubmitted: 7,
} as const;
export type WorkflowStatusCode = (typeof WORKFLOW_STATUS)[keyof typeof WORKFLOW_STATUS];

/**
 * One point of a chart series. `x` names a calendar day in the editor's time zone (the query's `timeZone`), written
 * as that day's UTC midnight in epoch milliseconds, so `new Date(x).toISOString()` reads the day back whatever the
 * browser's own zone. `y` is the count.
 */
export type WorkflowChartPoint = { x: number; y: number };

/** One named series of a chart answer. */
export type WorkflowChartSeries<TName extends string> = { name: TName; data: WorkflowChartPoint[] };

/**
 * What every chart answer has: its series, and `today`, the editor's current day in the same frame as `x` (the
 * server's clock, read in the query's time zone). The client never works today out from its own clock, so the today
 * line always lands on one of the answer's days.
 */
export type WorkflowChartResponse<TName extends string> = { series: WorkflowChartSeries<TName>[]; today: number };

/** The editor's time zone (an IANA name), sent with every query so the server buckets days as the editor sees them. */
export type WorkflowQuery = { days: number; timeZone?: string };

/** GET /workflow/chart/activity?days=N&timeZone=Z: what happened each day of the last N days, today included. */
export type WorkflowActivityResponse = WorkflowChartResponse<"approved" | "rejected" | "cancelled" | "pending"> & {
    /** Totals for the period; `pending` is the number waiting now (pending approval or resubmitted), not a sum over the days. */
    totals: { approved: number; rejected: number; cancelled: number; pending: number };
};

/**
 * GET /workflow/chart/reviews?days=N&ahead=M&timeZone=Z: content reviews falling due each day, N days back and M days
 * ahead of today. `reviewed`: due that day and reviewed. `overdue`: due that day (today or earlier) and not reviewed.
 * `upcoming`: due after today.
 */
export type WorkflowReviewsResponse = WorkflowChartResponse<"reviewed" | "overdue" | "upcoming">;

/** A workflow instance, as the history endpoint lists it. */
export type WorkflowInstance = {
    key: string;
    node: { key: string; name: string };
    type: "publish" | "unpublish";
    status: WorkflowStatusCode;
    requestedBy: { key: string; name: string };
    /**
     * ISO 8601 with the offset in force at that moment in the query's time zone (`2026-06-01T09:00:00+02:00`). With
     * the offset, a duration is the true elapsed time even across a daylight saving change, where wall-clock times
     * without one would gain or lose an hour (or go negative).
     */
    requestedOn: string;
    /** When the instance finished (approved, rejected, cancelled or errored), as `requestedOn`; null while it is still open. */
    completedOn: string | null;
    /** Approval steps done so far, and how many the workflow has. */
    currentStep: number;
    totalSteps: number;
};

/** GET /workflow/instances?days=N&status=S&status=T&timeZone=Z: instances requested, finished or still open in the last N days. */
export type WorkflowInstancesResponse = { items: WorkflowInstance[]; total: number };

/**
 * The moment the example's install answers at: fixed, so the example and its screenshots look the same on every day.
 * Noon UTC is 22 June in every time zone from UTC-11 to UTC+11.
 */
export const WORKFLOW_NOW = "2026-06-22T12:00:00Z";

/** Workflow was installed on this day: nothing happened before it. */
const INSTALLED = "2026-01-01";

const DOCUMENTS = ["Home", "About us", "Spring campaign", "Pricing", "Careers", "Press release: Q2 results", "Contact", "Blog: Ten tips", "Events", "Privacy policy"].map(
    (name, i) => ({ key: `doc-${i + 1}`, name }),
);
const USERS = ["Ana Lima", "Ben Okafor", "Chloé Martin", "Dan Holm", "Eva Novak"].map((name, i) => ({ key: `user-${i + 1}`, name }));

/** A number from 0 up to (not including) 1 that depends only on the text. */
function noise(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return ((h >>> 0) % 10_000) / 10_000;
}

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const NOW_TIME = Date.parse(WORKFLOW_NOW);
const utcMidnight = (day: string) => Date.parse(`${day}T00:00:00Z`);
const addDays = (day: string, n: number) => new Date(utcMidnight(day) + n * DAY_MS).toISOString().slice(0, 10);

/** A moment as ISO 8601 in a time zone, with the offset in force then: `2026-06-01T09:00:00+02:00`. */
export function isoInTimeZone(time: number, timeZone = "UTC"): string {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
            .formatToParts(time)
            .map((p) => [p.type, p.value]),
    );
    const wall = `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
    const offset = Math.round((Date.parse(`${wall}Z`) - Math.floor(time / 1000) * 1000) / 60_000);
    const sign = offset < 0 ? "-" : "+";
    const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, "0");
    return `${wall}${sign}${pad(offset / 60)}:${pad(offset % 60)}`;
}

/** The calendar day of a moment in a time zone. */
const dayIn = (time: number, timeZone?: string) => isoInTimeZone(time, timeZone).slice(0, 10);

/** The last moment of a calendar day in a time zone (the moment before the next day's local midnight). */
function endOfDay(day: string, timeZone?: string): number {
    const nextMidnight = utcMidnight(addDays(day, 1));
    const offsetAt = (t: number) => Date.parse(`${isoInTimeZone(t, timeZone).slice(0, 19)}Z`) - Math.floor(t / 1000) * 1000;
    // Local midnight is UTC midnight minus the offset; read the offset at the guess, so a change that day is handled.
    return nextMidnight - offsetAt(nextMidnight - offsetAt(nextMidnight)) - 1;
}

/** An instance before it is written out: its moments as epoch milliseconds. */
type RawInstance = Omit<WorkflowInstance, "requestedOn" | "completedOn"> & { requestedAt: number; completedAt: number | null };

/** Every instance from installation to now, worked out once. */
let allInstances: RawInstance[] | undefined;

function instances(): RawInstance[] {
    if (allInstances) return allInstances;
    allInstances = [];
    for (const day of uauiDaysIn({ from: INSTALLED, to: addDays(WORKFLOW_NOW.slice(0, 10), 1) })) {
        const weekday = new Date(utcMidnight(day)).getUTCDay();
        const weekend = weekday === 0 || weekday === 6;
        const count = Math.round(noise(`${day}:count`) * (weekend ? 2 : 9));
        for (let i = 0; i < count; i++) {
            const seed = `${day}:${i}`;
            const requested = utcMidnight(day) + (6 + Math.floor(noise(`${seed}:hour`) * 9)) * HOUR_MS + Math.floor(noise(`${seed}:min`) * 60) * 60_000;
            if (requested > NOW_TIME) continue;
            const totalSteps = 1 + Math.floor(noise(`${seed}:steps`) * 3);
            const outcome = noise(`${seed}:outcome`);
            // Approval takes from a few minutes to about five days; one in twenty is approved on the spot (0 ms),
            // as when the approver is the requester.
            const instant = noise(`${seed}:instant`) < 0.05;
            const took = instant ? 0 : Math.round((0.1 + noise(`${seed}:took`) ** 2 * 120) * HOUR_MS);
            const finished = requested + took;
            const status: WorkflowStatusCode =
                outcome < 0.74 ? WORKFLOW_STATUS.approved : outcome < 0.86 ? WORKFLOW_STATUS.rejected : outcome < 0.95 ? WORKFLOW_STATUS.cancelled : WORKFLOW_STATUS.errored;
            const open = finished > NOW_TIME;
            // Some open instances were sent back once and resubmitted: still waiting, with their own status code.
            const openStatus = noise(`${seed}:resubmitted`) < 0.3 ? WORKFLOW_STATUS.resubmitted : WORKFLOW_STATUS.pendingApproval;
            const stepsDone = Math.floor(noise(`${seed}:done`) * totalSteps);
            allInstances.push({
                key: `wf-${day}-${i}`,
                node: DOCUMENTS[Math.floor(noise(`${seed}:doc`) * DOCUMENTS.length)],
                type: noise(`${seed}:type`) < 0.85 ? "publish" : "unpublish",
                status: open ? openStatus : status,
                requestedBy: USERS[Math.floor(noise(`${seed}:user`) * USERS.length)],
                requestedAt: requested,
                completedAt: open ? null : finished,
                currentStep: !open && status === WORKFLOW_STATUS.approved ? totalSteps : stepsDone,
                totalSteps,
            });
        }
    }
    return allInstances;
}

const isOpen = (w: RawInstance) => w.status === WORKFLOW_STATUS.pendingApproval || w.status === WORKFLOW_STATUS.resubmitted;

/** The editor's days of the last `days` days, today included, and today. */
function lastDays(query: WorkflowQuery, ahead = 0): { days: string[]; today: string } {
    const today = dayIn(NOW_TIME, query.timeZone);
    return { days: uauiDaysIn({ from: addDays(today, -(Math.max(1, query.days) - 1)), to: addDays(today, ahead) }), today };
}

/** How a call to the fake API behaves: how long it takes, and whether it fails (rejects) like a server error would. */
export type FakeApiOptions = { latencyMs?: number; fail?: boolean };

async function respond({ latencyMs = 0, fail = false }: FakeApiOptions, what: string): Promise<void> {
    await wait(latencyMs);
    if (fail) throw new Error(`The ${what} request failed.`);
}

/** GET /workflow/chart/activity?days=N&timeZone=Z. */
export async function getActivity(query: WorkflowQuery, options: FakeApiOptions = {}): Promise<WorkflowActivityResponse> {
    await respond(options, "approval activity");
    const { days, today } = lastDays(query);
    const all = instances();
    const finishedOn = (status: WorkflowStatusCode) => (day: string) =>
        all.filter((w) => w.status === status && w.completedAt !== null && dayIn(w.completedAt, query.timeZone) === day).length;
    const pendingAt = (day: string) => {
        const end = Math.min(endOfDay(day, query.timeZone), NOW_TIME);
        return all.filter((w) => w.requestedAt <= end && (w.completedAt === null || w.completedAt > end)).length;
    };
    const series = (name: WorkflowActivityResponse["series"][number]["name"], count: (day: string) => number) => ({
        name,
        data: days.map((day) => ({ x: utcMidnight(day), y: count(day) })),
    });
    const result: WorkflowActivityResponse = {
        series: [
            series("approved", finishedOn(WORKFLOW_STATUS.approved)),
            series("rejected", finishedOn(WORKFLOW_STATUS.rejected)),
            series("cancelled", finishedOn(WORKFLOW_STATUS.cancelled)),
            series("pending", pendingAt),
        ],
        today: utcMidnight(today),
        totals: { approved: 0, rejected: 0, cancelled: 0, pending: all.filter(isOpen).length },
    };
    for (const name of ["approved", "rejected", "cancelled"] as const) result.totals[name] = result.series.find((s) => s.name === name)!.data.reduce((sum, p) => sum + p.y, 0);
    return result;
}

/** GET /workflow/chart/reviews?days=N&ahead=M&timeZone=Z. */
export async function getReviews(query: WorkflowQuery & { ahead: number }, options: FakeApiOptions = {}): Promise<WorkflowReviewsResponse> {
    await respond(options, "content reviews");
    const { days, today } = lastDays(query, query.ahead);
    const dueOn = (day: string) => (day < INSTALLED ? 0 : Math.round(noise(`${day}:due`) ** 2 * 5));
    const reviewedOf = (day: string) => (day > today ? 0 : Math.round(dueOn(day) * (0.5 + noise(`${day}:reviewed`) * 0.5)));
    const point = (day: string, y: number) => ({ x: utcMidnight(day), y });
    return {
        series: [
            { name: "reviewed", data: days.map((d) => point(d, reviewedOf(d))) },
            { name: "overdue", data: days.map((d) => point(d, d > today ? 0 : dueOn(d) - reviewedOf(d))) },
            { name: "upcoming", data: days.map((d) => point(d, d > today ? dueOn(d) : 0)) },
        ],
        today: utcMidnight(today),
    };
}

/**
 * GET /workflow/instances?days=N&status=S&status=T&timeZone=Z: newest first. `statuses` is the repeated `status`
 * parameter: an instance with any of them. Without one, every instance.
 */
export async function getInstances(query: WorkflowQuery & { statuses?: readonly WorkflowStatusCode[] }, options: FakeApiOptions = {}): Promise<WorkflowInstancesResponse> {
    await respond(options, "workflow history");
    const from = endOfDay(addDays(lastDays(query).days[0], -1), query.timeZone) + 1;
    const statuses = query.statuses?.length ? query.statuses : undefined;
    const items = instances()
        .filter((w) => w.requestedAt >= from || w.completedAt === null || w.completedAt >= from)
        .filter((w) => !statuses || statuses.includes(w.status))
        .sort((a, b) => b.requestedAt - a.requestedAt)
        .map(({ requestedAt, completedAt, ...w }) => ({
            ...w,
            requestedOn: isoInTimeZone(requestedAt, query.timeZone),
            completedOn: completedAt === null ? null : isoInTimeZone(completedAt, query.timeZone),
        }));
    return { items, total: items.length };
}
