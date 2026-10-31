import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./table-sort-button.element.js";
import type { UauiTableSortButtonElement } from "./table-sort-button.element.js";

const meta: Meta<UauiTableSortButtonElement> = {
    title: "Internal/Table sort button",
    component: "uaui-table-sort-button",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uaui-table-sort-button` is the button inside a sortable column header.") } },
    },
    args: { active: false, descending: false, align: "start" },
    render: (args) =>
        html`<div style="width: 200px; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase">
            <uaui-table-sort-button ?active=${args.active} ?descending=${args.descending} align=${args.align}>Pageviews</uaui-table-sort-button>
        </div>`,
};

export default meta;
type Story = StoryObj<UauiTableSortButtonElement>;

/** Not the sorted column: the symbol shows on hover and focus. */
export const Inactive: Story = {};

/** The sorted column, ascending. */
export const Ascending: Story = { args: { active: true } };

/** The sorted column, descending. */
export const Descending: Story = { args: { active: true, descending: true } };

/** A column aligned to the end: the label sits on the right. */
export const AlignedToEnd: Story = { name: "Aligned to end", args: { active: true, align: "end" } };
