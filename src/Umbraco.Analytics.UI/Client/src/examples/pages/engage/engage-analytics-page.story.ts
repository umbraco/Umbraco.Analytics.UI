import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html, ifDefined } from "@umbraco-cms/backoffice/external/lit";
import { regionSource, sourceDocs } from "../../../internal/story/source.js";
import raw from "./engage-analytics-page.element.ts?raw";
import "../../../internal/test/modal-host.element.js";
import "./engage-analytics-page.element.js";

const imports = `import { css, customElement, html, nothing, property, state } from "@umbraco-cms/backoffice/external/lit";
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
    type UauiTablePageChangeDetail,
    type UauiSearchDetail,
    type UauiTableSort,
    type UauiTableSortChangeDetail,
} from "@umbraco/analytics-ui";
// Your API client (the story fakes it, and wait stands in for the network): fetchChartSeries, fetchCompareSeries, fetchPages, fetchVisitorTypes and their types. In this story they are a fake, generated from the dates.
import { fetchChartSeries, fetchCompareSeries, fetchPages, fetchVisitorTypes, markers, wait, type ChartView, type PagesResult, type VisitorTypeRow } from "./engage-api.js";`;

const code = regionSource(raw, "page", imports);

const meta: Meta = {
    title: "Examples/Pages/Engage",
    parameters: { layout: "padded" },
};

export default meta;

// The host stands in for the backoffice's modal manager, which the date range dialog opens through.
const render = (view: "pageviews" | "visitors", latency?: number, failing = false) => html`
    <uaui-test-modal-host>
        <example-engage-analytics-page view=${view} latency=${ifDefined(latency)} ?failing=${failing}></example-engage-analytics-page>
    </uaui-test-modal-host>
`;

/**
 * Engage > Analytics > Pageviews, rebuilt from this package: group by and date range (with compare) in an actions row
 * at the top, an area chart with compare and markers flowing into an edge-to-edge table with share columns, compare badges,
 * search, a total and paging. Change the group by or the dates and the chart reloads; sort, page and search load the
 * table's rows, as a server would. The data is made up. The docs panel shows the page element's own code.
 */
export const Pageviews: StoryObj = {
    render: () => render("pageviews"),
    parameters: { docs: sourceDocs(code) },
};

/** The Visitors tab: the same page with stacked bars (returning and new visitors) and a user type table. */
export const Visitors: StoryObj = {
    render: () => render("visitors"),
    parameters: { docs: sourceDocs(code) },
};

/** The same page with a slow API: first load shows skeleton chart and rows, and later loads keep the old data under a loading bar. */
export const SlowApi: StoryObj = {
    name: "Slow API",
    render: () => render("pageviews", 1500),
    parameters: { docs: sourceDocs(code) },
};

/** The same page when the API fails: the chart and the table show the error state with Retry. Pressing Retry loads again, and fails again, since the fake API keeps failing. */
export const FailingApi: StoryObj = {
    name: "Failing API",
    render: () => render("pageviews", undefined, true),
    parameters: { docs: sourceDocs(code) },
};
