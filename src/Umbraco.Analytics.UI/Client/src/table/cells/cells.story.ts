import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { html } from "#platform/lit";
import type { UauiTableColumn } from "../types.js";
import "./text-cell.element.js";
import "./link-cell.element.js";
import "./number-cell.element.js";
import "./percent-cell.element.js";
import "./share-cell.element.js";
import "./status-cell.element.js";
import "./date-cell.element.js";
import "./progress-cell.element.js";
import "../data-table.element.js";

// Each public cell used on its own, as the table uses it: `column`, `item` and `value` are set, `loading` draws the
// placeholder. Inside a `uaui-data-table` the share cell also reads the column's total and largest value from the
// table's context; on its own they are set with `total` and `max`.

const meta: Meta = {
    title: "Components/Data Table/Cells",
    parameters: {
        layout: "padded",
        docs: {
            description: {
                component:
                    "The ready-made cells of `uaui-data-table`. Name one in a column's `elementName` (`UAUI_TABLE_CELL.text` and the others), or use the element on its own. They follow the CMS `umb-table` cell contract: the table sets `column`, `item` and `value`.",
            },
        },
    },
    decorators: [(story) => html`<div style="width: 320px; padding: var(--uui-size-space-4); background: var(--uui-color-surface); border-radius: var(--uui-border-radius-3)">${story()}</div>`],
};

export default meta;
type Story = StoryObj;

const textColumn: UauiTableColumn = { key: "name", label: "Name" };
const linkColumn: UauiTableColumn = { key: "name", label: "Page", meta: { hrefKey: "url" } };
const numberColumn: UauiTableColumn = { key: "orders", label: "Orders", align: "end" };
const currencyColumn: UauiTableColumn = { key: "revenue", label: "Revenue", align: "end", valueFormat: { style: "currency", currency: "EUR", maximumFractionDigits: 0 } };
const percentColumn: UauiTableColumn = { key: "refundRate", label: "Refund rate", align: "end" };
const shareColumn: UauiTableColumn = { key: "pageviews", label: "Pageviews" };
const statusColumn: UauiTableColumn = {
    key: "daysLeft",
    label: "Days left",
    align: "end",
    valueFormat: { style: "unit", unit: "day", unitDisplay: "long", maximumFractionDigits: 0 },
    meta: { colorKey: "color", textKey: "text" },
};
const dateColumn: UauiTableColumn = { key: "validFrom", label: "Valid from", sortAs: "date" };
const progressColumn: UauiTableColumn = { key: "completed", label: "Progress", sortAs: "number", meta: { totalKey: "steps" } };
const longDateColumn: UauiTableColumn = { ...dateColumn, dateFormat: { weekday: "short", day: "numeric", month: "long", year: "numeric" } };

/** `uaui-text-cell` (`UAUI_TABLE_CELL.text`, the default): strings, numbers and booleans as plain text. */
export const Text: Story = {
    render: () => html`<uaui-text-cell .column=${textColumn} .item=${{ name: "Umbraco hoodie" }} .value=${"Umbraco hoodie"}></uaui-text-cell>`,
    parameters: { docs: { source: { code: `<uaui-text-cell .column=\${column} .item=\${row} .value=\${row.name}></uaui-text-cell>`, language: "html" } } },
};

