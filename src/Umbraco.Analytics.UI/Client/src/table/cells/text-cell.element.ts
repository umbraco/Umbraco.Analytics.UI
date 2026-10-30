import { customElement, html, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { asText } from "../internal/number-format.js";
import "../internal/table-skeleton-cell.element.js";
import type { UaxTableCellElement, UaxTableColumn } from "../types.js";

/**
 * A table cell that shows its value as plain text. Its name is `UAX_TABLE_CELL.text`, and it is usable on its own.
 *
 * @element uax-text-cell
 */
@customElement("uax-text-cell")
export class UaxTextCellElement extends UmbLitElement implements UaxTableCellElement {
    /** The column the cell is in. */
    @property({ attribute: false })
    column: UaxTableColumn = { key: "value", label: "" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The text to show. Strings, numbers and booleans are shown as they are, anything else as empty. */
    @property({ attribute: false })
    value: unknown;

    /** Draws a placeholder instead of the value while the table loads. */
    @property({ type: Boolean })
    loading = false;

    override render() {
        if (this.loading) return html`<uax-table-skeleton-cell .align=${this.column.align ?? "start"}></uax-table-skeleton-cell>`;
        return html`${asText(this.value)}`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-text-cell": UaxTextCellElement;
    }
}
