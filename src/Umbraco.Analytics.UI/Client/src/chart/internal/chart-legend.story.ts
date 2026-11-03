import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./chart-legend.element.js";
import type { UauiChartLegendElement } from "./chart-legend.element.js";

const meta: Meta<UauiChartLegendElement> = {
    title: "Internal/Chart legend",
    component: "uaui-chart-legend",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uaui-chart-legend` is the legend under `uaui-time-series-chart`.") } },
    },
    args: {
        entries: [
            { id: "pageviews", label: "Pageviews", color: 1 },
            { id: "sessions", label: "Sessions", color: 2 },
        ],
        bars: false,
        compareLabel: undefined,
        compareShapes: undefined,
    },
    render: (args) =>
        html`<uaui-chart-legend .entries=${args.entries} .bars=${args.bars} .compareLabel=${args.compareLabel} .compareShapes=${args.compareShapes}></uaui-chart-legend>`,
};

export default meta;
type Story = StoryObj<UauiChartLegendElement>;

/** Lines, one per series. Each entry is a toggle button: pressing it raises `deselected` or `selected`, and the owner sets `selected`. */
export const Default: Story = {};

/** A hidden series: its entry is struck through with a hollow swatch (a dotted line), and `aria-pressed` is false. */
export const HiddenSeries: Story = {
    name: "Hidden series",
    args: {
        entries: [
            { id: "pageviews", label: "Pageviews", color: 1 },
            { id: "sessions", label: "Sessions", color: 2, selected: false },
        ],
        compareLabel: "Comparison",
    },
};

/** Bars with a hidden series: the swatch is a hollow square. */
export const HiddenBars: Story = {
    name: "Hidden series, bars",
    args: {
        bars: true,
        entries: [
            { id: "pageviews", label: "Pageviews", color: 1, selected: false },
            { id: "sessions", label: "Sessions", color: 2 },
        ],
    },
};

/** The compared period adds a dashed line named by `compareLabel`. */
export const WithCompare: Story = { name: "With compare", args: { compareLabel: "Apr 25, 2026 – May 24, 2026" } };

/** The bar kinds use squares in the bar colours. */
export const Bars: Story = { args: { bars: true, compareLabel: "Comparison" } };

const manyEntries = [
    "Summer conference",
    "Events",
    "Workshop: Getting started",
    "Home",
    "Newsletter, June",
    "Blog: Spring recap",
    "Contact",
    "Pricing",
    "About us",
    "Careers",
    "Partners",
].map((label, i) => ({ id: `page-${i + 1}`, label, color: ((i % 8) + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }));

/** More than 8 series fold: the first 7, then a "Show 4 more" button (Tab to it, Enter or Space). */
export const Folded: Story = { args: { bars: true, entries: manyEntries } };

/** The folded legend after pressing "Show 4 more": every series, and "Show fewer" to fold it again. */
export const Expanded: Story = {
    args: { bars: true, entries: manyEntries },
    play: async ({ canvasElement }) => {
        const legend = canvasElement.querySelector("uaui-chart-legend")!;
        await legend.updateComplete;
        legend.shadowRoot!.querySelector<HTMLButtonElement>(".legend-toggle")?.click();
    },
};

/** Bars and a line in one chart: each entry its own swatch, and the compare entry both a bar and a dashed line. */
export const BarsAndLine: Story = {
    name: "Bars and a line",
    args: {
        bars: true,
        entries: [
            { id: "approved", label: "Approved", color: "positive" },
            { id: "errored", label: "Errored", color: "danger" },
            { id: "pending", label: "Pending", color: "warning", bar: false },
        ],
        compareLabel: "Comparison",
        compareShapes: ["bar", "line"],
    },
};
