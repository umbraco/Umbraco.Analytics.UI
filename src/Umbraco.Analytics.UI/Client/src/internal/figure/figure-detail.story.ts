import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../story/internal.js";
import "./figure-detail.element.js";
import type { UauiFigureDetailElement } from "./figure-detail.element.js";

const meta: Meta<UauiFigureDetailElement> = {
    title: "Internal/Figure detail",
    component: "uaui-figure-detail",
    tags: ["internal"],
    parameters: {
        docs: {
            description: {
                component: notPublicApi("`uaui-figure-detail` is the line under the value of a `uaui-kpi-tile`: a pattern with the formatted number filled into each `{0}`."),
            },
        },
    },
    args: { pattern: "{0} cached", figure: { text: "114,300" } },
    render: (args) => html`<uaui-figure-detail .pattern=${args.pattern} .figure=${args.figure}></uaui-figure-detail>`,
};

export default meta;
type Story = StoryObj<UauiFigureDetailElement>;

/** The figure's text fills the `{0}`. */
export const NumberFilledIn: Story = {
    name: "Number filled in",
};

/** A compact figure: it shows "114K" and keeps the exact amount for hover and screen readers. */
export const ShortNumberWithExact: Story = {
    name: "Short number with exact amount",
    args: { figure: { text: "114K", exact: "114,300" } },
};

/** A pattern with no `{0}` is drawn as a plain note. */
export const PlainNote: Story = {
    name: "Plain note",
    args: { pattern: "Estimated", figure: undefined },
};

/** Only `{0}` is a placeholder. Others stay as typed. */
export const OtherPlaceholders: Story = {
    name: "Other placeholders left as typed",
    render: () => html`
        <div style="display: grid; gap: 8px">
            <uaui-figure-detail .pattern=${"{0} of {1}"} .figure=${{ text: "5" }}></uaui-figure-detail>
            <uaui-figure-detail .pattern=${"%0% x"} .figure=${{ text: "5" }}></uaui-figure-detail>
        </div>
    `,
};

/** A line that is too long is cut with "…", and its title holds the full text. */
export const LongLine: Story = {
    name: "Long line cut",
    args: { pattern: "{0} cached across every region, including the ones added last month" },
    render: (args) => html`<div style="width: 200px"><uaui-figure-detail .pattern=${args.pattern} .figure=${args.figure}></uaui-figure-detail></div>`,
};

/** A pattern with `{0}` but no figure: nothing is drawn. */
export const NoFigure: Story = {
    name: "No figure",
    args: { figure: undefined },
};

/** An empty pattern: nothing is drawn. */
export const EmptyPattern: Story = {
    name: "Empty pattern",
    args: { pattern: "" },
};
