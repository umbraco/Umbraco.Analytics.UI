/// <reference types="vite/client" />
// T62 — Forms analytics page example: Forms' overview and a form's analytics, handled by the package, with data shaped like Forms' API.
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { axeRun } from "../../../internal/test/a11y.js";
import { renderPageExample, saveDateRange, withTheme } from "../../../internal/test/page-example.js";
import { deepQuery, deepQueryAll, deepText, settle, shadow, type UauiTestElement } from "../../../internal/test/dom.js";
import "./forms-analytics-page.element.js";
import { FORMS, postSubmissions, type FormsAnalyticsResult } from "./forms-fake-data.js";
import { formsRateSeries, formsRows, formsSeries, formsSeriesBy, formsSteps, formsTotal } from "./forms-analytics-adapter.js";
import { uauiCompareFor } from "../../../date-helpers/index.js";
import type { UauiCompare, UauiDateRange } from "../../../date-range/types.js";
import type { UauiTimeSeriesChartElement } from "../../../chart/time-series-chart.element.js";
import type { UauiKpiTileElement } from "../../../kpi-tile/kpi-tile.element.js";
import type { UauiFunnelElement } from "../../../funnel/funnel.element.js";
import type { UauiStatElement } from "../../../stat/stat.element.js";
import type { UauiTableColumn } from "../../../table/types.js";

type TestTable = UauiTestElement & {
    loading: boolean;
    error: boolean;
    label: string;
    rows: Record<string, unknown>[];
    compareRows: Record<string, unknown>[];
    columns: UauiTableColumn[];
};

const TAG = "example-forms-analytics-page";
const FIRST_RANGE: UauiDateRange = { from: "2026-05-25", to: "2026-06-23" };
const FIRST_COMPARE = uauiCompareFor("previous-period", FIRST_RANGE)!;
const SAMPLE_FORM = FORMS[0];

const tiles = (page: Element) => [...shadow(page).querySelectorAll<UauiKpiTileElement>("uaui-kpi-tile")];
const tile = (page: Element, label: string) => tiles(page).find((t) => t.label === label)!;
const box = (page: Element, id: string) => shadow(page).querySelector(`[data-box='${id}'] > uui-box`) as HTMLElement & { headline: string };
const chartIn = (page: Element, id: string) => box(page, id).querySelector("uaui-time-series-chart") as UauiTimeSeriesChartElement;
const tableIn = (page: Element, id: string) => box(page, id).querySelector("uaui-data-table") as unknown as TestTable;
const funnel = (page: Element) => box(page, "funnel").querySelector("uaui-funnel") as UauiFunnelElement;
const headerStat = (page: Element) => box(page, "funnel").querySelector("uaui-stat[slot='header-actions']") as UauiStatElement | null;
const formPicker = (page: Element) => shadow(page).querySelector("uui-select") as HTMLElement & { value: string };
const pageProps = (page: UauiTestElement) => page as UauiTestElement & { latency: number; failing: boolean };
const dataRows = (table: Element) => [...shadow(table).querySelectorAll<HTMLElement>("uui-table-row:not([part~='header']):not(.column-toolbar)")];
const changeRange = (page: Element, value: UauiDateRange, compare?: UauiCompare) =>
    shadow(page).querySelector("uaui-date-range")!.dispatchEvent(new CustomEvent("change", { detail: { value, compare } }));
const afterTimer = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const tables = (page: Element) => ["forms", "workflows", "origins"].map((id) => tableIn(page, id));
const charts = (page: Element) => ["submissions", "formSubmissions", "origins"].map((id) => chartIn(page, id));

const ready = (page: Element) =>
    tiles(page).every((t) => !t.loading) && charts(page).every((c) => !c.loading) && tables(page).every((t) => !t.loading) && !funnel(page).loading;

async function renderPage(): Promise<UauiTestElement> {
    const page = await renderPageExample(html`<example-forms-analytics-page .latency=${0}></example-forms-analytics-page>`, TAG);
    await expect.poll(() => ready(page)).toBe(true);
    await settle(page);
    return page;
}

async function pickForm(page: UauiTestElement, id: string) {
    const select = formPicker(page);
    select.value = id;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await page.updateComplete;
    await expect.poll(() => ready(page)).toBe(true);
    await settle(page);
}

