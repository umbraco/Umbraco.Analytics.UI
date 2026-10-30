import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html, ifDefined } from "@umbraco-cms/backoffice/external/lit";
import { regionSource, sourceDocs } from "../../../internal/story/source.js";
import raw from "./commerce-analytics-page.element.ts?raw";
import "../../../internal/test/modal-host.element.js";
import "./commerce-analytics-page.element.js";

const imports = `import { css, customElement, html, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import {
    UAX_TABLE_CELL,
    uaxFormatDateRange,
    type UaxCompare,
    type UaxDateRange,
    type UaxSeries,
    type UaxTableColumn,
    type UaxTablePageChangeDetail,
    type UaxTableSearchDetail,
    type UaxTableSort,
    type UaxTableSortChangeDetail,
} from "@umbraco-analytics/ui";
// Your API client: loadSnapshot, loadBuyers, loadBuyerCompare and their types. In this story they are a fake, generated from the dates.
import { loadBuyerCompare, loadBuyers, loadSnapshot, type BuyerPage, type BuyerRow, type Day, type Snapshot, type Totals } from "./commerce-api.js";`;

const code = regionSource(raw, "page", imports);

const meta: Meta = {
    title: "Examples/Pages/Commerce",
    parameters: { layout: "padded" },
};

export default meta;

// The host stands in for the backoffice's modal manager, which the date range dialog opens through.
const render = (latency?: number, failing = false) => html`
    <uax-test-modal-host>
        <example-commerce-analytics-page latency=${ifDefined(latency)} ?failing=${failing}></example-commerce-analytics-page>
    </uax-test-modal-host>
`;

/**
 * Commerce > Analytics rebuilt from this package: the date range (with compare) in an actions row, five KPI tiles
 * that switch the metric of the revenue chart, then tables. Top products and popular discounts are `client` tables that
 * sort, search and page themselves; top buyers is a `server` table, so the page listens for `sort-change`,
 * `page-change` and `search` and asks for the next page. Change the date range and every part reloads.
 * The data is made up. The docs panel shows the page element's own code.
 */
export const Analytics: StoryObj = {
    render: () => render(),
    parameters: { docs: sourceDocs(code) },
};

/** The same page with a slow API: first load shows skeleton tiles, chart and rows, and later loads keep the old data under a loading bar. */
export const SlowApi: StoryObj = {
    name: "Slow API",
    render: () => render(1500),
    parameters: { docs: sourceDocs(code) },
};

/** The same page when the API fails: the tiles, chart and tables show the error state, and the chart and tables offer Retry. Pressing Retry loads again, and fails again, since the fake API keeps failing. */
export const FailingApi: StoryObj = {
    name: "Failing API",
    render: () => render(undefined, true),
    parameters: { docs: sourceDocs(code) },
};
