import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UanEmptyStateElement } from "./empty-state.element.js";
import "./empty-state.element.js";

const meta: Meta<UanEmptyStateElement> = {
    title: "Components/Empty State",
    component: "uan-empty-state",
    render: (args) =>
        html`<div style="background: var(--uui-color-surface); border-radius: var(--uui-border-radius-3)">
            <uan-empty-state
                .headline=${args.headline}
                .description=${args.description}
                .icon=${args.icon ?? "icon-search"}></uan-empty-state>
        </div>`,
};

export default meta;
type Story = StoryObj<UanEmptyStateElement>;

/** No text set: the built-in "No data yet" / "Try a wider date range.". */
export const Default: Story = {};

/** A product's own text. */
export const CustomText: Story = {
    args: { headline: "No pageviews yet", description: "Pageviews appear here once visitors arrive." },
};

/** An empty string leaves a line out. */
export const HeadlineOnly: Story = { args: { headline: "Nothing to compare", description: "" } };

export const CustomIcon: Story = { args: { icon: "icon-chart" } };