/** `uaui-link-cell` (`UAUI_TABLE_CELL.link`): the value as a link to the URL in `item[column.meta.hrefKey]`. A missing or unsafe URL (not http, https, mailto, tel or relative) shows plain text. */
export const Link: Story = {
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-3)">
            <uaui-link-cell .column=${linkColumn} .item=${{ url: "https://www.example.com/contact/" }} .value=${"https://www.example.com/contact/"}></uaui-link-cell>
            <uaui-link-cell .column=${linkColumn} .item=${{ url: "javascript:alert(1)" }} .value=${"Unsafe URL, shown as text"}></uaui-link-cell>
        </div>`,
    parameters: { docs: { source: { code: `const column = { key: "name", label: "Page", meta: { hrefKey: "url" } };\n\n<uaui-link-cell .column=\${column} .item=\${row} .value=\${row.name}></uaui-link-cell>`, language: "html" } } },
};

/**
 * `meta.secondaryKey` names the key in each row that holds a muted second line under the value, such as a SKU under a
 * product name, an email under a customer name or a date range under a discount name. In a link cell only the first
 * line is the link. The second line is one line, cut with an ellipsis (its `title` has the full text), and while loading
 * the placeholder draws two lines.
 */
export const SecondLine: Story = {
    name: "Second line",
    render: () => {
        const text: UauiTableColumn = { key: "name", label: "Product", meta: { secondaryKey: "sku" } };
        const link: UauiTableColumn = { key: "name", label: "Customer", meta: { hrefKey: "url", secondaryKey: "email" } };
        const range: UauiTableColumn = { key: "name", label: "Discount", meta: { secondaryKey: "range" } };
        return html`<div style="display: grid; gap: var(--uui-size-space-4); width: 240px">
            <uaui-text-cell .column=${text} .item=${{ name: "Umbraco hoodie", sku: "SKU-0042-BLACK-M" }} .value=${"Umbraco hoodie"}></uaui-text-cell>
            <uaui-link-cell .column=${link} .item=${{ name: "Jane Smith", url: "/customers/1", email: "jane.smith@a-very-long-company-name.example.com" }} .value=${"Jane Smith"}></uaui-link-cell>
            <uaui-text-cell .column=${range} .item=${{ name: "Summer sale", range: "1 Jun 2026 to 31 Aug 2026" }} .value=${"Summer sale"}></uaui-text-cell>
            <uaui-text-cell loading .column=${text}></uaui-text-cell>
        </div>`;
    },
    parameters: { docs: { source: { code: `const column = { key: "name", label: "Product", meta: { secondaryKey: "sku" } };\n\n<uaui-text-cell .column=\${column} .item=\${row} .value=\${row.name}></uaui-text-cell>`, language: "html" } } },
};

/** `uaui-number-cell` (`UAUI_TABLE_CELL.number`): a number in the editor's culture, formatted with the column's `valueFormat`. Set `align: "end"` on the column for numbers. */
export const NumberCell: Story = {
    name: "Number",
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-3); justify-items: end">
            <uaui-number-cell .column=${numberColumn} .item=${{ orders: 1240 }} .value=${1240}></uaui-number-cell>
            <uaui-number-cell .column=${currencyColumn} .item=${{ revenue: 48200 }} .value=${48200}></uaui-number-cell>
        </div>`,
    parameters: { docs: { source: { code: `const column = { key: "revenue", label: "Revenue", align: "end", valueFormat: { style: "currency", currency: "EUR", maximumFractionDigits: 0 } };\n\n<uaui-number-cell .column=\${column} .item=\${row} .value=\${row.revenue}></uaui-number-cell>`, language: "html" } } },
};

/** `uaui-percent-cell` (`UAUI_TABLE_CELL.percent`): a fraction as a percentage, so 0.032 is "3.2%". */
export const Percent: Story = {
    render: () => html`<div style="display: grid; justify-items: end"><uaui-percent-cell .column=${percentColumn} .item=${{ refundRate: 0.032 }} .value=${0.032}></uaui-percent-cell></div>`,
    parameters: { docs: { source: { code: `<uaui-percent-cell .column=\${column} .item=\${row} .value=\${row.refundRate}></uaui-percent-cell>`, language: "html" } } },
};

/**
 * A number or percent cell shows a change badge (`uaui-table-compare-badge`) when the table has a compare row for the row. Set
 * `meta: { lowerIsBetter: true }` on a column where a fall is good: the badge then shows it in green.
 */
