import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { notPublicApi } from "../../internal/story/internal.js";
import "./table-skeleton-cell.element.js";
import type { UaxTableSkeletonCellElement } from "./table-skeleton-cell.element.js";

const meta: Meta<UaxTableSkeletonCellElement> = {
    title: "Internal/Table skeleton cell",
    component: "uax-table-skeleton-cell",
    tags: ["internal"],
    parameters: {
        docs: { description: { component: notPublicApi("`uax-table-skeleton-cell` is the placeholder in a loading table cell.") } },
    },
    args: { width: 50, align: "start" },
    render: (args) =>
        // The table sets these two custom properties on its rows; here they are set by hand.
        html`<div style="width: 240px; --_uax-table-content-height: 24px; --_uax-skeleton-height: 14px">
            <uax-table-skeleton-cell .width=${args.width} align=${args.align}></uax-table-skeleton-cell>
        </div>`,
};

export default meta;
type Story = StoryObj<UaxTableSkeletonCellElement>;

/** A block at the start of the cell. */
export const Default: Story = {};

/** A block at the end of the cell, for a column aligned to the end. */
export const AlignedToEnd: Story = { name: "Aligned to end", args: { width: 40, align: "end" } };
