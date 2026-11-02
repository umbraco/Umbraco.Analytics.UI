// Example only: a made-up Umbraco Workflow install that answers like Workflow's admin dashboard API might. A real
// product calls its own endpoints here. Everything is worked out from the date, so the same request always gives the
// same answer. The shapes are invented for this example, modelled on what Workflow's dashboard shows (approval
// activity and content review charts, status totals, a history of workflow instances); `workflow-adapter.ts` is the
// only place that reads them. Values are raw (counts, epoch milliseconds, ISO date-times, numeric status codes); the
// page formats them.
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

/** One point of a chart series: `x` is the start of the day in epoch milliseconds (UTC midnight), `y` the count. */
export type WorkflowChartPoint = { x: number; y: number };

/** One named series of a chart answer. */
export type WorkflowChartSeries<TName extends string> = { name: TName; data: WorkflowChartPoint[] };

/** GET /workflow/chart/activity?days=N: what happened each day of the last N days, today included. */
export type WorkflowActivityResponse = {
    /** `approved`, `rejected`, `cancelled`: instances that finished that day. `pending`: instances still waiting at the end of the day (now, for today). */
    series: WorkflowChartSeries<"approved" | "rejected" | "cancelled" | "pending">[];
    /** Totals for the period; `pending` is the number waiting now, not a sum over the days. */
    totals: { approved: number; rejected: number; cancelled: number; pending: number };
};

/** GET /workflow/chart/reviews?days=N&ahead=M: content reviews falling due each day, N days back and M days ahead of today. */
export type WorkflowReviewsResponse = {
    /** `reviewed`: due that day and reviewed. `overdue`: due that day (today or earlier) and not reviewed. `upcoming`: due after today. */
    series: WorkflowChartSeries<"reviewed" | "overdue" | "upcoming">[];
};

/** A workflow instance, as the history endpoint lists it. */
export type WorkflowInstance = {
    key: string;
    node: { key: string; name: string };
    type: "publish" | "unpublish";
    status: WorkflowStatusCode;
    requestedBy: { key: string; name: string };
    /** Local server date-time, `yyyy-MM-ddTHH:mm:ss`. */
    requestedOn: string;
    /** When the instance finished (approved, rejected, cancelled or errored), or null while it is still open. */
    completedOn: string | null;
    /** Approval steps done so far, and how many the workflow has. */
    currentStep: number;
    totalSteps: number;
};

/** GET /workflow/instances?days=N&status=S: instances requested, finished or still open in the last N days. */
export type WorkflowInstancesResponse = { items: WorkflowInstance[]; total: number };

/** "Today" of the example's install: fixed, so the example and its screenshots look the same on every day. */
export const WORKFLOW_NOW = "2026-06-22T15:00:00";
export const WORKFLOW_TODAY = WORKFLOW_NOW.slice(0, 10);

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
const utcMidnight = (day: string) => Date.parse(`${day}T00:00:00Z`);
/** Wall-clock date-times as numbers, treating them as UTC so no time zone moves them. */
const asTime = (dateTime: string) => Date.parse(`${dateTime}Z`);
const asDateTime = (time: number) => new Date(time).toISOString().slice(0, 19);
const addDays = (day: string, n: number) => new Date(utcMidnight(day) + n * DAY_MS).toISOString().slice(0, 10);
const NOW_TIME = asTime(WORKFLOW_NOW);

/** Every instance from installation to now, worked out once. */
let allInstances: WorkflowInstance[] | undefined;

function instances(): WorkflowInstance[] {
    if (allInstances) return allInstances;
    allInstances = [];
    for (const day of uauiDaysIn({ from: INSTALLED, to: WORKFLOW_TODAY })) {
        const weekday = new Date(utcMidnight(day)).getUTCDay();
        const weekend = weekday === 0 || weekday === 6;
        const count = Math.round(noise(`${day}:count`) * (weekend ? 2 : 9));
        for (let i = 0; i < count; i++) {
            const seed = `${day}:${i}`;
            const requested = utcMidnight(day) + (8 + Math.floor(noise(`${seed}:hour`) * 9)) * HOUR_MS + Math.floor(noise(`${seed}:min`) * 60) * 60_000;
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
            const stepsDone = Math.floor(noise(`${seed}:done`) * totalSteps);
            allInstances.push({
                key: `wf-${day}-${i}`,
                node: DOCUMENTS[Math.floor(noise(`${seed}:doc`) * DOCUMENTS.length)],
                type: noise(`${seed}:type`) < 0.85 ? "publish" : "unpublish",
                status: open ? WORKFLOW_STATUS.pendingApproval : status,
                requestedBy: USERS[Math.floor(noise(`${seed}:user`) * USERS.length)],
                requestedOn: asDateTime(requested),
                completedOn: open ? null : asDateTime(finished),
                currentStep: !open && status === WORKFLOW_STATUS.approved ? totalSteps : stepsDone,
                totalSteps,
            });
        }
    }
    return allInstances;
}

