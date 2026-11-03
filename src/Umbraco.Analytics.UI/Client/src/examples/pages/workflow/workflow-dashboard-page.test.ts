// T63 — Workflow example page: Workflow's admin dashboard, handled by the package, with data shaped like an invented Workflow dashboard API.
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { axeRun } from "../../../internal/test/a11y.js";
import { renderPageExample, withTheme } from "../../../internal/test/page-example.js";
import { settle, shadow, type UauiTestElement } from "../../../internal/test/dom.js";
import "./workflow-dashboard-page.element.js";
import { getActivity, getInstances, getReviews, WORKFLOW_STATUS, type WorkflowInstance, type WorkflowStatusCode } from "./workflow-fake-data.js";
import { workflowApprovalTimes, workflowChartToday, workflowHistoryRows, workflowIsEmpty, workflowSeries, workflowStatus, workflowStatusCodes } from "./workflow-dashboard-adapter.js";
import type { UauiTimeSeriesChartElement } from "../../../chart/time-series-chart.element.js";
import type { UauiKpiTileElement } from "../../../kpi-tile/kpi-tile.element.js";
import type { UauiStatElement } from "../../../stat/stat.element.js";
import type { UauiToggleGroupElement } from "../../../toggle-group/toggle-group.element.js";
import type { UauiTableColumn } from "../../../table/types.js";

type TestTable = UauiTestElement & { loading: boolean; error: boolean; label: string; rows: Record<string, unknown>[]; columns: UauiTableColumn[] };

const TAG = "example-workflow-dashboard-page";
/** The example install's today in every zone from UTC-11 to UTC+11, the browser running the tests included. */
const WORKFLOW_TODAY = "2026-06-22";
const tiles = (page: Element) => [...shadow(page).querySelectorAll<UauiKpiTileElement>("uaui-kpi-tile")];
const tile = (page: Element, label: string) => tiles(page).find((t) => t.label === label)!;
const box = (page: Element, id: string) => shadow(page).querySelector(`[data-box='${id}'] > uui-box`) as HTMLElement & { headline: string };
const chartIn = (page: Element, id: string) => box(page, id).querySelector("uaui-time-series-chart") as UauiTimeSeriesChartElement;
const table = (page: Element) => box(page, "history").querySelector("uaui-data-table") as unknown as TestTable;
const filter = (page: Element) => box(page, "history").querySelector("uui-select") as HTMLElement & { value: string };
const stats = (page: Element) => [...box(page, "activity").querySelectorAll<UauiStatElement>("uaui-stat")];
const ready = (page: Element) => tiles(page).every((t) => !t.loading) && ["activity", "reviews"].every((id) => !chartIn(page, id).loading) && !table(page).loading;

async function renderPage(failing = false): Promise<UauiTestElement> {
    const page = await renderPageExample(html`<example-workflow-dashboard-page .latency=${0} ?failing=${failing}></example-workflow-dashboard-page>`, TAG);
    await expect.poll(() => ready(page)).toBe(true);
    await settle(page);
    return page;
}

/** A made-up instance, for the adapter's own tests: requested at 09:00 (UTC+2) on 1 June, finished `hours` later (or still open). */
const instance = (status: WorkflowStatusCode, hours: number | null, key = `k${Math.random()}`): WorkflowInstance => ({
    key,
    node: { key: "doc-1", name: "Home" },
    type: "publish",
    status,
    requestedBy: { key: "user-1", name: "Ana Lima" },
    requestedOn: "2026-06-01T09:00:00+02:00",
    completedOn: hours === null ? null : new Date(Date.parse("2026-06-01T09:00:00+02:00") + hours * 3_600_000).toISOString(),
    currentStep: 1,
    totalSteps: 3,
});
const HOUR = 3_600_000;

