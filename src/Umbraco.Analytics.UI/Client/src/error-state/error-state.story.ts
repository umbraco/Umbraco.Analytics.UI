import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiErrorStateElement } from "./error-state.element.js";
import "./error-state.element.js";

const meta: Meta<UauiErrorStateElement> = {
    title: "Components/Error State",
    component: "uaui-error-state",
    render: (args) =>
        html`<div style="background: var(--uui-color-surface); border-radius: var(--uui-border-radius-3)">
            <uaui-error-state
                .headline=${args.headline}
                .description=${args.description}
                .icon=${args.icon ?? "icon-alert"}
                .retryable=${args.retryable ?? false}></uaui-error-state>
        </div>`,
};

export default meta;
type Story = StoryObj<UauiErrorStateElement>;

/** No text set: the built-in "Something went wrong" / "The data could not be loaded.". */
export const Default: Story = {};

/** Shows a Retry button that raises `retry`. */
export const Retryable: Story = { args: { retryable: true } };

/** A product's own text. */
export const CustomText: Story = {
    args: { headline: "Pageviews failed to load", description: "Check your connection, then try again.", retryable: true },
};

/** An empty string leaves a line out. */
export const HeadlineOnly: Story = { args: { headline: "Could not load pages", description: "" } };

export const CustomIcon: Story = { args: { icon: "icon-wrong" } };
