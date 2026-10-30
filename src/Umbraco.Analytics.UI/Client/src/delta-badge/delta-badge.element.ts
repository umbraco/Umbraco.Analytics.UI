import { css, customElement, html, nothing, property, LitElement } from "@umbraco-cms/backoffice/external/lit";

export type UanDeltaUnit = "percent" | "points";

/**
 * Shows the change in a value against a comparison period, e.g. "▲ 12.4%".
 *
 * Green means good. For metrics where a drop is good (refund rate, bounce rate), set `lower-is-better`.
 *
 * @element uan-delta-badge
 * @cssprop --uan-delta-badge-font-size - Font size. Defaults to the UUI small type size.
 */
@customElement("uan-delta-badge")
export class UanDeltaBadgeElement extends LitElement {
    /** The change. 12.4 means +12.4% (or +12.4 percentage points when `unit` is "points"). */
    @property({ type: Number })
    value?: number;

    /** Whether `value` is a percent change or a change in percentage points. */
    @property({ type: String })
    unit: UanDeltaUnit = "percent";

    /** Shows a fall as good (green) and a rise as bad (red). */
    @property({ type: Boolean, attribute: "lower-is-better", reflect: true })
    lowerIsBetter = false;

    /** Maximum number of decimals shown. */
    @property({ type: Number, attribute: "max-decimals" })
    maxDecimals = 1;

    /** The direction of the change. "flat" when the value rounds to zero. */
    get direction(): "up" | "down" | "flat" {
        const rounded = this.#round(this.value ?? 0);
        return rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
    }

    /** Whether the change is good, bad or neutral, after applying `lowerIsBetter`. */
    get sentiment(): "positive" | "negative" | "neutral" {
        const direction = this.direction;
        if (direction === "flat") return "neutral";
        return (direction === "up") !== this.lowerIsBetter ? "positive" : "negative";
    }

    #round(value: number) {
        const factor = 10 ** this.maxDecimals;
        return Math.round(value * factor) / factor;
    }

    #format(value: number) {
        const number = new Intl.NumberFormat(document.documentElement.lang || undefined, {
            maximumFractionDigits: this.maxDecimals,
            signDisplay: "exceptZero",
        }).format(this.#round(value));
        return this.unit === "points" ? `${number} pp` : `${number}%`;
    }

    override render() {
        if (this.value === undefined || this.value === null || Number.isNaN(this.value)) return nothing;

        const arrow = { up: "▲", down: "▼", flat: "–" }[this.direction];

        // The signed number carries the direction for screen readers; the arrow is decoration.
        return html`<span class="badge" data-sentiment=${this.sentiment}
            ><span class="arrow" aria-hidden="true">${arrow}</span>${this.#format(this.value)}</span
        >`;
    }

    static override styles = css`
        :host {
            display: inline-flex;
        }

        .badge {
            display: inline-flex;
            align-items: center;
            gap: var(--uui-size-space-1);
            font-size: var(--uan-delta-badge-font-size, var(--uui-type-small-size, 12px));
            font-weight: 700;
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }

        .arrow {
            font-size: 0.8em;
        }

        [data-sentiment="positive"] {
            color: var(--uui-color-positive-standalone);
        }

        [data-sentiment="negative"] {
            color: var(--uui-color-danger-standalone);
        }

        [data-sentiment="neutral"] {
            color: var(--uui-color-text-alt);
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uan-delta-badge": UanDeltaBadgeElement;
    }
}
