import { customElement, html, nothing, property, state, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../delta-badge/delta-badge.element.js";
import type { UaxDeltaBadgeSize } from "../delta-badge/delta-badge.element.js";
import { asNumber } from "./internal/cell-values.js";
import { UAX_TABLE_CONTEXT } from "./table-context.js";
import type { UaxTableColumn, UaxTableCompareLookup } from "./types.js";

/**
 * The change badge of a table cell: how the cell's value moved against the same row in the compare period.
 * Built-in cells and your own use it the same way, passing the three properties the table gave them:
 * `<uax-table-compare-badge .column=${this.column} .item=${this.item} .value=${this.value}>`.
 *
 * Inside a `uax-data-table` it finds the compare row through the table's `UAX_TABLE_CONTEXT`. Whether a fall is good
 * comes from the column's `meta.lowerIsBetter`. It shows nothing without a compare value, or when that is 0.
 *
 * @element uax-table-compare-badge
 */
@customElement("uax-table-compare-badge")
export class UaxTableCompareBadgeElement extends UmbLitElement {
    /** The column the cell is in. Its `key` picks the compare value and `meta.lowerIsBetter` the sentiment. */
    @property({ attribute: false })
    column: UaxTableColumn = { key: "value", label: "" };

    /** The row the cell is in, used to find its compare row. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The cell's value in the current period. A missing or non-numeric value shows nothing. */
    @property({ attribute: false })
    value: unknown;

    /** The same value in the comparison period. Defaults to the table's compare row for `item`. */
    @property({ type: Number, attribute: "compare-value" })
    compareValue?: number;

    /** Badge size. Defaults to `"sm"`, for table cells. */
    @property({ type: String })
    size: UaxDeltaBadgeSize = "sm";

    @state() private _compare?: UaxTableCompareLookup;

    constructor() {
        super();
        this.consumeContext(UAX_TABLE_CONTEXT, (context) => {
            this.observe(context?.compare, (lookup) => (this._compare = lookup), "_compare");
        });
    }

    override render(): TemplateResult | typeof nothing {
        const value = asNumber(this.value);
        const compare = asNumber(this.compareValue ?? this._compare?.(this.item)?.[this.column.key]);
        if (value === undefined || compare === undefined || compare === 0) return nothing;
        const change = ((value - compare) / Math.abs(compare)) * 100;
        return html`<uax-delta-badge .size=${this.size} .value=${change} ?lower-is-better=${this.column.meta?.lowerIsBetter === true}></uax-delta-badge>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-table-compare-badge": UaxTableCompareBadgeElement;
    }
}
