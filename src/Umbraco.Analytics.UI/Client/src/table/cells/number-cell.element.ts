import { css, customElement, html, nothing, property, type CSSResultGroup, type PropertyValues, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { asNumber } from "../internal/cell-values.js";
import { getNumberFormat } from "../../internal/format/number-format.js";
import "../table-compare-badge.element.js";
import "../internal/table-skeleton-cell.element.js";
import type { UauiTableCellElement, UauiTableColumn } from "../types.js";

/**
 * A table cell that shows its value as a number in the editor's culture, formatted with the column's `valueFormat`.
 * With a compare row it adds a change badge (`uaui-table-compare-badge`). A missing or non-numeric value shows nothing. Its name is `UAUI_TABLE_CELL.number`, and it is usable on its own.
 *
 * @element uaui-number-cell
 */
@customElement("uaui-number-cell")
export class UauiNumberCellElement extends UmbLitElement implements UauiTableCellElement {
    /** The column the cell is in. Its `valueFormat` formats the number. */
    @property({ attribute: false })
    column: UauiTableColumn = { key: "value", label: "" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The number to show. */
    @property({ attribute: false })
    value: unknown;

    #format?: { column: UauiTableColumn; lang: string; format: Intl.NumberFormat };

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
        if (this.loading) return html`<uaui-table-skeleton-cell .align=${this.column.align ?? "start"}></uaui-table-skeleton-cell>`;
        const value = asNumber(this.value);
        if (value === undefined) return nothing;
        return html`<span class="value">${this.#format!.format.format(value)}<uaui-table-compare-badge .column=${this.column} .item=${this.item} .value=${this.value}></uaui-table-compare-badge></span>`;
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
            height: var(--_uaui-table-line, 20px);
        }

        uaui-table-compare-badge {
            line-height: 1.4;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-number-cell": UauiNumberCellElement;
    }
}
