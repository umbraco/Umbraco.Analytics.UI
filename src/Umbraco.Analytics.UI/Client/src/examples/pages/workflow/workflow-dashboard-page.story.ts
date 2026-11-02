import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html, ifDefined } from "@umbraco-cms/backoffice/external/lit";
import { regionSource, sourceDocs } from "../../../internal/story/source.js";
import raw from "./workflow-dashboard-page.element.ts?raw";
import adapterRaw from "./workflow-dashboard-adapter.ts?raw";
import "./workflow-dashboard-page.element.js";

const imports = `import { css, customElement, html, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UAUI_TABLE_CELL, type UauiChartScale, type UauiStatusColor, type UauiTableColumn, type UauiToggleGroupOption } from "@umbraco/analytics-ui";
// The adapter below: Workflow's chart and history answers to the package's series, rows and numbers.
import {
    workflowApprovalTimes,
    workflowHistoryRows,
    workflowIsEmpty,
    workflowSeries,
    workflowStatusCode,
    workflowToday,
    type WorkflowApprovalTimes,
    type WorkflowStatusId,
} from "./workflow-dashboard-adapter.js";
// Your API client: Workflow's dashboard endpoints and their types. In this story they are a fake, generated from the dates.
import { getActivity, getInstances, getReviews, WORKFLOW_NOW, type WorkflowActivityResponse, type WorkflowReviewsResponse } from "./workflow-api.js";`;

const adapterImports = `// workflow-dashboard-adapter.ts
import type { UauiColorSlot, UauiSeries, UauiSeriesKind, UauiStatusColor } from "@umbraco/analytics-ui";
import { WORKFLOW_STATUS, type WorkflowChartSeries, type WorkflowInstance, type WorkflowStatusCode } from "./workflow-api.js";`;

const code = `${regionSource(raw, "page", imports)}\n${regionSource(adapterRaw, "adapter", adapterImports)}`;

const meta: Meta = {
    title: "Examples/Pages/Workflow",
    parameters: { layout: "padded" },
};

export default meta;

const render = (latency?: number, failing = false) => html`
    <example-workflow-dashboard-page latency=${ifDefined(latency)} ?failing=${failing}></example-workflow-dashboard-page>
`;

/**
 * Umbraco Workflow's admin dashboard handled by this package, with sample data shaped like a Workflow dashboard API
 * (invented for the example: chart answers of named series with `{ x, y }` points, and a history of workflow
 * instances with numeric status codes). A small adapter, shown under the page's code, is the only code that knows
 * those shapes.
 *
 * Status tiles in their status colours (approved, pending, rejected, cancelled) each open the history filtered by
 * their status (`openable`; a product with a separate history view would give each tile an `href` instead). The
 * approval activity chart draws approved, rejected and cancelled as daily bars and pending (waiting at the end of each
 * day) as a line over them, with a today line and a log or linear y-axis: Workflow's daily counts are mostly 0 or a
 * few, beside a larger pending total. Above it, the fastest, average and slowest approval time. The content review
 * chart stacks the reviews due each day: reviewed and overdue up to today, upcoming for the two weeks after it. The
 * history table has a status filter, the approval steps done in a progress cell ("2 of 3") and the status in a
 * status cell.
 *
 * The adapter avoids three bugs of Workflow's own dashboard: "fastest" always showing "-", an average that counted
 * unfinished workflows, and a "Today" label that never showed. The data is made up.
 */
export const Dashboard: StoryObj = {
    render: () => render(),
    parameters: { docs: sourceDocs(code) },
};

/** The same page with a slow API: first load shows skeleton tiles, charts and rows, and later loads keep the old data under a loading bar. */
export const SlowApi: StoryObj = {
    name: "Slow API",
    render: () => render(1500),
    parameters: { docs: sourceDocs(code) },
};

/** The same page when the API fails: the tiles, charts and table show the error state, and the charts and table offer Retry. */
export const FailingApi: StoryObj = {
    name: "Failing API",
    render: () => render(undefined, true),
    parameters: { docs: sourceDocs(code) },
};
