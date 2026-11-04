import { css, customElement, html, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { asText } from "../internal/cell-values.js";
import "../table-skeleton-cell.element.js";
import "../internal/table-secondary-line.element.js";
import type { UauiTableCellElement, UauiTableColumn } from "../types.js";

/**
 * A table cell that shows its value as plain text, with an optional muted second line under it from the item's
 * `column.meta.secondaryKey` value. Its name is `UAUI_TABLE_CELL.text`, and it is usable on its own.
 *
 * @element uaui-text-cell
 */
@customElement("uaui-text-cell")
export class UauiTextCellElement extends UmbLitElement implements UauiTableCellElement {
    /** The column the cell is in. */
    @property({ attribute: false })
    column: UauiTableColumn = { key: "value", label: "" };

    /** The row the cell is in. Its `column.meta.secondaryKey` value is the second line. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The text to show. Strings, numbers and booleans are shown as they are, anything else as empty. */
    @property({ attribute: false })
    value: unknown;

    /** Draws a placeholder instead of the value while the table loads. */
    @property({ type: Boolean })
    loading = false;

    override render(): TemplateResult {
        const secondaryKey = this.column.meta?.secondaryKey;
        if (this.loading) return html`<uaui-table-skeleton-cell .align=${this.column.align ?? "start"} .lines=${secondaryKey ? 2 : 1}></uaui-table-skeleton-cell>`;
        return secondaryKey
            ? html`<div>${asText(this.value)}</div><uaui-table-secondary-line .align=${this.column.align ?? "start"} .text=${asText(this.item[secondaryKey])}></uaui-table-secondary-line>`
            : html`${asText(this.value)}`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: block;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-text-cell": UauiTextCellElement;
    }
}
