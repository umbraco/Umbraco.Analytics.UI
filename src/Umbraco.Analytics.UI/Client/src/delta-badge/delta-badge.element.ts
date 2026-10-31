import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiVisuallyHiddenStyles } from "../internal/a11y/visually-hidden.css.js";
import { UauiPaletteStyles } from "../theme/index.js";

/** What a delta is measured in: a percent change, or a change in percentage points. */
export type UauiDeltaUnit = "percent" | "points";

/** The size of a delta badge. `sm` is for table cells. */
export type UauiDeltaBadgeSize = "md" | "sm";

/**
 * Shows the change in a value against a comparison period, e.g. "▲ 12.4%".
 *
 * Give the change as `value`, or give the two numbers as `current` and `previous` and the badge works it out: the
 * percent change (unknown when `previous` is 0), or with `unit="points"` the difference between two percentages.
 * `value` wins when both are set.
 *
 * A change of 0 is "no change": a neutral badge ("0%" or "0 pp", read as "no change"). With no change (or one that
 * is not a finite number) the change is unknown and nothing is drawn.
 *
 * Green means good. For metrics where a drop is good (refund rate, bounce rate), set `lower-is-better`.
 *
 * @element uaui-delta-badge
 * @cssprop --uaui-delta-badge-font-size - Font size. Defaults to 13px ("md") or 11.5px ("sm").
 * @cssprop --uaui-tint-positive - Background of a good change. Defaults to a tint of `--uui-color-positive`.
 * @cssprop --uaui-tint-negative - Background of a bad change. Defaults to a tint of `--uui-color-danger`.
 * @cssprop --uaui-tint-neutral - Background of a change that rounds to zero.
 * @cssprop --uaui-text-positive - Text colour of a good change. Defaults to forest green (dark theme: jungle green), which passes 4.5:1 on the tint.
 * @cssprop --uaui-text-negative - Text colour of a bad change. Defaults to dark maroon (dark theme: spanish pink), which passes 4.5:1 on the tint.
 * @cssprop --uaui-text-neutral - Text colour of a change that rounds to zero. Defaults to `--uui-color-text-alt`.
 */
@customElement("uaui-delta-badge")
export class UauiDeltaBadgeElement extends UmbLitElement {
    /**
     * The change. 12.4 means +12.4% (or +12.4 percentage points when `unit` is "points"). 0 is "no change".
     * Unset means unknown: nothing is drawn.
     */
    @property({ type: Number })
    value?: number;

    /** The value in the current period. With `previous`, the badge works out the change. Ignored when `value` is set. */
    @property({ type: Number })
    current?: number;

    /** The same value in the comparison period. With `current`, the badge works out the change. Ignored when `value` is set. */
    @property({ type: Number })
    previous?: number;

    /** Whether the change is a percent change or a change in percentage points. */
    @property({ type: String })
    unit: UauiDeltaUnit = "percent";

    /** Shows a fall as good (green) and a rise as bad (red). */
    @property({ type: Boolean, attribute: "lower-is-better", reflect: true })
    lowerIsBetter = false;

    /** Maximum number of decimals shown. */
    @property({ type: Number, attribute: "max-decimals" })
    maxDecimals = 1;

    /** Pill size. "sm" is for table cells. */
    @property({ type: String, reflect: true })
    size: UauiDeltaBadgeSize = "md";

    /** The direction of the change. "flat" when the value rounds to zero. */
    get direction(): "up" | "down" | "flat" {
        const rounded = this.#round(this.#change() ?? 0);
        return rounded > 0 ? "up" : rounded < 0 ? "down" : "flat";
    }

    /** Whether the change is good, bad or neutral, after applying `lowerIsBetter`. */
    get sentiment(): "positive" | "negative" | "neutral" {
        const direction = this.direction;
        if (direction === "flat") return "neutral";
        return (direction === "up") !== this.lowerIsBetter ? "positive" : "negative";
    }

    // The change to draw: `value`, else worked out from `current` and `previous`. Undefined when unknown.
    #change(): number | undefined {
        if (this.value !== undefined) return this.value;
        const { current, previous } = this;
        if (current === undefined || previous === undefined) return undefined;
        if (this.unit === "points") return current - previous;
        return previous === 0 ? undefined : ((current - previous) / Math.abs(previous)) * 100;
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
            ? this.localize.term("uauiAnalytics_deltaPercentagePoints", this.localize.number(rounded, options))
            : this.localize.number(rounded / 100, { ...options, style: "percent" });
    }

    #sentimentLabel() {
        const key = {
            positive: "uauiAnalytics_deltaImprovement",
            negative: "uauiAnalytics_deltaDecline",
            neutral: "uauiAnalytics_deltaNoChange",
        }[this.sentiment];
        return this.localize.term("uauiAnalytics_deltaSentimentSuffix", this.localize.term(key));
    }

    override render(): TemplateResult | typeof nothing {
        const value = this.#change();
        if (value === undefined || !Number.isFinite(value)) return nothing;

        const arrow = { up: "▲", down: "▼", flat: "–" }[this.direction];

        // The signed number carries the direction for screen readers and the hidden text says whether it is
        // good, so neither the arrow nor the colour has to; the arrow is decoration.
        return html`<span class="badge" data-sentiment=${this.sentiment}
            ><span class="arrow" aria-hidden="true">${arrow}</span>${this.#format(value)}<span class="visually-hidden">${this.#sentimentLabel()}</span></span
        >`;
    }

    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
        UauiVisuallyHiddenStyles,
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
                font-size: var(--uaui-delta-badge-font-size, 13px);
                font-weight: 700;
                font-variant-numeric: tabular-nums;
                white-space: nowrap;
            }

            :host([size="sm"]) .badge {
                padding: 1px 5px;
                font-size: var(--uaui-delta-badge-font-size, 11.5px);
            }

            .arrow {
                font-size: 0.8em;
            }

            [data-sentiment="positive"] {
                color: var(--uaui-color-text-positive);
                background: var(--uaui-color-tint-positive);
            }

            [data-sentiment="negative"] {
                color: var(--uaui-color-text-negative);
                background: var(--uaui-color-tint-negative);
            }

            [data-sentiment="neutral"] {
                color: var(--uaui-color-text-neutral);
                background: var(--uaui-color-tint-neutral);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-delta-badge": UauiDeltaBadgeElement;
    }
}
