import { customElement, html, nothing, property, state, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../delta-badge/delta-badge.element.js";
import type { UauiDeltaBadgeSize, UauiDeltaUnit } from "../delta-badge/delta-badge.element.js";
import { asNumber } from "./internal/cell-values.js";
import { UAUI_TABLE_CONTEXT } from "./table-context.js";
import type { UauiTableColumn, UauiTableCompareLookup } from "./types.js";

/**
 * The change badge of a table cell: how the cell's value moved against the same row in the compare period.
 * Built-in cells and your own use it the same way, passing the three properties the table gave them:
 * `<uaui-table-compare-badge .column=${this.column} .item=${this.item} .value=${this.value}>`.
 *
 * Inside a `uaui-data-table` it finds the compare row through the table's `UAUI_TABLE_CONTEXT`. Whether a fall is good
 * comes from the column's `meta.lowerIsBetter`. The change itself is worked out by `uaui-delta-badge`. It shows nothing
 * without a compare value or, for a percent change, when that is 0.
 *
 * The column's `meta.deltaUnit: "points"` shows the change in percentage points instead of a percent change, for rate
 * columns. With points, a column whose `valueFormat.style` is `"percent"` holds fractions, so 0.05 to 0.06 is +1 pp;
 * the percent cell passes its own default format.
 *
 * @element uaui-table-compare-badge
 */
@customElement("uaui-table-compare-badge")
export class UauiTableCompareBadgeElement extends UmbLitElement {
    /** The column the cell is in. Its `key` picks the compare value, `meta.lowerIsBetter` the sentiment and `meta.deltaUnit` the unit. */
    @property({ attribute: false })
    column: UauiTableColumn = { key: "value", label: "" };

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
    size: UauiDeltaBadgeSize = "sm";

    @state() private _compare?: UauiTableCompareLookup;

    constructor() {
        super();
        this.consumeContext(UAUI_TABLE_CONTEXT, (context) => {
            this.observe(context?.compare, (lookup) => (this._compare = lookup), "_compare");
        });
    }

    override render(): TemplateResult | typeof nothing {
        const value = asNumber(this.value);
        const compare = asNumber(this.compareValue ?? this._compare?.(this.item)?.[this.column.key]);
        if (value === undefined || compare === undefined) return nothing;
        // Anything but "points" is the default, a percent change, so a typo never shows a wrong unit.
        const unit: UauiDeltaUnit = this.column.meta?.deltaUnit === "points" ? "points" : "percent";
        // Points are the difference of two percentages: fractions shown as percent (0.05 is 5%) are scaled to them first.
        // A percent change is a ratio, so it needs no scaling.
        const scale = unit === "points" && this.column.valueFormat?.style === "percent" ? 100 : 1;
        return html`<uaui-delta-badge
            .size=${this.size}
            .current=${value * scale}
            .previous=${compare * scale}
            .unit=${unit}
            ?lower-is-better=${this.column.meta?.lowerIsBetter === true}></uaui-delta-badge>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-table-compare-badge": UauiTableCompareBadgeElement;
    }
}