export const CompareBadge: Story = {
    name: "Number and percent with compare",
    render: () => {
        const columns: UauiTableColumn[] = [
            { key: "name", label: "Name" },
            { key: "successRate", label: "Success", elementName: "uaui-percent-cell", align: "end" },
            { key: "avgMs", label: "Avg ms", elementName: "uaui-number-cell", align: "end", valueFormat: { maximumFractionDigits: 0 }, meta: { lowerIsBetter: true } },
        ];
        const rows = [
            { name: "A", successRate: 0.97, avgMs: 820 },
            { name: "B", successRate: 0.91, avgMs: 1430 },
        ];
        const compareRows = [
            { name: "A", successRate: 0.95, avgMs: 1000 },
            { name: "B", successRate: 0.94, avgMs: 1210 },
        ];
        return html`<uaui-data-table .columns=${columns} .rows=${rows} .compareRows=${compareRows} row-key="name"></uaui-data-table>`;
    },
    parameters: { docs: { source: { code: `{ key: "avgMs", label: "Avg duration", elementName: UAUI_TABLE_CELL.number, meta: { lowerIsBetter: true } }\n\n<uaui-data-table .columns=\${columns} .rows=\${rows} .compareRows=\${compareRows} row-key="name"></uaui-data-table>`, language: "html" } } },
};

/** `uaui-share-cell` (`UAUI_TABLE_CELL.share`): the value, its percent of `total` and a bar scaled to `max`. With a `compare-value` (or a compare row in a table) it adds a change badge. Inside a table it reads `total`, `max` and the compare row from the table's context. */
export const Share: Story = {
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-4)">
            <uaui-share-cell .column=${shareColumn} .item=${{ pageviews: 28 }} .value=${28} .total=${272} .max=${210}></uaui-share-cell>
            <uaui-share-cell .column=${shareColumn} .item=${{ pageviews: 210 }} .value=${210} .total=${272} .max=${210} .compareValue=${190} .color=${2}></uaui-share-cell>
        </div>`,
    parameters: { docs: { source: { code: `<uaui-share-cell .column=\${column} .item=\${row} .value=\${row.pageviews} .total=\${272} .max=\${210} .compareValue=\${190}></uaui-share-cell>`, language: "html" } } },
};

/**
 * `uaui-status-cell` (`UAUI_TABLE_CELL.status`): the value as a tinted label in one of `uui-tag`'s colours, `default`,
 * `positive`, `warning` or `danger`. The row picks the color in the field `column.meta.colorKey` names (anything else is
 * `default`) and the words in `column.meta.textKey`; without words the cell shows the value, formatted with
 * `valueFormat`. The words carry the meaning, never the colour alone. Sorting and search use the value.
 */
export const Status: Story = {
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-3); justify-items: end">
            <uaui-status-cell .column=${statusColumn} .item=${{ daysLeft: 0, color: "danger", text: "Out of stock" }} .value=${0}></uaui-status-cell>
            <uaui-status-cell .column=${statusColumn} .item=${{ daysLeft: 5, color: "danger" }} .value=${5}></uaui-status-cell>
            <uaui-status-cell .column=${statusColumn} .item=${{ daysLeft: 12, color: "warning" }} .value=${12}></uaui-status-cell>
            <uaui-status-cell .column=${statusColumn} .item=${{ daysLeft: 30, color: "positive" }} .value=${30}></uaui-status-cell>
            <uaui-status-cell .column=${statusColumn} .item=${{ daysLeft: 40, color: "default", text: "Not tracked" }} .value=${40}></uaui-status-cell>
        </div>`,
    parameters: {
        docs: {
            source: {
                code: `const column = {\n    key: "daysLeft",\n    label: "Days left",\n    elementName: UAUI_TABLE_CELL.status,\n    valueFormat: { style: "unit", unit: "day", unitDisplay: "long" },\n    sortable: true,\n    sortAs: "number",\n    meta: { colorKey: "color", textKey: "text" },\n};\nconst row = { daysLeft: 0, color: "danger", text: "Out of stock" };\n\n<uaui-status-cell .column=\${column} .item=\${row} .value=\${row.daysLeft}></uaui-status-cell>`,
                language: "html",
            },
        },
    },
};

/**
 * `uaui-date-cell` (`UAUI_TABLE_CELL.date`): an ISO date as a date in the editor's culture, formatted with the column's
 * `dateFormat` (default `{ dateStyle: "medium" }`). A date-time is read as its day, as written, so no timezone moves it.
 * A missing or invalid date shows nothing. Sort the column with `sortAs: "date"` (missing dates last); search looks in
 * the ISO value.
 */
