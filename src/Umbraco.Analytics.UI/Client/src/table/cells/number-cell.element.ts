import { css, customElement, html, nothing, property, type CSSResultGroup, type PropertyValues } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { asNumber, getNumberFormat } from "../internal/number-format.js";
import "../internal/table-skeleton-cell.element.js";
import type { UaxTableCellElement, UaxTableColumn } from "../types.js";

/**
 * A table cell that shows its value as a number in the editor's culture, formatted with the column's `valueFormat`.
 * A missing or non-numeric value shows nothing. Its name is `UAX_TABLE_CELL.number`, and it is usable on its own.
 *
 * @element uax-number-cell
 */
@customElement("uax-number-cell")
export class UaxNumberCellElement extends UmbLitElement implements UaxTableCellElement {
    /** The column the cell is in. Its `valueFormat` formats the number. */
    @property({ attribute: false })
    column: UaxTableColumn = { key: "value", label: "" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The number to show. */
    @property({ attribute: false })
    value: unknown;

    #format?: { column: UaxTableColumn; lang: string; format: Intl.NumberFormat };

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const lang = this.localize.lang();
        // Resolved once per column and language, not per render: the cache key is built from the options.
        if (this.#format?.column !== this.column || this.#format.lang !== lang) {
            this.#format = { column: this.column, lang, format: getNumberFormat(lang, this.column.valueFormat) };
        }
    }

    /** Draws a placeholder instead of the value while the table loads. */
    @property({ type: Boolean })
    loading = false;

    override render() {
        if (this.loading) return html`<uax-table-skeleton-cell .align=${this.column.align ?? "start"}></uax-table-skeleton-cell>`;
        const value = asNumber(this.value);
        return value === undefined ? nothing : html`${this.#format!.format.format(value)}`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            font-variant-numeric: tabular-nums;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-number-cell": UaxNumberCellElement;
    }
}
