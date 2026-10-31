import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./chart-markers.element.js";
import type { UauiChartMarkersElement } from "./chart-markers.element.js";
import { bucketMarkers } from "./marker-buckets.js";

const dates = ["2026-06-10", "2026-06-11", "2026-06-12"];
const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
const placements = [
    { index: 0, x: 40, y: 150 },
    { index: 1, x: 160, y: 150 },
    { index: 2, x: 280, y: 150 },
];

const meta: Meta<UauiChartMarkersElement> = {
    title: "Internal/Chart markers",
    component: "uaui-chart-markers",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uaui-chart-markers` puts a button over each marker dot of `uaui-time-series-chart`. Hover or focus a dot to see its tooltip, Escape hides it. The chart draws the dots; here a dashed baseline stands in for the plot.") } },
    },
    args: {
        buckets: bucketMarkers([{ id: "m1", date: "2026-06-11", title: "Spring product launch", description: "New homepage hero and pricing page." }], dates, "day"),
        placements,
        dateFormat,
    },
    render: (args) => html`<div style="position: relative; width: 320px; height: 170px; border-bottom: 1px dashed var(--uui-color-border)">
        <uaui-chart-markers .buckets=${args.buckets} .placements=${args.placements} .dateFormat=${args.dateFormat}></uaui-chart-markers>
    </div>`,
};

export default meta;
type Story = StoryObj<UauiChartMarkersElement>;

/** One marker. */
export const Default: Story = {};

/** Several dots, in date order. */
export const SeveralDots: Story = {
    name: "Several dots",
    args: {
        buckets: bucketMarkers(
            [
                { id: "m0", date: "2026-06-10", title: "Newsletter" },
                { id: "m1", date: "2026-06-11", title: "Spring product launch", description: "New homepage hero and pricing page." },
                { id: "m2", date: "2026-06-12", title: "Paid push" },
            ],
            dates,
            "day",
        ),
    },
};

/** A crowded dot: the tooltip lists the first markers, then how many more there are. */
export const CrowdedDot: Story = {
    name: "Crowded dot",
    args: {
        buckets: bucketMarkers(
            ["a", "b", "c", "d", "e", "f"].map((id) => ({ id, date: "2026-06-11", title: `Event ${id.toUpperCase()}` })),
            dates,
            "day",
        ),
    },
};

/** No dots: nothing is drawn. */
export const Empty: Story = { args: { buckets: [], placements: [] } };
