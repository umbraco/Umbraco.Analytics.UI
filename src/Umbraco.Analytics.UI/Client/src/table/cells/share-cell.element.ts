import { css, customElement, html, nothing, property, type CSSResultGroup, type PropertyValues } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../../delta-badge/delta-badge.element.js";
import { uaxThemeTokens } from "../../internal/theme/tokens.css.js";
import "../internal/share-bar.element.js";
import { asNumber, getNumberFormat } from "../internal/number-format.js";
import type { UaxTableCellElement, UaxTableColumn } from "../types.js";

const shareFormatOptions: Intl.NumberFormatOptions = { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 };

/**
 * A table cell that shows its value, its percent of the column `total` and a thin bar scaled to the column's
 * largest value (`max`). With a `compareValue` it adds a change badge after the value.
 * The built-in cell of a `share` column, and usable on its own.
 *
 * Unlike the other cells it needs numbers the table works out from every row, so the table sets `total`, `max`,
 * `color` and `compareValue` as well as `column`, `item` and `value`.
 *
 * @element uax-share-cell
 * @cssprop --uax-series-1 - Bar colour of palette slot 1. Also `--uax-series-2` to `--uax-series-4`.
 * @cssprop --uax-tint-neutral - Colour of the track behind the bar.
 */
@customElement("uax-share-cell")
export class UaxShareCellElement extends UmbLitElement implements UaxTableCellElement {
    /** The column the cell is in. Its `valueFormat` formats the value and `align` aligns it. */
    @property({ attribute: false })
    column: UaxTableColumn = { key: "value", label: "", type: "share" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The number to show. A missing or non-numeric value shows nothing. */
    @property({ attribute: false })
    value: unknown;

    /** The number the percent is of, usually the column's total. With 0 the percent is 0.0%. */
    @property({ type: Number })
    total = 0;

    /** What a full bar stands for, usually the column's largest value. With 0 the bar is empty. */
    @property({ type: Number })
    max = 0;

    /** The palette slot of the bar, as `UaxSeries.color`. */
    @property({ type: Number })
    color: 1 | 2 | 3 | 4 = 1;

    /** The same row's value in the comparison period. Shows a change badge, unless it is missing or 0. */
    @property({ type: Number, attribute: "compare-value" })
    compareValue?: number;

    #formats?: { column: UaxTableColumn; lang: string; value: Intl.NumberFormat; percent: Intl.NumberFormat };

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const lang = this.localize.lang();
        if (this.#formats?.column !== this.column || this.#formats.lang !== lang) {
            this.#formats = {
                column: this.column,
                lang,
                value: getNumberFormat(lang, this.column.valueFormat),
                percent: getNumberFormat(lang, shareFormatOptions),
            };
        }
    }

    override render() {
        const value = asNumber(this.value);
        if (value === undefined) return nothing;
        const { value: valueFormat, percent: percentFormat } = this.#formats!;
        const share = this.total ? value / this.total : 0;
        const compare = asNumber(this.compareValue);
        const change = compare === undefined || compare === 0 ? undefined : ((value - compare) / Math.abs(compare)) * 100;
        const width = this.max > 0 ? Math.round(Math.min(Math.max(value / this.max, 0), 1) * 10000) / 100 : 0;
        return html`<div class="share ${this.column.align === "end" ? "end" : ""}">
            <div class="share-top">
                <span class="share-value">${valueFormat.format(value)}</span> <span class="share-percent">(${percentFormat.format(share)})</span>
                ${change === undefined ? nothing : html`<uax-delta-badge size="sm" .value=${change}></uax-delta-badge>`}
            </div>
            <uax-share-bar .percent=${width} .color=${this.color}></uax-share-bar>
        </div>`;
    }

    static override styles: CSSResultGroup = [
        uaxThemeTokens,
        css`
            :host {
                display: block;
                font-variant-numeric: tabular-nums;
            }

            .share {
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-width: 92px;
            }

            .share-top {
                display: flex;
                align-items: baseline;
                gap: 6px;
                height: var(--_uax-table-line, 20px);
            }

            .end .share-top {
                justify-content: flex-end;
            }

            .share-value {
                font-weight: 700;
            }

            .share-percent {
                font-size: 12px;
                color: var(--uui-color-text-alt);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-share-cell": UaxShareCellElement;
    }
}