describe("Feature: the Workflow dashboard page", () => {
    describe("Scenario: accessibility", () => {
        const audit = (themeCss?: string) => withTheme(themeCss, async () => axeRun(await renderPage()));

        it("passes the a11y audit in the light theme", async () => {
            expect(await audit()).toHaveNoViolations();
        });

        it("passes the a11y audit in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });

        it("passes the a11y audit in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });
    });

    describe("Scenario: the adapter turns Workflow's answers into the package's shapes", () => {
        it("maps each status code to a status id and colour, resubmitted as pending", () => {
            expect(workflowStatus(WORKFLOW_STATUS.approved)).toEqual({ id: "approved", color: "positive" });
            expect(workflowStatus(WORKFLOW_STATUS.rejected)).toEqual({ id: "rejected", color: "danger" });
            expect(workflowStatus(WORKFLOW_STATUS.pendingApproval)).toEqual({ id: "pending", color: "warning" });
            expect(workflowStatus(WORKFLOW_STATUS.resubmitted)).toEqual({ id: "pending", color: "warning" });
            expect(workflowStatus(WORKFLOW_STATUS.cancelled)).toEqual({ id: "cancelled", color: "default" });
            expect(workflowStatus(WORKFLOW_STATUS.errored)).toEqual({ id: "errored", color: "danger" });
            expect(workflowStatus(99)).toEqual({ id: "pending", color: "default" });
        });

        it("makes series in the order asked, reading each point's day from its UTC-midnight x, with colour and kind", () => {
            const x = Date.parse("2026-06-01T00:00:00Z");
            const series = workflowSeries(
                [
                    { name: "pending", data: [{ x, y: 4 }] },
                    { name: "approved", data: [{ x, y: 2 }, { x: x + 86_400_000, y: 0 }] },
                ],
                [
                    { name: "approved", label: "Approved", color: "positive" },
                    { name: "pending", label: "Pending", color: "warning", kind: "line" },
                    { name: "rejected", label: "Rejected" },
                ],
            );
            expect(series).toEqual([
                { id: "approved", label: "Approved", color: "positive", points: [{ date: "2026-06-01", value: 2 }, { date: "2026-06-02", value: 0 }] },
                { id: "pending", label: "Pending", color: "warning", kind: "line", points: [{ date: "2026-06-01", value: 4 }] },
            ]);
            expect(workflowSeries(undefined, [{ name: "approved", label: "Approved" }])).toEqual([]);
        });

        it("says an answer of only zeros is empty", () => {
            expect(workflowIsEmpty([{ name: "a", data: [{ x: 0, y: 0 }] }])).toBe(true);
            expect(workflowIsEmpty([{ name: "a", data: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }])).toBe(false);
            expect(workflowIsEmpty(undefined)).toBe(false);
        });

        it("reads today from the answer, in the same frame as its points", () => {
            expect(workflowChartToday({ today: Date.parse("2026-06-23T00:00:00Z") })).toBe("2026-06-23");
            expect(workflowChartToday(undefined)).toBeUndefined();
        });

        it("asks for pending approval and resubmitted when filtering on pending, one code for the others", () => {
            expect(workflowStatusCodes("pending")).toEqual([WORKFLOW_STATUS.pendingApproval, WORKFLOW_STATUS.resubmitted]);
            expect(workflowStatusCodes("rejected")).toEqual([WORKFLOW_STATUS.rejected]);
            expect(workflowStatusCodes("approved")).toEqual([WORKFLOW_STATUS.approved]);
        });

        it("flattens history items into rows with their status id and colour", () => {
            const [row] = workflowHistoryRows([instance(WORKFLOW_STATUS.pendingApproval, null, "k1")]);
            expect(row).toEqual({
                key: "k1",
                nodeKey: "doc-1",
                document: "Home",
                type: "publish",
                requestedBy: "Ana Lima",
                requestedOn: "2026-06-01T09:00:00+02:00",
                completedOn: null,
                currentStep: 1,
                totalSteps: 3,
                status: "pending",
                statusColor: "warning",
            });
            expect(workflowHistoryRows(undefined)).toEqual([]);
        });
    });

    describe("Scenario: approval times (Workflow's fastest and average bugs)", () => {
        it("gives fastest, slowest and average of finished approvals", () => {
            const times = workflowApprovalTimes([instance(WORKFLOW_STATUS.approved, 2), instance(WORKFLOW_STATUS.approved, 10), instance(WORKFLOW_STATUS.approved, 6)]);
            expect(times).toEqual({ fastest: 2 * HOUR, slowest: 10 * HOUR, average: 6 * HOUR, count: 3 });
        });

        it("finds the real fastest, not 0 from its starting value", () => {
            expect(workflowApprovalTimes([instance(WORKFLOW_STATUS.approved, 5), instance(WORKFLOW_STATUS.approved, 3)]).fastest).toBe(3 * HOUR);
        });

        it("keeps an approval made on the spot as a fastest of 0, not as no value", () => {
            const times = workflowApprovalTimes([instance(WORKFLOW_STATUS.approved, 0), instance(WORKFLOW_STATUS.approved, 4)]);
            expect(times.fastest).toBe(0);
            expect(times.average).toBe(2 * HOUR);
        });

        it("leaves pending, rejected, cancelled and errored workflows out of every figure, the average included", () => {
            const times = workflowApprovalTimes([
                instance(WORKFLOW_STATUS.approved, 4),
                instance(WORKFLOW_STATUS.pendingApproval, null),
                instance(WORKFLOW_STATUS.rejected, 1),
                instance(WORKFLOW_STATUS.cancelled, 100),
                instance(WORKFLOW_STATUS.errored, 50),
                // Approved but with no completion date: not finished, so no time.
                instance(WORKFLOW_STATUS.approved, null),
            ]);
            expect(times).toEqual({ fastest: 4 * HOUR, slowest: 4 * HOUR, average: 4 * HOUR, count: 1 });
        });

        it("measures elapsed time across a daylight saving change from the offsets, not the wall clock", () => {
            // London, 29 March 2026: clocks go forward at 01:00 UTC. 00:30 GMT to 03:30 BST is two hours, not three.
            const spring = { ...instance(WORKFLOW_STATUS.approved, 0), requestedOn: "2026-03-29T00:30:00+00:00", completedOn: "2026-03-29T03:30:00+01:00" };
            expect(workflowApprovalTimes([spring]).fastest).toBe(2 * HOUR);
            // 25 October 2026: clocks go back. 01:30 BST to 01:10 GMT is 40 minutes later, though the wall clock went back.
            const autumn = { ...instance(WORKFLOW_STATUS.approved, 0), requestedOn: "2026-10-25T01:30:00+01:00", completedOn: "2026-10-25T01:10:00+00:00" };
            expect(workflowApprovalTimes([autumn]).fastest).toBe(40 * 60_000);
        });

        it("has no figures when no approval finished", () => {
            expect(workflowApprovalTimes([instance(WORKFLOW_STATUS.pendingApproval, null)])).toEqual({ count: 0 });
            expect(workflowApprovalTimes(undefined)).toEqual({ count: 0 });
        });
    });

    describe("Scenario: days and today in the editor's time zone", () => {
        // The fake install answers at 12:00 UTC on 22 June: 23 June 02:00 at UTC+14, 22 June 22:00 at UTC+10, and
        // 22 June 05:00 at UTC-7. Each answer's last day and its today agree, whatever the browser's own zone.
        const zones: [string, string][] = [
            ["Pacific/Kiritimati", "2026-06-23"],
            ["Australia/Brisbane", "2026-06-22"],
            ["America/Los_Angeles", "2026-06-22"],
            ["UTC", "2026-06-22"],
        ];
        for (const [timeZone, day] of zones) {
            it(`puts today on the answer's last day in ${timeZone}`, async () => {
                const activity = await getActivity({ days: 7, timeZone });
                const series = workflowSeries(activity.series, [{ name: "approved", label: "Approved" }]);
                expect(workflowChartToday(activity)).toBe(day);
                expect(series[0].points[series[0].points.length - 1].date).toBe(day);
                const reviews = await getReviews({ days: 7, ahead: 14, timeZone });
                expect(workflowSeries(reviews.series, [{ name: "reviewed", label: "Reviewed" }])[0].points.map((p) => p.date)).toContain(workflowChartToday(reviews));
            });
        }

        it("writes the history's date-times with the zone's offset, and the same instant in every zone", async () => {
            const [brisbane, losAngeles] = await Promise.all([getInstances({ days: 7, timeZone: "Australia/Brisbane" }), getInstances({ days: 7, timeZone: "America/Los_Angeles" })]);
            expect(brisbane.items[0].requestedOn).toMatch(/\+10:00$/);
            expect(losAngeles.items[0].requestedOn).toMatch(/-07:00$/);
            expect(Date.parse(brisbane.items[0].requestedOn)).toBe(Date.parse(losAngeles.items[0].requestedOn));
        });
    });

    describe("Scenario: the fake API answers like the imagined Workflow API", () => {
        it("lists pending approval and resubmitted instances for the pending codes, as many as the Pending tile counts", async () => {
            const activity = await getActivity({ days: 30 });
            const { items } = await getInstances({ days: 30, statuses: workflowStatusCodes("pending") });
            expect(items.length).toBe(activity.totals.pending);
            expect(new Set(items.map((w) => w.status))).toEqual(new Set([WORKFLOW_STATUS.pendingApproval, WORKFLOW_STATUS.resubmitted]));
        });

        it("answers a series per status, one point per day, and pending now as the pending total", async () => {
            const r = await getActivity({ days: 7 });
            expect(r.series.map((s) => s.name)).toEqual(["approved", "rejected", "cancelled", "pending"]);
            expect(r.series.every((s) => s.data.length === 7)).toBe(true);
            const pending = r.series.find((s) => s.name === "pending")!.data;
            expect(r.totals.pending).toBe(pending[pending.length - 1].y);
            expect(r.totals.approved).toBe(r.series[0].data.reduce((sum, p) => sum + p.y, 0));
        });
    });

    describe("Scenario: every section", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("shows the approval activity, content reviews and history boxes", () => {
            expect(["activity", "reviews", "history"].map((id) => box(page, id)?.headline)).toEqual(["Approval activity", "Content reviews", "Workflow history"]);
        });

        it("shows a tile per status in its status colour, each one openable and none selectable", async () => {
            expect(tiles(page).map((t) => [t.label, t.color])).toEqual([
                ["Approved", "positive"],
                ["Pending", "warning"],
                ["Rejected", "danger"],
                ["Cancelled", "default"],
            ]);
            expect(tiles(page).every((t) => t.openable && !t.selectable)).toBe(true);
            const activity = await getActivity({ days: 30 });
            expect(tile(page, "Pending").value).toBe(activity.totals.pending);
        });

        it("draws approved, rejected and cancelled as status-coloured bars and pending as a line, with today and a log axis", () => {
            const chart = chartIn(page, "activity");
            expect(chart.kind).toBe("bar");
            expect(chart.series.map((s) => [s.id, s.color, s.kind])).toEqual([
                ["approved", "positive", undefined],
                ["rejected", "danger", undefined],
                ["cancelled", "default", undefined],
                ["pending", "warning", "line"],
            ]);
            expect(chart.series[0].points).toHaveLength(30);
            expect(chart.today).toBe(WORKFLOW_TODAY);
            expect(chart.series[0].points[chart.series[0].points.length - 1].date).toBe(WORKFLOW_TODAY);
            expect(chart.yScale).toBe("log");
        });

        it("switches the activity chart to a linear axis", async () => {
            const scale = box(page, "activity").querySelector("uaui-toggle-group") as UauiToggleGroupElement;
            (shadow(scale).querySelector("[data-value='linear']") as HTMLElement).click();
            await page.updateComplete;
            expect(chartIn(page, "activity").yScale).toBe("linear");
        });

        it("shows a named loading bar, not the old figures, while a new period loads", async () => {
            (page as UauiTestElement & { latency: number }).latency = 200;
            const period = shadow(page).querySelector(".actions uaui-toggle-group") as UauiToggleGroupElement;
            (shadow(period).querySelector("[data-value='7']") as HTMLElement).click();
            await page.updateComplete;
            expect(stats(page)).toHaveLength(0);
            expect(box(page, "activity").querySelector(".times-loading")?.getAttribute("aria-label")).toBe("Loading");
            await expect.poll(() => stats(page).length).toBe(3);
        });

        it("shows the fastest, average and slowest approval of the period", async () => {
            expect(stats(page).map((s) => s.label)).toEqual(["Fastest approval", "Average approval", "Slowest approval"]);
            expect(stats(page).every((s) => /\d/.test(s.shadowRoot?.querySelector(".value")?.textContent ?? ""))).toBe(true);
            const { items } = await getInstances({ days: 30 });
            expect(workflowApprovalTimes(items).count).toBeGreaterThan(0);
        });

        it("stacks reviews due each day, back and two weeks ahead of today", () => {
            const chart = chartIn(page, "reviews");
            expect(chart.kind).toBe("stacked-bar");
            expect(chart.series.map((s) => [s.id, s.color])).toEqual([
                ["reviewed", "positive"],
                ["overdue", "danger"],
                ["upcoming", 1],
            ]);
            expect(chart.series[0].points).toHaveLength(30 + 14);
            expect(chart.today).toBe(WORKFLOW_TODAY);
            const upcomingBeforeToday = chart.series[2].points.filter((p) => p.date <= WORKFLOW_TODAY && p.value > 0);
            expect(upcomingBeforeToday).toEqual([]);
        });

        it("lists the history with a progress cell for the steps and a status cell for the status", () => {
            const t = table(page);
            expect(t.label).toBe("Workflow history");
            expect(t.columns.map((c) => c.key)).toEqual(["document", "typeText", "requestedBy", "requestedOn", "completedOn", "currentStep", "status"]);
            expect(t.columns.find((c) => c.key === "currentStep")).toMatchObject({ elementName: "uaui-progress-cell", meta: { totalKey: "totalSteps" } });
            expect(t.columns.find((c) => c.key === "status")).toMatchObject({ elementName: "uaui-status-cell", meta: { textKey: "statusText", colorKey: "statusColor" } });
            expect(t.rows.length).toBeGreaterThan(0);
            expect(new Set(t.rows.map((r) => r.status)).size).toBeGreaterThan(1);
            const progress = shadow(t).querySelector("uaui-progress-cell");
            expect(progress && shadow(progress).textContent).toMatch(/\d of \d/);
        });

        it("reloads every part for a shorter period", async () => {
            const period = shadow(page).querySelector(".actions uaui-toggle-group") as UauiToggleGroupElement;
            (shadow(period).querySelector("[data-value='7']") as HTMLElement).click();
            await expect.poll(() => chartIn(page, "activity").series[0]?.points.length).toBe(7);
            await expect.poll(() => chartIn(page, "reviews").series[0]?.points.length).toBe(7 + 14);
        });
    });

    describe("Scenario: a status tile drills down to the history", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("filters the history by the tile's status and moves focus to the filter", async () => {
            (shadow(tile(page, "Rejected")).querySelector("button") as HTMLElement).click();
            await expect.poll(() => filter(page).value).toBe("rejected");
            await expect.poll(() => !table(page).loading && table(page).rows.length > 0 && table(page).rows.every((r) => r.status === "rejected")).toBe(true);
            expect(page.shadowRoot!.activeElement).toBe(filter(page));
        });

        it("lists pending approval and resubmitted workflows from the Pending tile, as many as it counts", async () => {
            (shadow(tile(page, "Pending")).querySelector("button") as HTMLElement).click();
            await expect.poll(() => filter(page).value).toBe("pending");
            await expect.poll(() => !table(page).loading && table(page).rows.every((r) => r.status === "pending")).toBe(true);
            expect(table(page).rows.length).toBe(tile(page, "Pending").value);
        });

        it("shows every status again when the filter is set back to all", async () => {
            (shadow(tile(page, "Cancelled")).querySelector("button") as HTMLElement).click();
            await expect.poll(() => table(page).rows.every((r) => r.status === "cancelled")).toBe(true);
            const select = filter(page);
            select.value = "all";
            select.dispatchEvent(new Event("change", { bubbles: true }));
            await expect.poll(() => new Set(table(page).rows.map((r) => r.status)).size).toBeGreaterThan(1);
        });
    });

    describe("Scenario (sad path): the API fails", () => {
        it("shows the error state on the tiles, both charts and the table, with Retry, and no approval times", async () => {
            const page = await renderPage(true);
            expect(tiles(page).every((t) => t.error)).toBe(true);
            expect(["activity", "reviews"].every((id) => chartIn(page, id).error && chartIn(page, id).retryable)).toBe(true);
            expect(table(page).error).toBe(true);
            expect(stats(page)).toHaveLength(0);
        });
    });
});
