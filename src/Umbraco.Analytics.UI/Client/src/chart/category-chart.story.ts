import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiCategoryChartElement } from "./category-chart.element.js";
import "./category-chart.element.js";
import type { UauiCategory, UauiCategorySeries } from "./types.js";

// Sample data: submissions by hour of the day, as Umbraco Forms shows them. The hour labels are formatted by the
// product in the editor's culture; the chart draws them as given.
const hourLabel = new Intl.DateTimeFormat(undefined, { hour: "numeric", timeZone: "UTC" });
const hours: UauiCategory[] = Array.from({ length: 24 }, (_, h) => ({ id: String(h), label: hourLabel.format(Date.UTC(2026, 0, 1, h)) }));
// A working day: quiet at night, busiest around lunch and mid-afternoon.
const shape = (h: number) => 3 + 28 * Math.exp(-((h - 11) ** 2) / 10) + 22 * Math.exp(-((h - 15) ** 2) / 6);
const byHour = (id: string, label: string, scale: number): UauiCategorySeries => ({
    id,
    label,
    points: hours.map((h, i) => ({ category: h.id, value: Math.round(shape(i) * scale) })),
});
const entries = byHour("entries", "Entries", 1);
const entriesPrevious = byHour("entries", "Entries", 0.8);
const contact = byHour("contact", "Contact us", 0.6);
const newsletter = byHour("newsletter", "Newsletter signup", 0.4);

// A few categories, for the side by side bars.
const devices: UauiCategory[] = [
    { id: "mobile", label: "Mobile" },
    { id: "tablet", label: "Tablet" },
    { id: "desktop", label: "Desktop" },
];
const visits: UauiCategorySeries = { id: "visits", label: "Visits", points: [{ category: "mobile", value: 820 }, { category: "tablet", value: 140 }, { category: "desktop", value: 1260 }] };
const orders: UauiCategorySeries = { id: "orders", label: "Orders", points: [{ category: "mobile", value: 96 }, { category: "tablet", value: 21 }, { category: "desktop", value: 230 }] };

const meta: Meta<UauiCategoryChartElement> = {
    title: "Components/Category Chart",
    component: "uaui-category-chart",
    args: {
        kind: "bar",
        categories: hours,
        series: [entries],
        compareSeries: [],
        compareLabel: undefined,
        categoryLabel: "Hour of day",
        lowerIsBetter: false,
        yScale: "linear",
        valueFormat: undefined,
        loading: false,
        error: false,
        errorHeadline: undefined,
        errorDescription: undefined,
        retryable: false,
        emptyHeadline: undefined,
        emptyDescription: undefined,
    },
    argTypes: {
        kind: { control: "inline-radio", options: ["bar", "stacked-bar"] },
        yScale: { control: "inline-radio", options: ["linear", "log"] },
    },
    render: (args) =>
        html`<uui-box headline="Submissions by hour of day" style="--uui-box-default-padding: 0">
            <uaui-category-chart
                .kind=${args.kind}
                .categories=${args.categories}
                .series=${args.series}
                .compareSeries=${args.compareSeries}
                .compareLabel=${args.compareLabel}
                .categoryLabel=${args.categoryLabel}
                .lowerIsBetter=${args.lowerIsBetter}
                .yScale=${args.yScale}
                .valueFormat=${args.valueFormat}
                .loading=${args.loading}
                .error=${args.error}
                .errorHeadline=${args.errorHeadline}
                .errorDescription=${args.errorDescription}
                .retryable=${args.retryable}
                .emptyHeadline=${args.emptyHeadline}
                .emptyDescription=${args.emptyDescription}></uaui-category-chart>
        </uui-box>`,
};

export default meta;
type Story = StoryObj<UauiCategoryChartElement>;

/** One series over a few categories: a bar each, and no legend. */
export const Bars: Story = { args: { categories: devices, series: [visits], categoryLabel: "Device" } };

/** Forms' submissions by hour of day: 24 categories, labels formatted by the product in the editor's culture. The x-axis labels as many hours as fit; the tooltip and the hidden table name every hour. */
export const ManyCategories: Story = { name: "Many categories" };

/** A few categories with two series: their bars side by side, with a legend. */
export const TwoSeries: Story = {
    name: "Two series",
    args: { categories: devices, series: [visits, orders], categoryLabel: "Device" },
};

/** Press a legend entry to hide or show its series. The y-axis rescales to the bars drawn; the first series is hidden here. */
export const LegendHiddenSeries: Story = {
    name: "Legend, series hidden",
    args: { categories: devices, series: [visits, orders], categoryLabel: "Device" },
    play: async ({ canvasElement }) => {
        const chart = canvasElement.querySelector("uaui-category-chart")!;
        await chart.updateComplete;
        const legend = chart.shadowRoot!.querySelector("uaui-chart-legend")!;
        await legend.updateComplete;
        legend.shadowRoot!.querySelector<HTMLButtonElement>("button.legend-entry")?.click();
    },
};

/** `stacked-bar` stacks the series in one bar per category; the tooltip and the hidden table add a total. */
export const Stacked: Story = { args: { kind: "stacked-bar", series: [contact, newsletter] } };

/** Last period's values behind each bar, matched by series id and category id, with the change in the tooltip. */
export const Compare: Story = {
    args: { series: [entries], compareSeries: [entriesPrevious], compareLabel: "Apr 25, 2026 – May 24, 2026" },
};

/** First load, nothing to show yet: a skeleton the size of the chart. */
export const Loading: Story = { args: { series: [], loading: true } };

/** Reloading with data already shown: the old bars stay under a thin loading bar. */
export const Reloading: Story = { args: { loading: true } };

/** No points: the empty state, with the product's own text when it sets one. */
export const Empty: Story = {
    args: { series: [], emptyHeadline: "No submissions yet", emptyDescription: "Submissions appear here once visitors send the form." },
};

/** The load failed: the error state in place of the plot, with Retry when `retryable` (it raises `retry`). */
export const LoadFailed: Story = { name: "Load failed", args: { error: true, retryable: true } };

/** The dark backoffice theme, comparing. The toolbar's theme switcher shows any story in the other themes too. */
export const Dark: Story = {
    args: { series: [entries], compareSeries: [entriesPrevious], compareLabel: "Apr 25, 2026 – May 24, 2026" },
    globals: { theme: "dark" },
};
