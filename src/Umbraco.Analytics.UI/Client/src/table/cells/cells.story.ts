import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "@umbraco-cms/backoffice/external/lit";
import type { UaxTableColumn } from "../types.js";
import "./text-cell.element.js";
import "./link-cell.element.js";
import "./number-cell.element.js";
import "./percent-cell.element.js";
import "./share-cell.element.js";

// Each public cell used on its own, as the table uses it: `column`, `item` and `value` are set, `loading` draws the
// placeholder. Inside a `uax-data-table` the share cell also reads the column's total and largest value from the
// table's context; on its own they are set with `total` and `max`.

const meta: Meta = {
    title: "Components/Data Table/Cells",
    parameters: {
        layout: "padded",
        docs: {
            description: {
                component:
                    "The ready-made cells of `uax-data-table`. Name one in a column's `elementName` (`UAX_TABLE_CELL.text` and the others), or use the element on its own. They follow the CMS `umb-table` cell contract: the table sets `column`, `item` and `value`.",
            },
        },
    },
    decorators: [(story) => html`<div style="width: 320px; padding: var(--uui-size-space-4); background: var(--uui-color-surface); border-radius: var(--uui-border-radius-3)">${story()}</div>`],
};

export default meta;
type Story = StoryObj;

const textColumn: UaxTableColumn = { key: "name", label: "Name" };
const linkColumn: UaxTableColumn = { key: "name", label: "Page", hrefKey: "url" };
const numberColumn: UaxTableColumn = { key: "orders", label: "Orders", align: "end" };
const currencyColumn: UaxTableColumn = { key: "revenue", label: "Revenue", align: "end", valueFormat: { style: "currency", currency: "EUR", maximumFractionDigits: 0 } };
const percentColumn: UaxTableColumn = { key: "refundRate", label: "Refund rate", align: "end" };
const shareColumn: UaxTableColumn = { key: "pageviews", label: "Pageviews" };

/** `uax-text-cell` (`UAX_TABLE_CELL.text`, the default): strings, numbers and booleans as plain text. */
export const Text: Story = {
    render: () => html`<uax-text-cell .column=${textColumn} .item=${{ name: "Umbraco hoodie" }} .value=${"Umbraco hoodie"}></uax-text-cell>`,
    parameters: { docs: { source: { code: `<uax-text-cell .column=\${column} .item=\${row} .value=\${row.name}></uax-text-cell>`, language: "html" } } },
};

/** `uax-link-cell` (`UAX_TABLE_CELL.link`): the value as a link to the URL in `item[column.hrefKey]`. A missing or unsafe URL (not http, https, mailto, tel or relative) shows plain text. */
export const Link: Story = {
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-3)">
            <uax-link-cell .column=${linkColumn} .item=${{ url: "https://www.example.com/contact/" }} .value=${"https://www.example.com/contact/"}></uax-link-cell>
            <uax-link-cell .column=${linkColumn} .item=${{ url: "javascript:alert(1)" }} .value=${"Unsafe URL, shown as text"}></uax-link-cell>
        </div>`,
    parameters: { docs: { source: { code: `const column = { key: "name", label: "Page", hrefKey: "url" };\n\n<uax-link-cell .column=\${column} .item=\${row} .value=\${row.name}></uax-link-cell>`, language: "html" } } },
};

/** `uax-number-cell` (`UAX_TABLE_CELL.number`): a number in the editor's culture, formatted with the column's `valueFormat`. Set `align: "end"` on the column for numbers. */
export const NumberCell: Story = {
    name: "Number",
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-3); justify-items: end">
            <uax-number-cell .column=${numberColumn} .item=${{ orders: 1240 }} .value=${1240}></uax-number-cell>
            <uax-number-cell .column=${currencyColumn} .item=${{ revenue: 48200 }} .value=${48200}></uax-number-cell>
        </div>`,
    parameters: { docs: { source: { code: `const column = { key: "revenue", label: "Revenue", align: "end", valueFormat: { style: "currency", currency: "EUR", maximumFractionDigits: 0 } };\n\n<uax-number-cell .column=\${column} .item=\${row} .value=\${row.revenue}></uax-number-cell>`, language: "html" } } },
};

/** `uax-percent-cell` (`UAX_TABLE_CELL.percent`): a fraction as a percentage, so 0.032 is "3.2%". */
export const Percent: Story = {
    render: () => html`<div style="display: grid; justify-items: end"><uax-percent-cell .column=${percentColumn} .item=${{ refundRate: 0.032 }} .value=${0.032}></uax-percent-cell></div>`,
    parameters: { docs: { source: { code: `<uax-percent-cell .column=\${column} .item=\${row} .value=\${row.refundRate}></uax-percent-cell>`, language: "html" } } },
};

/** `uax-share-cell` (`UAX_TABLE_CELL.share`): the value, its percent of `total` and a bar scaled to `max`. With a `compare-value` it adds a change badge. Inside a table it reads `total`, `max` and the compare row from the table's context. */
export const Share: Story = {
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-4)">
            <uax-share-cell .column=${shareColumn} .item=${{ pageviews: 28 }} .value=${28} .total=${272} .max=${210}></uax-share-cell>
            <uax-share-cell .column=${shareColumn} .item=${{ pageviews: 210 }} .value=${210} .total=${272} .max=${210} .compareValue=${190} .color=${2}></uax-share-cell>
        </div>`,
    parameters: { docs: { source: { code: `<uax-share-cell .column=\${column} .item=\${row} .value=\${row.pageviews} .total=\${272} .max=\${210} .compareValue=\${190}></uax-share-cell>`, language: "html" } } },
};

/** With `loading` every cell draws its own placeholder, as tall as a loaded cell, so a table doesn't jump when its data arrives. */
export const Loading: Story = {
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-4)">
            <uax-text-cell loading .column=${textColumn}></uax-text-cell>
            <uax-link-cell loading .column=${linkColumn}></uax-link-cell>
            <uax-number-cell loading .column=${numberColumn}></uax-number-cell>
            <uax-percent-cell loading .column=${percentColumn}></uax-percent-cell>
            <uax-share-cell loading .column=${shareColumn}></uax-share-cell>
        </div>`,
    parameters: { docs: { source: { code: `<uax-text-cell loading .column=\${column}></uax-text-cell>`, language: "html" } } },
};
