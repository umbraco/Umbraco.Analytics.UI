import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html, ifDefined } from "@umbraco-cms/backoffice/external/lit";
import { regionSource, sourceDocs } from "../../../internal/story/source.js";
import raw from "./forms-analytics-page.element.ts?raw";
import adapterRaw from "./forms-analytics-adapter.ts?raw";
import "../../../internal/test/modal-host.element.js";
import "./forms-analytics-page.element.js";

const imports = `import { css, customElement, html, nothing, property, state, type PropertyValues } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import {
    UAUI_TABLE_CELL,
    uauiCompareFor,
    uauiFormatDateRange,
    type UauiCompare,
    type UauiDateRange,
    type UauiGroupBy,
    type UauiSeries,
    type UauiTableColumn,
} from "@umbraco/analytics-ui";
// The adapter below: Forms' { columns, rows } answers to the package's rows, series and funnel steps.
import { formsRateSeries, formsRows, formsSeries, formsSeriesBy, formsSteps, formsTotal } from "./forms-analytics-adapter.js";
// Your API client: Forms' analytics endpoints and their types. In this story they are a fake, generated from the dates.
import {
    FORMS,
    postOrigins,
    postOriginsOverview,
    postOverview,
    postRecordStates,
    postSubmissions,
    postWorkflows,
    type FormsAnalyticsQuery,
    type FormsAnalyticsResult,
    type FormsColumn,
} from "./forms-api.js";`;

const adapterImports = `// forms-analytics-adapter.ts
import type { UauiColorSlot, UauiFunnelStep, UauiSeries, UauiStatusColor } from "@umbraco/analytics-ui";
import type { FormsAnalyticsResult, FormsColumn } from "./forms-api.js";`;

const code = `${regionSource(raw, "page", imports)}\n${regionSource(adapterRaw, "adapter", adapterImports)}`;

const meta: Meta = {
    title: "Examples/Pages/Forms",
    parameters: { layout: "padded" },
};

export default meta;

// The host stands in for the backoffice's modal manager, which the date range dialog opens through.
const render = (latency?: number, failing = false) => html`
    <uaui-test-modal-host>
        <example-forms-analytics-page latency=${ifDefined(latency)} ?failing=${failing}></example-forms-analytics-page>
    </uaui-test-modal-host>
`;

/**
 * Umbraco Forms' analytics handled by this package, with sample data shaped like Forms' analytics API: every endpoint
 * answers a table of `columns` and `rows`, and a small adapter (shown under the page's code) turns those into the
 * package's rows, series and funnel steps. Compare is a second query for the comparison range, as Forms sends it.
 *
 * The overview: group-by and date range (with compare) in an actions row; KPI tiles Forms doesn't show today though its
 * data has them (entries, unique members, workflow failure rate), each picking the chart's metric; the Submissions
 * chart with entries and, in the danger colour, workflow errors; and the forms overview table (entries, unique
 * members, workflows, workflow errors, whether it stores records and is multi-page in status cells, retention days,
 * sources, and the form name linking to the form).
 *
 * A form's analytics, as on the form's Analytics tab: its Submissions chart; the Workflows table (triggered, success,
 * failures, and the failure rate in a status cell: none is positive, under 5% warning, 5% or more danger); a funnel
 * from record states (opened, partially submitted, submitted), an idea the data supports; and Origins by source page,
 * one line per page over a table of pages linking to the page and its URL.
 *
 * Not here yet: Forms' "submissions by hour of day" bar chart (its x-axis is the 24 hours, not dates, which needs a
 * categorical bar chart, T60), and the origins chart's switch between absolute numbers and each page's share (T59).
 * Some queries ask for columns Forms' API doesn't have yet (week and month buckets, triggered and unique members on
 * submissions, record states); the fake API's types mark them as proposed.
 *
 * The boxes use one example arrangement (layout is up to each product): at most two columns, where each box spans one
 * or both, as Forms' widget manifests say "small" or "large". The data is made up. The docs panel shows the page
 * element's own code, then the adapter's.
 */
export const Analytics: StoryObj = {
    render: () => render(),
    parameters: { docs: sourceDocs(code) },
};

/** The same page with a slow API: first load shows skeleton tiles, charts, funnel and rows, and later loads keep the old data under a loading bar. */
export const SlowApi: StoryObj = {
    name: "Slow API",
    render: () => render(1500),
    parameters: { docs: sourceDocs(code) },
};

/** The same page when the API fails: the tiles, charts, funnel and tables show the error state, and the charts, funnel and tables offer Retry. The fake API rejects every request, so pressing Retry loads again and fails again. */
export const FailingApi: StoryObj = {
    name: "Failing API",
    render: () => render(undefined, true),
    parameters: { docs: sourceDocs(code) },
};