/** A made-up Forms answer, for the adapter's own tests. */
const answer = (columns: string[], rows: (string | number | boolean)[][], uniqueMembers = 0) =>
    ({ columns, rows, currentPage: 1, rowsPerPage: 9999, totalRows: rows.length, totalPages: 1, fromRow: 1, toRow: rows.length, uniqueMembers }) as FormsAnalyticsResult;

describe("Feature: the Forms analytics page", () => {
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

    describe("Scenario: the adapter turns Forms' columns and rows into the package's shapes", () => {
        it("keys each row by its column names", () => {
            const rows = formsRows(answer(["workflowId", "workflowName", "triggered"], [["w1", "Send email", 12]]));
            expect(rows).toEqual([{ workflowId: "w1", workflowName: "Send email", triggered: 12 }]);
        });

        it("reads a metric by its column name, not its position, and takes the day of Forms' date-times", () => {
            const r = answer(
                ["date", "workflowErrors", "entries"],
                [
                    ["2026-06-01T00:00:00", 1, 10],
                    ["2026-06-02T00:00:00", 0, 12],
                ],
            );
            const [entries, errors] = formsSeries(r, [
                { column: "entries", label: "Entries" },
                { column: "workflowErrors", label: "Workflow errors", color: "danger" },
            ]);
            expect(entries).toEqual({ id: "entries", label: "Entries", points: [{ date: "2026-06-01", value: 10 }, { date: "2026-06-02", value: 12 }] });
            expect(errors.color).toBe("danger");
            expect(errors.points.map((p) => p.value)).toEqual([1, 0]);
        });

        it("reads a week or month bucket column as the date", () => {
            const r = answer(["week", "entries"], [["2026-06-01T00:00:00", 70]]);
            expect(formsSeries(r, [{ column: "entries", label: "Entries" }])[0].points).toEqual([{ date: "2026-06-01", value: 70 }]);
        });

        it("leaves out a series whose column the answer doesn't have", () => {
            expect(formsSeries(answer(["date", "entries"], [["2026-06-01", 1]]), [{ column: "uniqueMembers", label: "Unique members" }])).toEqual([]);
        });

        it("works out a rate per bucket, leaving a gap where there is nothing to divide by", () => {
            const r = answer(
                ["date", "workflowErrors", "triggered"],
                [
                    ["2026-06-01T00:00:00", 1, 20],
                    ["2026-06-02T00:00:00", 0, 0],
                ],
            );
            expect(formsRateSeries(r, "failureRate", "Workflow failure rate", "workflowErrors", "triggered")[0].points).toEqual([{ date: "2026-06-01", value: 5 }]);
        });

        it("makes one series per source page from [date, pageName, entries] rows", () => {
            const r = answer(
                ["date", "pageName", "entries"],
                [
                    ["2026-06-01T00:00:00", "Home", 3],
                    ["2026-06-01T00:00:00", "Events", 5],
                    ["2026-06-02T00:00:00", "Home", 4],
                    ["2026-06-02T00:00:00", "Events", 6],
                ],
            );
            const series = formsSeriesBy(r, "pageName", "entries");
            expect(series.map((s) => s.id)).toEqual(["Home", "Events"]);
            expect(series[1].points).toEqual([{ date: "2026-06-01", value: 5 }, { date: "2026-06-02", value: 6 }]);
        });

        it("turns [state, entries] rows into funnel steps in the given order, a missing state counting 0", () => {
            const r = answer(["state", "entries"], [["submitted", 4], ["opened", 10]]);
            const steps = formsSteps(r, [
                { state: "opened", label: "Opened" },
                { state: "partiallySubmitted", label: "Partially submitted" },
                { state: "submitted", label: "Submitted" },
            ]);
            expect(steps.map((s) => [s.id, s.value])).toEqual([["opened", 10], ["partiallySubmitted", 0], ["submitted", 4]]);
        });

        it("sums a column over every row", () => {
            expect(formsTotal(answer(["date", "entries"], [["a", 2], ["b", 3]]), "entries")).toBe(5);
            expect(formsTotal(undefined, "entries")).toBe(0);
        });
    });

    describe("Scenario: the fake API answers like Forms' API", () => {
        it("answers columns, rows, paging and unique members", async () => {
            const r = await postSubmissions({ startDate: FIRST_RANGE.from, endDate: FIRST_RANGE.to, metrics: ["entries", "workflowErrors"], dimensions: ["date"] });
            expect(r.columns).toEqual(["date", "entries", "workflowErrors"]);
            expect(r.rows).toHaveLength(30);
            expect(r.rows[0][0]).toBe("2026-05-25T00:00:00");
            expect(r).toMatchObject({ currentPage: 1, totalRows: 30, totalPages: 1, fromRow: 1, toRow: 30 });
            expect(r.uniqueMembers).toBeGreaterThan(0);
        });

        it("gives the same numbers for the same range", async () => {
            const query = { startDate: FIRST_RANGE.from, endDate: FIRST_RANGE.to, metrics: ["entries" as const], dimensions: ["date" as const] };
            expect(await postSubmissions(query)).toEqual(await postSubmissions(query));
        });
    });

    describe("Scenario: every box of both sections", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("shows the overview's chart and forms table, then the form's submissions, workflows, completion funnel and origins", () => {
            expect(["submissions", "forms", "formSubmissions", "workflows", "funnel", "origins"].map((id) => box(page, id)?.headline)).toEqual([
                "Submissions",
                "Forms",
                "Submissions",
                "Workflows",
                "Completion",
                "Origins by source page",
            ]);
        });

        it("labels every table", () => {
            expect(tables(page).map((t) => t.label)).toEqual(["Forms", "Workflows", "Source pages"]);
        });

        it("has no submissions by hour of day box yet (needs T60)", () => {
            expect(deepText(shadow(page))).not.toContain("hour of day");
            expect(shadow(page).querySelectorAll("uaui-time-series-chart")).toHaveLength(3);
        });
    });

    describe("Scenario: the boxes in two columns", () => {
        const rect = (el: Element) => el.getBoundingClientRect();
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("lets the charts and the forms table span both columns", () => {
            for (const id of ["submissions", "forms", "formSubmissions", "origins"]) {
                const grid = rect(box(page, id).closest(".boxes")!);
                expect(rect(box(page, id)).width, id).toBeCloseTo(grid.width, 0);
            }
        });

        it("pairs the workflows and the funnel side by side, in equal columns", () => {
            const left = rect(box(page, "workflows"));
            const right = rect(box(page, "funnel"));
            expect(right.top).toBe(left.top);
            expect(right.left).toBeGreaterThan(left.right);
            expect(right.width).toBeCloseTo(left.width, 0);
        });

        it("puts every box in one column on a narrow page, and still passes the a11y audit", async () => {
            (page.parentElement as HTMLElement).style.width = "600px";
            await settle(page);
            const grid = rect(box(page, "workflows").closest(".boxes")!);
            expect(rect(box(page, "workflows")).width).toBeCloseTo(grid.width, 0);
            expect(rect(box(page, "funnel")).top).toBeGreaterThan(rect(box(page, "workflows")).bottom);
            expect(await axeRun(page)).toHaveNoViolations();
        });
    });

    describe("Scenario: the KPI tiles", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("shows entries, unique members and the workflow failure rate, every one selectable, entries selected", () => {
            expect(tiles(page).map((t) => t.label)).toEqual(["Entries", "Unique members", "Workflow failure rate"]);
            expect(tiles(page).every((t) => t.selectable)).toBe(true);
            expect(tiles(page).filter((t) => t.selected).map((t) => t.label)).toEqual(["Entries"]);
        });

        it("takes unique members from the answer's own figure, not the buckets added up", async () => {
            const r = await postSubmissions({ startDate: FIRST_RANGE.from, endDate: FIRST_RANGE.to, metrics: ["entries", "uniqueMembers"], dimensions: ["date"] });
            expect(tile(page, "Unique members").current).toBe(r.uniqueMembers);
            expect(r.uniqueMembers).toBeLessThan(formsTotal(r, "uniqueMembers"));
        });

        it("compares the failure rate in points, where a fall is good", () => {
            const rate = tile(page, "Workflow failure rate");
            expect(rate.deltaUnit).toBe("points");
            expect(rate.lowerIsBetter).toBe(true);
            expect(Number.isFinite(rate.current)).toBe(true);
        });

        it("compares with the second query's figures, for the comparison range", async () => {
            const r = await postSubmissions({ startDate: FIRST_COMPARE.from, endDate: FIRST_COMPARE.to, metrics: ["entries"], dimensions: ["date"] });
            expect(tile(page, "Entries").previous).toBe(formsTotal(r, "entries"));
        });
    });

    describe("Scenario: the overview chart", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("draws entries and, in the danger colour, workflow errors, for both periods", () => {
            const chart = chartIn(page, "submissions");
            expect(chart.series.map((s) => [s.id, s.color])).toEqual([
                ["entries", undefined],
                ["workflowErrors", "danger"],
            ]);
            expect(chart.compareSeries.map((s) => s.id)).toEqual(["entries", "workflowErrors"]);
            expect(chart.compareLabel).toBeTruthy();
        });

        it("switches to unique members when its tile is pressed", async () => {
            (shadow(tile(page, "Unique members")).querySelector("button") as HTMLElement).click();
            await page.updateComplete;
            expect(chartIn(page, "submissions").series.map((s) => s.id)).toEqual(["uniqueMembers"]);
            expect(box(page, "submissions").headline).toBe("Unique members");
            expect(tiles(page).filter((t) => t.selected).map((t) => t.label)).toEqual(["Unique members"]);
        });

        it("plots the failure rate as a percent where lower is better when its tile is pressed", async () => {
            (shadow(tile(page, "Workflow failure rate")).querySelector("button") as HTMLElement).click();
            await page.updateComplete;
            const chart = chartIn(page, "submissions");
            expect(chart.series.map((s) => s.id)).toEqual(["failureRate"]);
            expect(chart.valueFormat).toMatchObject({ style: "unit", unit: "percent" });
            expect(chart.lowerIsBetter).toBe(true);
        });
    });

    describe("Scenario: group by week", () => {
        let page: UauiTestElement;
        let formRows: unknown[];
        beforeEach(async () => {
            page = await renderPage();
            formRows = tableIn(page, "forms").rows;
            const week = deepQuery<HTMLElement>(shadow(page).querySelector("uaui-group-by")!.shadowRoot!, "[data-value='week']")!;
            week.click();
            await expect.poll(() => ready(page) && chartIn(page, "submissions").groupBy === "week" && chartIn(page, "submissions").series[0].points.length === 5).toBe(true);
        });

        it("asks for weeks and plots one point per week, at its first day, on every chart", () => {
            for (const chart of charts(page)) {
                expect(chart.groupBy).toBe("week");
                expect(chart.series[0].points.map((p) => p.date)).toEqual(["2026-05-25", "2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22"]);
            }
        });

        it("keeps the tables as they were", () => {
            expect(tableIn(page, "forms").rows).toBe(formRows);
        });
    });

    describe("Scenario: compare off", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            await saveDateRange(page, { from: "2026-04-01", to: "2026-04-30", compare: "off" });
            await expect.poll(() => ready(page) && chartIn(page, "submissions").compareSeries.length === 0).toBe(true);
        });

        it("drops the compare lines, compare rows, compare steps and the tiles' previous figures", () => {
            expect(chartIn(page, "formSubmissions").compareSeries).toHaveLength(0);
            expect(tableIn(page, "forms").compareRows).toHaveLength(0);
            expect(funnel(page).compareSteps).toHaveLength(0);
            expect(tile(page, "Entries").previous).toBeUndefined();
        });
    });

    describe("Scenario: the forms overview table", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("has the columns of Forms' overview", () => {
            expect(tableIn(page, "forms").columns.map((c) => c.label)).toEqual([
                "Form",
                "Entries",
                "Unique members",
                "Workflows",
                "Workflow errors",
                "Stores records",
                "Retention days",
                "Multi-page",
                "Sources",
            ]);
        });

        it("links each form to its analytics", () => {
            const link = deepQuery<HTMLElement>(shadow(tableIn(page, "forms")), "uaui-link-cell")!.shadowRoot!.querySelector("a")!;
            expect(link.getAttribute("href")).toMatch(/^\/umbraco\/section\/forms\/workspace\/forms-form\/edit\/[0-9a-f-]+\/view\/analytics$/);
        });

        it("shows yes and no in status cells, a form that doesn't store records as a warning", () => {
            const cells = deepQueryAll<HTMLElement>(shadow(tableIn(page, "forms")), "uaui-status-cell").map((c) => [
                deepText(c).trim(),
                c.shadowRoot!.querySelector(".status")?.getAttribute("data-color"),
            ]);
            expect(cells).toContainEqual(["Yes", "positive"]);
            expect(cells).toContainEqual(["No", "warning"]);
            expect(cells).toContainEqual(["No", "default"]);
        });

        it("shows Forms' retention text as it comes", () => {
            expect(tableIn(page, "forms").rows.map((r) => r.retentionDays)).toContain("90 / Forever / 30");
        });

        it("compares entries with last period's, but not the number of workflows (a setting)", () => {
            const table = tableIn(page, "forms");
            expect(table.compareRows.length).toBe(FORMS.length);
            expect(table.compareRows.every((r) => !("workflowCount" in r) && typeof r.entries === "number")).toBe(true);
        });
    });

    describe("Scenario: the form's workflows table", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("shows triggered, success, failures and the failure rate", () => {
            const table = tableIn(page, "workflows");
            expect(table.columns.map((c) => c.label)).toEqual(["Workflow", "Triggered", "Success", "Failures", "Failure rate"]);
            expect(table.rows.map((r) => r.workflowName)).toEqual(SAMPLE_FORM.workflows.map((w) => w.name));
            for (const row of table.rows) expect(row.success).toBe((row.triggered as number) - (row.failures as number));
        });

        it("tones the failure rate: none positive, under 5% warning, 5% or more danger", () => {
            const table = tableIn(page, "workflows");
            for (const row of table.rows) {
                const rate = row.failureRate as number;
                expect(row.failureRateColor, String(rate)).toBe(rate === 0 ? "positive" : rate < 5 ? "warning" : "danger");
            }
            const colors = deepQueryAll<HTMLElement>(shadow(table), "uaui-status-cell").map((c) => c.shadowRoot!.querySelector(".status")?.getAttribute("data-color"));
            expect(colors).toContain("positive");
            expect(colors.some((c) => c === "warning" || c === "danger")).toBe(true);
        });

        it("says the form has no workflows for a form without any", async () => {
            await pickForm(page, FORMS.find((f) => f.workflows.length === 0)!.id);
            expect(tableIn(page, "workflows").rows).toHaveLength(0);
            expect(deepText(shadow(tableIn(page, "workflows")))).toContain("This form has no workflows");
        });
    });

    describe("Scenario: the completion funnel", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("narrows from opened to partially submitted to submitted", () => {
            expect(funnel(page).steps.map((s) => s.label)).toEqual(["Opened", "Partially submitted", "Submitted"]);
            const [opened, partial, submitted] = funnel(page).steps.map((s) => s.value);
            expect(opened).toBeGreaterThan(partial);
            expect(partial).toBeGreaterThan(submitted);
        });

        it("compares with last period's steps, and puts the completion rate in the header in points", () => {
            expect(funnel(page).compareSteps.map((s) => s.id)).toEqual(["opened", "partiallySubmitted", "submitted"]);
            const [opened, , submitted] = funnel(page).steps.map((s) => s.value);
            const stat = headerStat(page)!;
            expect(stat.current).toBeCloseTo((submitted / opened) * 100);
            expect(stat.deltaUnit).toBe("points");
            expect(Number.isFinite(stat.previous)).toBe(true);
        });

        it("submitted matches the form's entries", () => {
            const entries = tableIn(page, "forms").rows.find((r) => r.formId === SAMPLE_FORM.id)!.entries;
            expect(funnel(page).steps[2].value).toBe(entries);
        });
    });

    describe("Scenario: origins by source page", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
        });

        it("draws one line per source page", () => {
            expect(chartIn(page, "origins").series.map((s) => s.label)).toEqual(SAMPLE_FORM.pages.map((p) => p.name));
        });

        it("lists the pages with a link to edit each and a link to its URL", () => {
            const table = tableIn(page, "origins");
            expect(table.columns.map((c) => c.label)).toEqual(["Page", "URL", "Entries", "Unique members"]);
            const links = deepQueryAll<HTMLElement>(dataRows(table)[0], "uaui-link-cell").map((c) => c.shadowRoot!.querySelector("a")?.getAttribute("href"));
            expect(links[0]).toMatch(/^\/umbraco\/section\/content\/workspace\/document\/edit\//);
            expect(links[1]).toMatch(/^https:\/\/www\.example\.com\//);
        });

        it("follows the picked form", async () => {
            const other = FORMS[1];
            await pickForm(page, other.id);
            expect(chartIn(page, "origins").series.map((s) => s.label)).toEqual(other.pages.map((p) => p.name));
            expect(tableIn(page, "workflows").rows.map((r) => r.workflowName)).toEqual(other.workflows.map((w) => w.name));
        });
    });

    describe("Scenario (sad path): a range before Forms collected analytics", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            changeRange(page, { from: "2025-11-01", to: "2025-11-30" });
            await expect.poll(() => ready(page) && chartIn(page, "submissions").series.length === 0).toBe(true);
            await settle(page);
        });

        it("shows the charts' empty state and the tiles as having no data", () => {
            expect(deepQuery(shadow(chartIn(page, "submissions")), "uaui-empty-state")).not.toBe(null);
            expect(tiles(page).every((t) => t.noData)).toBe(true);
        });
    });

    describe("Scenario: two quick range changes on a slow API", () => {
        const late: UauiDateRange = { from: "2026-04-01", to: "2026-04-30" };
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPage();
            // The first change is slow, the second fast, so the first answer arrives last and must be dropped.
            pageProps(page).latency = 300;
            changeRange(page, { from: "2026-02-01", to: "2026-02-28" });
            pageProps(page).latency = 0;
            changeRange(page, late);
            await expect.poll(() => ready(page)).toBe(true);
            await afterTimer(300);
            await settle(page);
        });

        it("shows the second range's figures everywhere", async () => {
            const r = await postSubmissions({ startDate: late.from, endDate: late.to, metrics: ["entries"], dimensions: ["date"] });
            expect(tile(page, "Entries").current).toBe(formsTotal(r, "entries"));
            expect(chartIn(page, "formSubmissions").series[0].points[0].date).toBe("2026-04-01");
            expect(tableIn(page, "forms").rows.reduce((sum, row) => sum + (row.entries as number), 0)).toBe(formsTotal(r, "entries"));
        });
    });

    describe("Scenario: a slow API", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPageExample(html`<example-forms-analytics-page .latency=${2000}></example-forms-analytics-page>`, TAG);
            await settle(page);
        });

        it("shows every part loading on first load, without the funnel's header figure", () => {
            expect(tiles(page).every((t) => t.loading)).toBe(true);
            expect(charts(page).every((c) => c.loading)).toBe(true);
            expect(tables(page).every((t) => t.loading)).toBe(true);
            expect(funnel(page).loading).toBe(true);
            expect(headerStat(page)).toBe(null);
        });
    });

    describe("Scenario (sad path): the API fails", () => {
        let page: UauiTestElement;
        beforeEach(async () => {
            page = await renderPageExample(html`<example-forms-analytics-page .latency=${0} failing></example-forms-analytics-page>`, TAG);
            await expect.poll(() => charts(page).every((c) => c.error) && tables(page).every((t) => t.error) && funnel(page).error).toBe(true);
            await settle(page);
        });

        it("shows the error state in the tiles, charts, funnel and every table", () => {
            expect(tiles(page).every((t) => t.error)).toBe(true);
            for (const chart of charts(page)) expect(shadow(chart).querySelector("uaui-error-state")).not.toBe(null);
            expect(deepQuery(shadow(funnel(page)), "uaui-error-state")).not.toBe(null);
            expect(headerStat(page)).toBe(null);
        });

        it("loads the data once the API answers again and Retry is pressed", async () => {
            pageProps(page).failing = false;
            shadow(chartIn(page, "submissions")).querySelector("uaui-error-state")!.dispatchEvent(new Event("retry", { bubbles: true, composed: true }));
            funnel(page).dispatchEvent(new Event("retry", { bubbles: true }));
            await expect.poll(() => !tile(page, "Entries").error && !funnel(page).error && funnel(page).steps.length === 3).toBe(true);
            expect(tableIn(page, "workflows").error).toBe(false);
        });

        it("passes the a11y audit", async () => {
            expect(await axeRun(page)).toHaveNoViolations();
        });
    });
});
