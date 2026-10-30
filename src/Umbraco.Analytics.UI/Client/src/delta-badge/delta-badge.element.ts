import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UaxPaletteStyles } from "../theme/index.js";

/** What a delta is measured in: a percent change, or a change in percentage points. */
export type UaxDeltaUnit = "percent" | "points";

/** The size of a delta badge. `sm` is for table cells. */
export type UaxDeltaBadgeSize = "md" | "sm";

/**
 * Shows the change in a value against a comparison period, e.g. "▲ 12.4%".
 *
 * Green means good. For metrics where a drop is good (refund rate, bounce rate), set `lower-is-better`.
 *
 * @element uax-delta-badge
 * @cssprop --uax-delta-badge-font-size - Font size. Defaults to 13px ("md") or 11.5px ("sm").
 * @cssprop --uax-tint-positive - Background of a good change. Defaults to a tint of `--uui-color-positive`.
 * @cssprop --uax-tint-negative - Background of a bad change. Defaults to a tint of `--uui-color-danger`.
 * @cssprop --uax-tint-neutral - Background of a change that rounds to zero.
 * @cssprop --uax-text-positive - Text colour of a good change. Defaults to forest green (dark theme: jungle green), which passes 4.5:1 on the tint.
 * @cssprop --uax-text-negative - Text colour of a bad change. Defaults to dark maroon (dark theme: spanish pink), which passes 4.5:1 on the tint.
 * @cssprop --uax-text-neutral - Text colour of a change that rounds to zero. Defaults to `--uui-color-text-alt`.
 */
@customElement("uax-delta-badge")
export class UaxDeltaBadgeElement extends UmbLitElement {
    /** The change. 12.4 means +12.4% (or +12.4 percentage points when `unit` is "points"). */
    @property({ type: Number })
    value?: number;

    /** Whether `value` is a percent change or a change in percentage points. */
    @property({ type: String })
    unit: UaxDeltaUnit = "percent";

    /** Shows a fall as good (green) and a rise as bad (red). */
    @property({ type: Boolean, attribute: "lower-is-better", reflect: true })
    lowerIsBetter = false;

    /** Maximum number of decimals shown. */
    @property({ type: Number, attribute: "max-decimals" })
    maxDecimals = 1;

    /** Pill size. "sm" is for table cells. */
    @property({ type: String, reflect: true })
    size: UaxDeltaBadgeSize = "md";

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
        const rounded = this.#round(value);
        const options = { maximumFractionDigits: this.maxDecimals, signDisplay: "exceptZero" } as const;
        // Percent style lets the culture place the sign and spacing ("+12.4%" in en, "+12,4 %" in da-DK).
        return this.unit === "points"
            ? this.localize.term("uaxAnalytics_deltaPercentagePoints", this.localize.number(rounded, options))
            : this.localize.number(rounded / 100, { ...options, style: "percent" });
    }

    #sentimentLabel() {
        const key = { positive: "deltaImprovement", negative: "deltaDecline", neutral: "deltaNoChange" }[this.sentiment];
        return this.localize.term(`uaxAnalytics_${key}`);
    }

    override render(): TemplateResult | typeof nothing {
        if (this.value === undefined || this.value === null || Number.isNaN(this.value)) return nothing;

        const arrow = { up: "▲", down: "▼", flat: "–" }[this.direction];

        // The signed number carries the direction for screen readers and the hidden text says whether it is
        // good, so neither the arrow nor the colour has to; the arrow is decoration.
        return html`<span class="badge" data-sentiment=${this.sentiment}
            ><span class="arrow" aria-hidden="true">${arrow}</span>${this.#format(this.value)}<span class="visually-hidden">${", "}${this.#sentimentLabel()}</span></span
        >`;
    }

    static override styles: CSSResultGroup = [
        UaxPaletteStyles,
        css`
            :host {
                display: inline-flex;
            }

            .badge {
                position: relative;
                display: inline-flex;
                align-items: center;
                gap: var(--uui-size-space-1);
                padding: 4px 8px;
                border-radius: var(--uui-border-radius-1);
                font-size: var(--uax-delta-badge-font-size, 13px);
                font-weight: 700;
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
            }

            :host([size="sm"]) .badge {
                padding: 1px 5px;
                font-size: var(--uax-delta-badge-font-size, 11.5px);
            }

            .arrow {
                font-size: 0.8em;
            }

            [data-sentiment="positive"] {
                color: var(--uax-color-text-positive);
                background: var(--uax-color-tint-positive);
            }

            [data-sentiment="negative"] {
                color: var(--uax-color-text-negative);
                background: var(--uax-color-tint-negative);
            }

            [data-sentiment="neutral"] {
                color: var(--uax-color-text-neutral);
                background: var(--uax-color-tint-neutral);
            }

            .visually-hidden {
                position: absolute;
                width: 1px;
                height: 1px;
                overflow: hidden;
                clip-path: inset(50%);
                white-space: nowrap;
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-delta-badge": UaxDeltaBadgeElement;
    }
}
