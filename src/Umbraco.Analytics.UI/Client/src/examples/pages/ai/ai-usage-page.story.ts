import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html, ifDefined } from "@umbraco-cms/backoffice/external/lit";
import { regionSource, sourceDocs } from "../../../internal/story/source.js";
import raw from "./ai-usage-page.element.ts?raw";
import "../../../internal/test/modal-host.element.js";
import "./ai-usage-page.element.js";

const imports = `import { css, customElement, html, property, state } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import {
    UAX_TABLE_CELL,
    uaxFormatDateRange,
    type UaxCompare,
    type UaxDateRange,
    type UaxGroupBy,
    type UaxSeries,
    type UaxTableColumn,
    type UaxTablePageChangeDetail,
    type UaxTableSearchDetail,
    type UaxTableSort,
    type UaxTableSortChangeDetail,
} from "@umbraco-analytics/ui";
// Your API client: getUsage, getBreakdown and their types. In this story they are a fake, generated from the date.
import { getBreakdown, getUsage, type BreakdownBy, type BreakdownResult, type BreakdownSortKey, type UsageBucket, type UsageResult, type UsageTotals } from "./usage-api.js";`;

const code = regionSource(raw, "page", imports);

const meta: Meta = {
    title: "Examples/Pages/Umbraco AI",
    parameters: { layout: "padded" },
};

export default meta;

// The host stands in for the backoffice's modal manager, which the date range dialog opens through.
const render = (latency?: number) => html`
    <uax-test-modal-host><example-ai-usage-page latency=${ifDefined(latency)}></example-ai-usage-page></uax-test-modal-host>
`;

/**
 * Umbraco AI's Usage dashboard rebuilt from this package: group by and the date range (with compare) in the page
 * header, six KPI tiles with change badges, a stacked usage chart, and a breakdown table by model or profile.
 * Everything is wired by the page, which holds the state.
 *
 * - Press a tile (requests, input, output or total tokens) and the chart plots that metric. Success rate and
 *   average duration can't be stacked, so those tiles aren't buttons.
 * - Change the date range (and its comparison) and every part reloads. Group by only re-buckets the chart.
 * - The table is in `server` mode: sort, page and search each raise an event, and the page loads that page.
 * - "Break down by" swaps the table between models and profiles.
 *
 * The data is made up. The docs panel shows the page element's own code.
 */
export const Usage: StoryObj = {
    render: () => render(),
    parameters: { docs: sourceDocs(code) },
};

/** The same page with a slow API: first load shows skeleton tiles, chart and rows, and later loads keep the old data under a loading bar. */
export const SlowApi: StoryObj = {
    name: "Slow API",
    render: () => render(1500),
    parameters: { docs: sourceDocs(code) },
};
