import { css, customElement, html, nothing, property, state, type CSSResultGroup, type PropertyValues, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../table-compare-badge.element.js";
import { UauiPaletteStyles, type UauiColorSlot } from "../../theme/index.js";
import "../internal/share-bar.element.js";
import { asNumber } from "../internal/cell-values.js";
import { getNumberFormat } from "../../internal/format/number-format.js";
import { UAUI_TABLE_CONTEXT } from "../table-context.js";
import "../../internal/loading/skeleton.element.js";
import type { UauiTableCellElement, UauiTableColumn, UauiTableStats } from "../types.js";

const shareFormatOptions: Intl.NumberFormatOptions = { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 };

/**
 * A table cell that shows its value, its percent of the column `total` and a thin bar scaled to the column's
 * largest value (`max`). With a compare row it adds a change badge (`uaui-table-compare-badge`) after the value.
 * Its name is `UAUI_TABLE_CELL.share`, and it is usable on its own.
 *
 * Inside a `uaui-data-table` it reads the column's total and largest value, the bar colour and the compare row from
 * the table's `UAUI_TABLE_CONTEXT`. On its own, or to override the table, set `total`, `max`, `color` and `compareValue`.
 *
 * @element uaui-share-cell
 * @cssprop --uaui-series-1 - Bar colour of palette slot 1. Also `--uaui-series-2` to `--uaui-series-4`.
 * @cssprop --uaui-tint-neutral - Colour of the track behind the bar.
 */
@customElement("uaui-share-cell")
export class UauiShareCellElement extends UmbLitElement implements UauiTableCellElement {
    /** The column the cell is in. Its `valueFormat` formats the value and `align` aligns it. */
    @property({ attribute: false })
    column: UauiTableColumn = { key: "value", label: "" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The number to show. A missing or non-numeric value shows nothing. */
    @property({ attribute: false })
    value: unknown;

    /** The number the percent is of. Defaults to the column's total from the table's context, or 0, which shows 0.0%. */
    @property({ type: Number })
    total?: number;

    /** What a full bar stands for. Defaults to the column's largest value from the table's context, or 0, which shows an empty bar. */
    @property({ type: Number })
    max?: number;

    /** The palette slot of the bar, as `UauiSeries.color`. Defaults to `column.meta.color`, then the cell's position among the table's share columns, then 1. */
    @property({ type: Number })
    color?: UauiColorSlot;

    /** The same row's value in the comparison period. Shows a change badge, unless it is missing or, for a percent change, 0. Defaults to the table's compare row (see `uaui-table-compare-badge`). */
    @property({ type: Number, attribute: "compare-value" })
    compareValue?: number;

    /** Draws a placeholder, a value line and a bar as tall as a loaded cell, instead of the value while the table loads. */
    @property({ type: Boolean })
    loading = false;

    @state() private _stats?: UauiTableStats;
    @state() private _columns: UauiTableColumn[] = [];

    constructor() {
        super();
        this.consumeContext(UAUI_TABLE_CONTEXT, (context) => {
            this.observe(context?.stats, (stats) => (this._stats = stats), "_stats");
            this.observe(context?.columns, (columns) => (this._columns = columns ?? []), "_columns");
        });
    }

    /** The bar colour: set, else the column's, else the next free slot by position among the table's share columns. */
    get #color(): UauiColorSlot {
        if (this.color) return this.color;
        if (this.column.meta?.color) return this.column.meta.color;
        const position = this._columns.findIndex((c) => c.key === this.column.key);
        const before = position < 0 ? 0 : this._columns.slice(0, position).filter(isShareColumn).length;
        return ((before % 4) + 1) as UauiColorSlot;
    }

    #formats?: { column: UauiTableColumn; lang: string; value: Intl.NumberFormat; percent: Intl.NumberFormat };

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

    override render(): TemplateResult | typeof nothing {
        if (this.loading) {
            return html`<div class="share ${this.column.align === "end" ? "end" : ""}">
                <div class="share-top"><uaui-skeleton style="width: var(--_uaui-skeleton-width, 40%); height: var(--_uaui-skeleton-height, 14px)"></uaui-skeleton></div>
                <uaui-skeleton style="width: 100%; height: 4px; min-height: 4px"></uaui-skeleton>
            </div>`;
        }
        const value = asNumber(this.value);
        if (value === undefined) return nothing;
        const { value: valueFormat, percent: percentFormat } = this.#formats!;
        const stats = this._stats?.[this.column.key];
        const total = this.total ?? stats?.total ?? 0;
        const max = this.max ?? stats?.max ?? 0;
        const share = total ? value / total : 0;
        const width = max > 0 ? Math.round(Math.min(Math.max(value / max, 0), 1) * 10000) / 100 : 0;
        return html`<div class="share ${this.column.align === "end" ? "end" : ""}">
            <div class="share-top">
                <span class="share-value">${valueFormat.format(value)}</span> <span class="share-percent">(${percentFormat.format(share)})</span>
                <uaui-table-compare-badge .column=${this.column} .item=${this.item} .value=${this.value} .compareValue=${this.compareValue}></uaui-table-compare-badge>
            </div>
            <uaui-share-bar .percent=${width} .color=${this.#color}></uaui-share-bar>
        </div>`;
    }

    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
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

            /* One line, like the number and percent cells: the table's overflow-wrap: anywhere (for long URLs) would
               otherwise break the number mid-digit. The column grows to fit instead. */
            .share-top {
                display: flex;
                align-items: baseline;
                gap: 6px;
                height: var(--_uaui-table-line, 20px);
                white-space: nowrap;
                overflow-wrap: normal;
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
        "uaui-share-cell": UauiShareCellElement;
    }
}

/** Whether the column's cell element is the share cell, or extends it. */
function isShareColumn(column: UauiTableColumn): boolean {
    const element = column.elementName ? customElements.get(column.elementName) : undefined;
    return element === UauiShareCellElement || element?.prototype instanceof UauiShareCellElement;
}
