import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html, ifDefined } from "@umbraco-cms/backoffice/external/lit";
import { regionSource, sourceDocs } from "../../../internal/story/source.js";
import raw from "./commerce-analytics-page.element.ts?raw";
import "../../../internal/test/modal-host.element.js";
import "./commerce-analytics-page.element.js";

const imports = `import { css, customElement, html, nothing, property, ref, state, type PropertyValues } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import {
    UAUI_TABLE_CELL,
    UauiTableServerController,
    uauiCompareFor,
    uauiFormatDateRange,
    type UauiCompare,
    type UauiDateRange,
    type UauiFunnelStep,
    type UauiSeries,
    type UauiTableColumn,
    type UauiTablePageChangeDetail,
    type UauiTableRowClickDetail,
    type UauiTableServerState,
} from "@umbraco/analytics-ui";
// Your API client: loadSnapshot, loadBuyers, loadBuyerCompare, loadStockForecast and their types. In this story they are a fake, generated from the dates.
import {
    loadBuyerCompare,
    loadBuyers,
    loadSnapshot,
    loadStockForecast,
    type BuyerPage,
    type BuyerRow,
    type CartConversion,
    type Day,
    type DiscountRow,
    type RefundReason,
    type Snapshot,
    type StockForecastRow,
    type Totals,
} from "./commerce-api.js";`;

const code = regionSource(raw, "page", imports);

const meta: Meta = {
    title: "Examples/Pages/Commerce",
    parameters: { layout: "padded" },
};

export default meta;

// The host stands in for the backoffice's modal manager, which the date range dialog opens through.
const render = (latency?: number, failing = false) => html`
    <uaui-test-modal-host>
        <example-commerce-analytics-page latency=${ifDefined(latency)} ?failing=${failing}></example-commerce-analytics-page>
    </uaui-test-modal-host>
`;

/**
 * Commerce > Analytics rebuilt from this package, with everything Commerce's dashboard shows today: the date range
 * (with compare) in an actions row; seven KPI tiles (revenue, orders, average order value, cart conversion, abandoned
 * cart recovery, repeat customers, applied discounts) that switch the metric of one chart, rates compared in points;
 * a Cart conversion box with `uaui-funnel` and the overall conversion in its header; an Abandoned carts box with a
 * two-step funnel (notified, purchased) and the recovery rate in its header; a notice above the tiles when the
 * range or comparison range is older than the cart cleanup policy (from 25 March 2026 back); a Refunds box with the
 * overall refund rate in its header and refund rates by product; then top products, popular discounts, top buyers (a
 * `server` table run by `UauiTableServerController`, with clickable rows standing in for Commerce's buyer dialog) and the
 * stock forecast: products under the low stock threshold that run out within 1.5 times the range, with sales per day
 * over the range and no compare. The boxes use one example arrangement (layout is up to each product): at most two
 * columns, where each box spans one or both. The chart and top buyers span both, the others go in pairs, and on a
 * narrow page everything is one column. Change the date range and every part reloads. The data is made up. The docs
 * panel shows the page element's own code.
 */
export const Analytics: StoryObj = {
    render: () => render(),
    parameters: { docs: sourceDocs(code) },
};

/** The same page with a slow API: first load shows skeleton tiles, chart, funnel and rows, and later loads keep the old data under a loading bar. */
export const SlowApi: StoryObj = {
    name: "Slow API",
    render: () => render(1500),
    parameters: { docs: sourceDocs(code) },
};

/** The same page when the API fails: the tiles, chart, funnel and tables show the error state, and the chart, funnel and tables offer Retry. The fake API rejects every request, so pressing Retry loads again and fails again. */
export const FailingApi: StoryObj = {
    name: "Failing API",
    render: () => render(undefined, true),
    parameters: { docs: sourceDocs(code) },
};

