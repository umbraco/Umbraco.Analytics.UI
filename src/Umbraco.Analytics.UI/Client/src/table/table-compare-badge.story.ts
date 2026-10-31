import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UauiTableColumn } from "./types.js";
import "./table-compare-badge.element.js";

// The badge used on its own, as a product's cell uses it: `column`, `item` and `value` are set. Inside a
// `uaui-data-table` it finds the compare row itself; on its own, set `compare-value`.

const meta: Meta = {
    title: "Components/Data Table/Compare badge",
    component: "uaui-table-compare-badge",
    parameters: {
        layout: "padded",
        docs: {
            description: {
                component:
                    "The change badge of a table cell: how the cell's value moved against the same row in the compare period. The built-in number, percent and share cells use it, and so can your own. Whether a fall is good comes from the column's `meta.lowerIsBetter`. It shows nothing without a compare value, or when that is 0.",
            },
        },
    },
    decorators: [(story) => html`<div style="display: flex; align-items: center; gap: var(--uui-size-space-3)">${story()}</div>`],
};

export default meta;
type Story = StoryObj;

const column: UauiTableColumn = { key: "orders", label: "Orders" };
const lowerIsBetter: UauiTableColumn = { key: "ms", label: "Duration", meta: { lowerIsBetter: true } };

/** With a `compare-value`, the badge shows the percent change from it to `value`. Inside a table the compare row supplies it. */
export const Default: Story = {
    render: () => html`<uaui-table-compare-badge .column=${column} .item=${{ orders: 120 }} .value=${120} .compareValue=${100}></uaui-table-compare-badge>`,
    parameters: { docs: { source: { code: `<uaui-table-compare-badge .column=\${this.column} .item=\${this.item} .value=\${this.value}></uaui-table-compare-badge>`, language: "html" } } },
};

/** Without a compare value, or with a compare value of 0 (nothing to divide by), the badge shows nothing. */
export const NoCompare: Story = {
    name: "No compare value, or 0",
    render: () =>
        html`<span>Missing:</span>
            <uaui-table-compare-badge .column=${column} .item=${{ orders: 120 }} .value=${120}></uaui-table-compare-badge>
            <span>Zero:</span>
            <uaui-table-compare-badge .column=${column} .item=${{ orders: 120 }} .value=${120} .compareValue=${0}></uaui-table-compare-badge>`,
};

/** With `meta.lowerIsBetter` on the column, a fall is good (green) and a rise is bad (red). The other column here has the default. */
export const LowerIsBetter: Story = {
    name: "Lower is better",
    render: () =>
        html`<span>Rise:</span>
            <uaui-table-compare-badge .column=${lowerIsBetter} .item=${{ ms: 120 }} .value=${120} .compareValue=${100}></uaui-table-compare-badge>
            <span>Fall:</span>
            <uaui-table-compare-badge .column=${lowerIsBetter} .item=${{ ms: 80 }} .value=${80} .compareValue=${100}></uaui-table-compare-badge>`,
    parameters: { docs: { source: { code: `const column = { key: "ms", label: "Duration", meta: { lowerIsBetter: true } };`, language: "html" } } },
};

/** `size="md"` is the full-size badge, as on a KPI tile. The default, `sm`, is for table cells. */
export const SizeMd: Story = {
    name: "Size md",
    render: () => html`<uaui-table-compare-badge size="md" .column=${column} .item=${{ orders: 120 }} .value=${120} .compareValue=${100}></uaui-table-compare-badge>`,
};
