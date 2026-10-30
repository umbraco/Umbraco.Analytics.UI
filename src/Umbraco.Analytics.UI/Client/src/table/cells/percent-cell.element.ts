import { css, customElement, html, nothing, property, type CSSResultGroup, type PropertyValues } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { asNumber, getNumberFormat } from "../internal/number-format.js";
import type { UaxTableCellElement, UaxTableColumn } from "../types.js";

const percentFormatOptions: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 1 };

/**
 * A table cell that shows its value, a fraction (0.25 is "25%"), as a percentage in the editor's culture.
 * The column's `valueFormat` overrides the default of one decimal at most. A missing or non-numeric value shows nothing.
 * The built-in cell of a `percent` column, and usable on its own.
 *
 * @element uax-percent-cell
 */
@customElement("uax-percent-cell")
export class UaxPercentCellElement extends UmbLitElement implements UaxTableCellElement {
    /** The column the cell is in. Its `valueFormat` formats the percentage. */
    @property({ attribute: false })
    column: UaxTableColumn = { key: "value", label: "", type: "percent" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The fraction to show: 0.25 is "25%". */
    @property({ attribute: false })
    value: unknown;

    #format?: { column: UaxTableColumn; lang: string; format: Intl.NumberFormat };

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const lang = this.localize.lang();
        if (this.#format?.column !== this.column || this.#format.lang !== lang) {
            this.#format = { column: this.column, lang, format: getNumberFormat(lang, { ...percentFormatOptions, ...this.column.valueFormat }) };
        }
    }

    override render() {
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
        "uax-percent-cell": UaxPercentCellElement;
    }
}
