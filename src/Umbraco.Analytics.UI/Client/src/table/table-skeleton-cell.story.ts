import type { Meta, StoryObj } from "@storybook/web-components-vite";
import { css, customElement, html, property, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "./table-skeleton-cell.element.js";
import "./data-table.element.js";
import type { UauiTableSkeletonCellElement } from "./table-skeleton-cell.element.js";
import type { UauiTableCellElement, UauiTableColumn } from "./types.js";

const meta: Meta<UauiTableSkeletonCellElement> = {
    title: "Components/Data Table/Skeleton cell",
    component: "uaui-table-skeleton-cell",
    parameters: {
        docs: {
            description: {
                component:
                    "The placeholder a table cell draws while the table loads. Use it in a custom cell that has a `loading` property, with `lines` set to the number of lines the loaded cell has (`2` for a value with a second line under it), so the row doesn't change height when the data arrives.",
            },
        },
    },
    args: { align: "start", lines: 1 },
    render: (args) =>
        html`<div style="width: 240px">
            <uaui-table-skeleton-cell .lines=${args.lines} align=${args.align}></uaui-table-skeleton-cell>
        </div>`,
};

export default meta;
type Story = StoryObj<UauiTableSkeletonCellElement>;

/** A block at the start of the cell. */
export const Default: Story = {};

/** A block at the end of the cell, for a column aligned to the end. */
export const AlignedToEnd: Story = { name: "Aligned to end", args: { align: "end" } };

/** Two lines, for a cell with a second line under its value. */
export const TwoLines: Story = { name: "Two lines", args: { lines: 2 } };

/** A custom cell with a second line: its own element name goes in `column.elementName`, and it draws the skeleton cell while `loading`. */
@customElement("uaui-story-customer-cell")
class StoryCustomerCellElement extends UmbLitElement implements UauiTableCellElement {
    @property({ attribute: false }) column: UauiTableColumn = { key: "", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;
    @property({ type: Boolean }) loading = false;

    override render() {
        if (this.loading) return html`<uaui-table-skeleton-cell .lines=${2} .align=${this.column.align ?? "start"}></uaui-table-skeleton-cell>`;
        return html`<div>${String(this.value ?? "")}</div><div class="note">${String(this.item.plan ?? "")}</div>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: block;
        }

        .note {
            height: 16px;
            font-size: 12px;
            line-height: 16px;
            color: var(--uui-color-text-alt);
        }
    `;
}


declare global {
    interface HTMLElementTagNameMap {
        "uaui-story-customer-cell": StoryCustomerCellElement;
    }
}

const customColumns: UauiTableColumn[] = [{ key: "name", label: "Customer", elementName: "uaui-story-customer-cell" }];

/** A table of a custom two-line cell while it loads: the placeholder rows are as tall as the loaded rows. */
export const InACustomCell: Story = {
    name: "In a custom cell",
    render: () => html`<uaui-data-table loading .columns=${customColumns} .rows=${[]}></uaui-data-table>`,
    parameters: { docs: { source: { code: `<uaui-table-skeleton-cell .lines=\${2} .align=\${column.align ?? "start"}></uaui-table-skeleton-cell>`, language: "html" } } },
};
