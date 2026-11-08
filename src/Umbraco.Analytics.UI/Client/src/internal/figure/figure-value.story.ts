import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "#platform/lit";
import { notPublicApi } from "../story/internal.js";
import "./figure-value.element.js";
import type { UauiFigureValueElement } from "./figure-value.element.js";

const meta: Meta<UauiFigureValueElement> = {
    title: "Internal/Figure value",
    component: "uaui-figure-value",
    tags: ["internal"],
    parameters: {
        docs: {
            description: {
                component: notPublicApi("`uaui-figure-value` is the number text of a `uaui-kpi-tile` or `uaui-stat`: a compact figure for the eye, the exact amount for screen readers and hover."),
            },
        },
    },
    args: { figure: { text: "€4,837.40" } },
    render: (args) => html`<span style="font-size: 24px; font-weight: 700"><uaui-figure-value .figure=${args.figure}></uaui-figure-value></span>`,
};

export default meta;
type Story = StoryObj<UauiFigureValueElement>;

/** A figure with no `exact`: the text as it is, with no title and no hidden text. */
export const PlainText: Story = {
    name: "Plain text",
};

/** A compact figure: "€1.23M" is hidden from assistive tech and shows the exact amount on hover; screen readers read the exact amount. */
export const CompactWithExact: Story = {
    name: "Compact with exact amount",
    args: { figure: { text: "€1.23M", exact: "€1,234,567.00" } },
};

/** No figure: nothing is drawn. */
export const NoFigure: Story = {
    name: "No figure",
    args: { figure: undefined },
};