/** The days of the last `days` days, today included. */
const lastDays = (days: number) => uauiDaysIn({ from: addDays(WORKFLOW_TODAY, -(Math.max(1, days) - 1)), to: WORKFLOW_TODAY });

/** How a call to the fake API behaves: how long it takes, and whether it fails (rejects) like a server error would. */
export type FakeApiOptions = { latencyMs?: number; fail?: boolean };

async function respond({ latencyMs = 0, fail = false }: FakeApiOptions, what: string): Promise<void> {
    await wait(latencyMs);
    if (fail) throw new Error(`The ${what} request failed.`);
}

/** GET /workflow/chart/activity?days=N. */
export async function getActivity(query: { days: number }, options: FakeApiOptions = {}): Promise<WorkflowActivityResponse> {
    await respond(options, "approval activity");
    const days = lastDays(query.days);
    const all = instances();
    const finishedOn = (status: WorkflowStatusCode) => (day: string) => all.filter((w) => w.status === status && w.completedOn?.startsWith(day)).length;
    const pendingAt = (day: string) => {
        const end = Math.min(utcMidnight(day) + DAY_MS - 1, NOW_TIME);
        return all.filter((w) => asTime(w.requestedOn) <= end && (w.completedOn === null || asTime(w.completedOn) > end)).length;
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
        totals: { approved: 0, rejected: 0, cancelled: 0, pending: pendingAt(WORKFLOW_TODAY) },
    };
    for (const name of ["approved", "rejected", "cancelled"] as const) result.totals[name] = result.series.find((s) => s.name === name)!.data.reduce((sum, p) => sum + p.y, 0);
    return result;
}

/** GET /workflow/chart/reviews?days=N&ahead=M. */
export async function getReviews(query: { days: number; ahead: number }, options: FakeApiOptions = {}): Promise<WorkflowReviewsResponse> {
    await respond(options, "content reviews");
    const days = uauiDaysIn({ from: addDays(WORKFLOW_TODAY, -(Math.max(1, query.days) - 1)), to: addDays(WORKFLOW_TODAY, query.ahead) });
    const dueOn = (day: string) => (day < INSTALLED ? 0 : Math.round(noise(`${day}:due`) ** 2 * 5));
    const reviewedOf = (day: string) => (day > WORKFLOW_TODAY ? 0 : Math.round(dueOn(day) * (0.5 + noise(`${day}:reviewed`) * 0.5)));
    const point = (day: string, y: number) => ({ x: utcMidnight(day), y });
    return {
        series: [
            { name: "reviewed", data: days.map((d) => point(d, reviewedOf(d))) },
            { name: "overdue", data: days.map((d) => point(d, d > WORKFLOW_TODAY ? 0 : dueOn(d) - reviewedOf(d))) },
            { name: "upcoming", data: days.map((d) => point(d, d > WORKFLOW_TODAY ? dueOn(d) : 0)) },
        ],
    };
}

/** GET /workflow/instances?days=N&status=S: newest first. Without a status, every instance. */
export async function getInstances(query: { days: number; status?: WorkflowStatusCode }, options: FakeApiOptions = {}): Promise<WorkflowInstancesResponse> {
    await respond(options, "workflow history");
    const from = lastDays(query.days)[0];
    const items = instances()
        .filter((w) => w.requestedOn >= from || w.completedOn === null || w.completedOn >= from)
        .filter((w) => query.status === undefined || w.status === query.status)
        .sort((a, b) => b.requestedOn.localeCompare(a.requestedOn));
    return { items, total: items.length };
}
