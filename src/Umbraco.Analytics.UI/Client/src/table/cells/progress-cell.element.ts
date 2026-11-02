import { css, customElement, html, nothing, property, type CSSResultGroup, type PropertyValues, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiPaletteStyles } from "../../theme/index.js";
import "../../internal/meter-bar/meter-bar.element.js";
import { asNumber } from "../internal/cell-values.js";
import { getNumberFormat } from "../../internal/format/number-format.js";
import "../../internal/loading/skeleton.element.js";
import type { UauiTableCellElement, UauiTableColumn } from "../types.js";

/**
 * A table cell that shows how far a row has got as "2 of 3" with a thin bar, e.g. the steps of a workflow. The cell's
 * value is the completed count, and the column's `meta.totalKey` names the row field that holds the total (or set
 * `total`). Numbers are formatted with the column's `valueFormat`. The text carries the meaning and the bar only
 * repeats it, so the bar is hidden from assistive tech (no `progressbar` role, which would read the same twice).
 *
 * Without a total (missing, or not a number) the cell shows the completed count alone with no bar. A total of 0 shows
 * "0 of 0" and an empty bar. A missing or non-numeric value draws nothing. Sorting and search use the value (the
 * completed count), as for every cell: set `sortAs: "number"`. Its name is `UAUI_TABLE_CELL.progress`, and it is
 * usable on its own.
 *
 * @element uaui-progress-cell
 * @cssprop --uaui-series-1 - Bar colour of palette slot 1. Also `--uaui-series-2` to `--uaui-series-4` (`meta.color`).
 * @cssprop --uaui-tint-neutral - Colour of the track behind the bar.
 */
@customElement("uaui-progress-cell")
export class UauiProgressCellElement extends UmbLitElement implements UauiTableCellElement {
    /** The column the cell is in. Its `meta.totalKey` names the key in `item` that holds the total, `meta.color` the bar's palette slot, and `valueFormat` formats both numbers. */
    @property({ attribute: false })
    column: UauiTableColumn = { key: "value", label: "" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The completed count. A missing or non-numeric value shows nothing. */
    @property({ attribute: false })
    value: unknown;

    /** The total the value is out of. Defaults to the row's `meta.totalKey` field. */
    @property({ type: Number })
    total?: number;

    /** Draws a placeholder, a text line and a bar as tall as a loaded cell, instead of the value while the table loads. */
    @property({ type: Boolean })
    loading = false;

    #format?: { column: UauiTableColumn; lang: string; format: Intl.NumberFormat };

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const lang = this.localize.lang();
        if (this.#format?.column !== this.column || this.#format.lang !== lang) {
            this.#format = { column: this.column, lang, format: getNumberFormat(lang, this.column.valueFormat) };
        }
    }

    #total(): number | undefined {
        if (asNumber(this.total) !== undefined) return this.total;
        const totalKey = this.column.meta?.totalKey;
        return totalKey ? asNumber(this.item[totalKey]) : undefined;
    }

    override render(): TemplateResult | typeof nothing {
        const end = this.column.align === "end" ? "end" : "";
        if (this.loading) {
            return html`<div class="progress ${end}">
                <div class="progress-top"><uaui-skeleton style="width: var(--_uaui-skeleton-width, 40%); height: var(--_uaui-skeleton-height, 14px)"></uaui-skeleton></div>
                <uaui-skeleton style="width: 100%; height: 4px; min-height: 4px"></uaui-skeleton>
            </div>`;
        }
        const done = asNumber(this.value);
        if (done === undefined) return nothing;
        const format = this.#format!.format;
        const total = this.#total();
        if (total === undefined) {
            return html`<div class="progress ${end}"><div class="progress-top">${format.format(done)}</div></div>`;
        }
        const percent = total > 0 ? Math.round(Math.min(Math.max(done / total, 0), 1) * 10000) / 100 : 0;
        return html`<div class="progress ${end}">
            <div class="progress-top">${this.localize.term("uauiAnalytics_tableProgress", format.format(done), format.format(total))}</div>
            <uaui-meter-bar .percent=${percent} .color=${this.column.meta?.color ?? 1}></uaui-meter-bar>
        </div>`;
    }

    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
        css`
            :host {
                display: block;
                font-variant-numeric: tabular-nums;
            }

            .progress {
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-width: 92px;
            }

            /* One line, as the share cell's: the table's overflow-wrap: anywhere would break a number mid-digit. */
            .progress-top {
                display: flex;
                align-items: baseline;
                height: var(--_uaui-table-line, 20px);
                white-space: nowrap;
                overflow-wrap: normal;
            }

            .end .progress-top {
                justify-content: flex-end;
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-progress-cell": UauiProgressCellElement;
    }
}
