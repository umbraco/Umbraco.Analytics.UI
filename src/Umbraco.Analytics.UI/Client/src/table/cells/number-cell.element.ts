import { css, customElement, html, nothing, property, type CSSResultGroup, type PropertyValues, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { asNumber } from "../internal/cell-values.js";
import { getNumberFormat } from "../../internal/format/number-format.js";
import "../table-compare-badge.element.js";
import "../internal/table-skeleton-cell.element.js";
import type { UaxTableCellElement, UaxTableColumn } from "../types.js";

/**
 * A table cell that shows its value as a number in the editor's culture, formatted with the column's `valueFormat`.
 * With a compare row it adds a change badge (`uax-table-compare-badge`). A missing or non-numeric value shows nothing. Its name is `UAX_TABLE_CELL.number`, and it is usable on its own.
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

    override render(): TemplateResult | typeof nothing {
        if (this.loading) return html`<uax-table-skeleton-cell .align=${this.column.align ?? "start"}></uax-table-skeleton-cell>`;
        const value = asNumber(this.value);
        if (value === undefined) return nothing;
        return html`<span class="value">${this.#format!.format.format(value)}<uax-table-compare-badge .column=${this.column} .item=${this.item} .value=${this.value}></uax-table-compare-badge></span>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            font-variant-numeric: tabular-nums;
        }

        .value {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
            height: var(--_uax-table-line, 20px);
        }

        uax-table-compare-badge {
            line-height: 1.4;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-number-cell": UaxNumberCellElement;
    }
}