export const DateCell: Story = {
    name: "Date",
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-3)">
            <uaui-date-cell .column=${dateColumn} .item=${{ validFrom: "2026-06-01" }} .value=${"2026-06-01"}></uaui-date-cell>
            <uaui-date-cell .column=${dateColumn} .item=${{ validFrom: "2026-06-01T23:30:00-05:00" }} .value=${"2026-06-01T23:30:00-05:00"}></uaui-date-cell>
            <uaui-date-cell .column=${longDateColumn} .item=${{ validFrom: "2026-06-01" }} .value=${"2026-06-01"}></uaui-date-cell>
            <uaui-date-cell lang="da-DK" .column=${dateColumn} .item=${{ validFrom: "2026-06-01" }} .value=${"2026-06-01"}></uaui-date-cell>
        </div>`,
    parameters: {
        docs: {
            source: {
                code: `const column = {\n    key: "validFrom",\n    label: "Valid from",\n    elementName: UAUI_TABLE_CELL.date,\n    dateFormat: { dateStyle: "medium" },\n    sortable: true,\n    sortAs: "date",\n};\nconst row = { validFrom: "2026-06-01" };\n\n<uaui-date-cell .column=\${column} .item=\${row} .value=\${row.validFrom}></uaui-date-cell>`,
                language: "html",
            },
        },
    },
};

/**
 * `uaui-progress-cell` (`UAUI_TABLE_CELL.progress`): "2 of 3" with a thin bar, e.g. a workflow's completed steps. The
 * value is the completed count and `column.meta.totalKey` names the row field with the total. The text carries the
 * meaning; the bar is decorative. Without a total it shows the count alone; a total of 0 shows "0 of 0" and an empty
 * bar. The bar fills from the start, so it runs right to left in RTL. Sort by the completed count with `sortAs: "number"`.
 */
export const Progress: Story = {
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-4)">
            <uaui-progress-cell .column=${progressColumn} .item=${{ completed: 2, steps: 3 }} .value=${2}></uaui-progress-cell>
            <uaui-progress-cell .column=${progressColumn} .item=${{ completed: 3, steps: 3 }} .value=${3}></uaui-progress-cell>
            <uaui-progress-cell .column=${progressColumn} .item=${{ completed: 0, steps: 4 }} .value=${0}></uaui-progress-cell>
            <uaui-progress-cell .column=${progressColumn} .item=${{ completed: 0, steps: 0 }} .value=${0}></uaui-progress-cell>
            <uaui-progress-cell .column=${progressColumn} .item=${{ completed: 2 }} .value=${2}></uaui-progress-cell>
            <uaui-progress-cell dir="rtl" .column=${progressColumn} .item=${{ completed: 1, steps: 3 }} .value=${1}></uaui-progress-cell>
        </div>`,
    parameters: {
        docs: {
            source: {
                code: `const column = {\n    key: "completed",\n    label: "Progress",\n    elementName: UAUI_TABLE_CELL.progress,\n    sortable: true,\n    sortAs: "number",\n    meta: { totalKey: "steps" },\n};\nconst row = { completed: 2, steps: 3 };\n\n<uaui-progress-cell .column=\${column} .item=\${row} .value=\${row.completed}></uaui-progress-cell>`,
                language: "html",
            },
        },
    },
};

/** With `loading` every cell draws its own placeholder, as tall as a loaded cell, so a table doesn't jump when its data arrives. */
export const Loading: Story = {
    render: () =>
        html`<div style="display: grid; gap: var(--uui-size-space-4)">
            <uaui-text-cell loading .column=${textColumn}></uaui-text-cell>
            <uaui-link-cell loading .column=${linkColumn}></uaui-link-cell>
            <uaui-number-cell loading .column=${numberColumn}></uaui-number-cell>
            <uaui-percent-cell loading .column=${percentColumn}></uaui-percent-cell>
            <uaui-share-cell loading .column=${shareColumn}></uaui-share-cell>
            <uaui-status-cell loading .column=${statusColumn}></uaui-status-cell>
            <uaui-date-cell loading .column=${dateColumn}></uaui-date-cell>
            <uaui-progress-cell loading .column=${progressColumn}></uaui-progress-cell>
        </div>`,
    parameters: { docs: { source: { code: `<uaui-text-cell loading .column=\${column}></uaui-text-cell>`, language: "html" } } },
};
