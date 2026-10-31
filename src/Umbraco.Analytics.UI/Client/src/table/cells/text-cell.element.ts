import { customElement, html, property, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { asText } from "../internal/cell-values.js";
import "../internal/table-skeleton-cell.element.js";
import type { UauiTableCellElement, UauiTableColumn } from "../types.js";

/**
 * A table cell that shows its value as plain text. Its name is `UAUI_TABLE_CELL.text`, and it is usable on its own.
 *
 * @element uaui-text-cell
 */
@customElement("uaui-text-cell")
export class UauiTextCellElement extends UmbLitElement implements UauiTableCellElement {
    /** The column the cell is in. */
    @property({ attribute: false })
    column: UauiTableColumn = { key: "value", label: "" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The text to show. Strings, numbers and booleans are shown as they are, anything else as empty. */
    @property({ attribute: false })
    value: unknown;

    /** Draws a placeholder instead of the value while the table loads. */
    @property({ type: Boolean })
    loading = false;

    override render(): TemplateResult {
        if (this.loading) return html`<uaui-table-skeleton-cell .align=${this.column.align ?? "start"}></uaui-table-skeleton-cell>`;
        return html`${asText(this.value)}`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-text-cell": UauiTextCellElement;
    }
}
