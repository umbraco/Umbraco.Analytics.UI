import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./chart-marker-tooltip.element.js";
import type { UaxChartMarkerTooltipElement } from "./chart-marker-tooltip.element.js";

const meta: Meta<UaxChartMarkerTooltipElement> = {
    title: "Internal/Chart marker tooltip",
    component: "uax-chart-marker-tooltip",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uax-chart-marker-tooltip` is the tooltip over a marker's dot in `uax-time-series-chart`. The chart positions it; here it sits in the flow.") } },
    },
    args: {
        entries: [{ date: "Jun 11, 2026", title: "Spring product launch", description: "New homepage hero and pricing page." }],
        more: 0,
    },
    render: (args) => html`<div style="width: 260px">
        <uax-chart-marker-tooltip style="position: static" .entries=${args.entries} .more=${args.more}></uax-chart-marker-tooltip>
    </div>`,
};

export default meta;
type Story = StoryObj<UaxChartMarkerTooltipElement>;

/** One marker, with a description. */
export const Default: Story = {};

/** A crowded dot: each marker is listed, then how many more there are. */
export const CrowdedDot: Story = {
    name: "Crowded dot",
    args: {
        entries: [
            { date: "Jun 11, 2026", title: "Spring product launch", description: "New homepage hero and pricing page." },
            { date: "Jun 12, 2026", title: "Paid push" },
        ],
        more: 3,
    },
};
