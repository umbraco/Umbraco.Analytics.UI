import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "../stat/stat.element.js";
import type { UauiFunnelElement } from "./funnel.element.js";
import "./funnel.element.js";
import { cartSteps, cartStepsPrevious, compareRangeLabel, currentRangeLabel, visitSteps, visitStepsPrevious } from "./internal/funnel-fixtures.js";
import type { UauiFunnelStep } from "./types.js";

type Args = UauiFunnelElement & { width: string };

const last = (steps: UauiFunnelStep[]) => steps[steps.length - 1]?.value ?? 0;
/** The last step over the first, in %: the pane recipe's "Overall" figure. */
const overall = (steps: UauiFunnelStep[]) => (steps[0]?.value ? (last(steps) / steps[0].value) * 100 : undefined);

const meta: Meta<Args> = {
    title: "Components/Funnel",
    component: "uaui-funnel",
    args: {
        width: "560px",
        steps: cartSteps,
        compareSteps: [],
        currentLabel: undefined,
        compareLabel: undefined,
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
        width: { control: "inline-radio", options: ["280px", "360px", "560px"], description: "Story only: the pane's width" },
    },
    // The pane recipe: the overall conversion goes in the box header with an inline uaui-stat, not in the funnel.
    render: (args) => {
        const now = overall(args.steps);
        const before = args.compareSteps.length ? overall(args.compareSteps) : undefined;
        return html`<uui-box headline="Cart conversion" style="--uui-box-default-padding: 0; width: ${args.width}">
            ${now === undefined || args.error || args.loading
                ? ""
                : html`<uaui-stat
                      slot="header-actions"
                      layout="inline"
                      label="Overall"
                      value=${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(now) + "%"}
                      .current=${now}
                      .previous=${before}
                      delta-unit="points"></uaui-stat>`}
            <uaui-funnel
                .steps=${args.steps}
                .compareSteps=${args.compareSteps}
                .currentLabel=${args.currentLabel}
                .compareLabel=${args.compareLabel}
                .valueFormat=${args.valueFormat}
                .loading=${args.loading}
                .error=${args.error}
                .errorHeadline=${args.errorHeadline}
                .errorDescription=${args.errorDescription}
                .retryable=${args.retryable}
                .emptyHeadline=${args.emptyHeadline}
                .emptyDescription=${args.emptyDescription}></uaui-funnel>
        </uui-box>`;
    },
};

export default meta;
type Story = StoryObj<Args>;

/** Bars are as wide as their value against the largest one; the links show the share that moved on. Hover or Tab to a step for its tooltip. */
export const Default: Story = {};

/** Last period as a bracket at its width on each bar, a change in points on each link, and a legend. */
export const Compare: Story = {
    args: { compareSteps: cartStepsPrevious, currentLabel: currentRangeLabel, compareLabel: compareRangeLabel },
};

/** Narrow, beside a chart: labels wrap and the last steps are thin, because the widths are honest. */
export const Narrow: Story = {
    args: { width: "360px", steps: visitSteps, compareSteps: visitStepsPrevious, currentLabel: currentRangeLabel, compareLabel: compareRangeLabel },
};

/** The narrowest pane it is made for. */
export const VeryNarrow: Story = { name: "Very narrow (280px)", args: { width: "280px", steps: visitSteps } };

/** A compare value larger than this period's: both periods share one scale, so that bracket is the full width and the bars are measured against it. */
export const CompareLarger: Story = {
    name: "Compare larger than this period",
    args: {
        compareSteps: [
            { id: "carts", label: "Carts created", value: 1580 },
            { id: "checkout", label: "Reached checkout", value: 610 },
            { id: "orders", label: "Orders placed", value: 296 },
        ],
        currentLabel: currentRangeLabel,
        compareLabel: compareRangeLabel,
    },
};

/** The dark backoffice theme, comparing. The toolbar's theme switcher shows any story in the other themes too. */
export const Dark: Story = {
    args: { compareSteps: cartStepsPrevious, currentLabel: currentRangeLabel, compareLabel: compareRangeLabel },
    globals: { theme: "dark" },
};

/** A step missing from `compare-steps` gets no bracket and no badge. */
export const PartialCompare: Story = {
    name: "Compare with a step missing",
    args: { compareSteps: cartStepsPrevious.slice(0, 2), currentLabel: currentRangeLabel, compareLabel: compareRangeLabel },
};

/** A step of 0 draws no bar, and the share after it shows a dash. */
export const ZeroStep: Story = {
    name: "A step of 0",
    args: {
        steps: [
            { id: "carts", label: "Carts created", value: 40 },
            { id: "checkout", label: "Reached checkout", value: 0 },
            { id: "orders", label: "Orders placed", value: 0 },
        ],
    },
};

/** Values in the product's format. Shares are always percents. */
export const ValueFormat: Story = { name: "Value format", args: { valueFormat: { notation: "compact" } } };

/** First load: one grey bar per step. */
export const Loading: Story = { args: { loading: true } };

/** First load before the steps are known: four grey bars. */
export const LoadingNoSteps: Story = { name: "Loading, no steps yet", args: { loading: true, steps: [] } };

/** Reloading: the old funnel stays under a thin loading bar. */
export const Reloading: Story = { args: { loading: true, compareSteps: cartStepsPrevious } };

/** No steps, or a first step of 0: the empty state. */
export const Empty: Story = { args: { steps: [], emptyHeadline: "No carts yet", emptyDescription: "Carts appear here once shoppers add something." } };

/** The load failed: the error state, with Retry when `retryable` (it raises `retry`). */
export const LoadFailed: Story = { name: "Load failed", args: { error: true, retryable: true } };
