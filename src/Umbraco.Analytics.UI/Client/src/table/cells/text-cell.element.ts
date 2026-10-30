import { customElement, html, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { asText } from "../internal/number-format.js";
import type { UaxTableCellElement, UaxTableColumn } from "../types.js";

/**
 * A table cell that shows its value as plain text. The built-in cell of a `text` column, and usable on its own.
 *
 * @element uax-text-cell
 */
@customElement("uax-text-cell")
export class UaxTextCellElement extends UmbLitElement implements UaxTableCellElement {
    /** The column the cell is in. */
    @property({ attribute: false })
    column: UaxTableColumn = { key: "value", label: "", type: "text" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The text to show. Strings, numbers and booleans are shown as they are, anything else as empty. */
    @property({ attribute: false })
    value: unknown;

    override render() {
        return html`${asText(this.value)}`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-text-cell": UaxTextCellElement;
    }
}
