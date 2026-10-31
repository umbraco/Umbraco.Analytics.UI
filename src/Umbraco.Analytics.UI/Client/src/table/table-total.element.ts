import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { deltaChange } from "../internal/delta/delta-change.js";
import type { UauiDeltaUnit } from "../delta-badge/delta-badge.element.js";
import "../delta-badge/delta-badge.element.js";

/**
 * One total, for the column toolbar of a `uaui-data-table`: a small uppercase label, the value in bold and an optional
 * change badge. Slot it into `toolbar-<column key>` and it sits over its column, aligned like the column's cells.
 *
 * The label is on its own line, with the value and the badge on the next. The total takes the `text-align` of its
 * cell, so it ends on the right in a column that is `align: "end"`.
 *
 * The value is a string, shown exactly as given: the product formats it. For the badge, set `delta` (18.7 means
 * +18.7%), or give the two numbers, `current` and `previous`, and the badge works out the change, as `uaui-kpi-tile`
 * does. `delta` wins when both are set. With neither, or with nothing to compare with, there is no badge.
 *
 * @element uaui-table-total
 */
@customElement("uaui-table-total")
export class UauiTableTotalElement extends UmbLitElement {
    /** What the total is, e.g. "Total pageviews". */
    @property({ type: String })
    label = "";

    /** The total, already formatted by the product (e.g. "272"). It is shown exactly as given. */
    @property({ type: String })
    value?: string;

    /**
     * The change against the comparison period. 18.7 means +18.7%. 0 is "no change" (a neutral badge).
     * Unset, or not a finite number, means "unknown" (no comparison data) and shows no badge.
     */
    @property({ type: Number })
    delta?: number;

    /**
     * The total in the current period, as a number. With `previous`, the badge works out the change. Ignored when
     * `delta` is set. The shown value is still `value`.
     */
    @property({ type: Number })
    current?: number;

    /** The same total in the comparison period. With `current`, the badge works out the change. Ignored when `delta` is set. */
    @property({ type: Number })
    previous?: number;

    /** Whether the change is a percent change or a change in percentage points. */
    @property({ type: String, attribute: "delta-unit" })
    deltaUnit: UauiDeltaUnit = "percent";

    /** Shows a fall as good (green) and a rise as bad (red), e.g. for a bounce rate. */
    @property({ type: Boolean, attribute: "lower-is-better", reflect: true })
    lowerIsBetter = false;

    // Whether there is a change to show: the same rule the badge uses, so no empty badge takes up room.
    #hasChange(): boolean {
        return Number.isFinite(deltaChange(this.delta, this.current, this.previous, this.deltaUnit));
    }

    override render(): TemplateResult {
        const hasValue = this.value !== undefined && this.value !== null && this.value !== "";
        return html`<span class="label">${this.label}</span>
            <span class="row"
                >${hasValue ? html`<span class="value">${this.value}</span>` : nothing}${this.#hasChange()
                    ? html`<uaui-delta-badge
                          size="sm"
                          .value=${this.delta}
                          .current=${this.current}
                          .previous=${this.previous}
                          .unit=${this.deltaUnit}
                          .lowerIsBetter=${this.lowerIsBetter}></uaui-delta-badge>`
                    : nothing}</span
            >`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            /* The text-align of the cell is inherited, so a total over an end-aligned column ends on the right. */
            display: block;
        }

        .label {
            display: block;
            /* 11px to match the column headings above it; UUI has no type token this size. */
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.6px;
            line-height: 1.3;
            text-transform: uppercase;
            color: var(--uui-color-text-alt);
        }

        .row {
            display: block;
            margin-top: var(--uui-size-1);
        }

        .value {
            /* UUI's nearest type tokens are 14px and 21px, so the 18px figure is kept as is. */
            font-size: 18px;
            font-weight: 700;
            line-height: 1.2;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
            color: var(--uui-color-text);
        }

        uaui-delta-badge {
            vertical-align: middle;
            margin-inline-start: var(--uui-size-2);
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-table-total": UauiTableTotalElement;
    }
}
