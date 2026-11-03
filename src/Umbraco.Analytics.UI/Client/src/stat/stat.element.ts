import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { deltaChange } from "../internal/delta/delta-change.js";
import { badgeFigures, UauiFigureFormatter, type UauiFigureText } from "../internal/format/figure.js";
import type { UauiDeltaUnit } from "../delta-badge/delta-badge.element.js";
import "../delta-badge/delta-badge.element.js";
import "../internal/figure/figure-value.element.js";

/** How a `uaui-stat` lays out its label, value and badge. */
export type UauiStatLayout = "stacked" | "inline";

/**
 * One figure with its label and an optional change badge, e.g. a total in the column toolbar of a `uaui-data-table`
 * or the overall rate in a `uui-box` header.
 *
 * `layout="stacked"` (the default) puts a small uppercase label on its own line, with the value in bold and the badge
 * on the next. Slot it into a table's `toolbar-<column key>` and it sits over its column: it takes the `text-align` of
 * its cell, so it ends on the right in a column that is `align: "end"`.
 *
 * `layout="inline"` puts the label, value and badge on one line, lined up on their baseline, for a `uui-box`
 * `header-actions` slot ("Overall 3.8% +0.2 pp"). The label is muted and not in capitals there.
 *
 * Give `value` as a number and the stat formats it in the backoffice user's culture, with `valueFormat` for the style
 * (e.g. `{ style: "currency", currency: "EUR" }`). The product picks the currency or unit: the stat never guesses one.
 * A string `value` (and the `value` attribute, which is always a string) is shown exactly as given, for a figure the
 * product has formatted itself.
 *
 * For the badge, set `delta` (18.7 means +18.7%), or give the two numbers, `current` and `previous`, and the badge
 * works out the change, as `uaui-kpi-tile` does. `current` defaults to a number `value`, so then `previous` is enough, on the
 * value's scale (fractions for points with a percent `valueFormat`). `delta` wins when both are set. With neither, or with nothing to compare with, there is no badge.
 *
 * @element uaui-stat
 */
@customElement("uaui-stat")
export class UauiStatElement extends UmbLitElement {
    /** What the figure is, e.g. "Total pageviews". */
    @property({ type: String })
    label = "";

    /**
     * The figure. A number is formatted in the backoffice user's culture with `valueFormat`. A string (and the
     * attribute) is shown exactly as given, e.g. "1,272" formatted by the product. 0 is a value; an empty string or a
     * number that isn't finite (NaN, Infinity) is no value, as unset is.
     */
    @property()
    value?: number | string;

    /**
     * How numbers are formatted, e.g. `{ style: "currency", currency: "EUR" }`. Formats a number `value`; a string
     * `value` is shown as given. The product picks the currency or unit. A number of 1,000,000 or more (negative too)
     * is shown compact ("€1.23M") unless this sets `notation`; `notation: "standard"` keeps the exact amount. The exact
     * amount is the hover title and what screen readers read. Options `Intl` rejects (e.g. a bad currency
     * code) fall back to the default number format.
     */
    @property({ type: Object, attribute: "value-format" })
    valueFormat?: Intl.NumberFormatOptions;

    /**
     * The change against the comparison period. 18.7 means +18.7%. 0 is "no change" (a neutral badge).
     * Unset, or not a finite number, means "unknown" (no comparison data) and shows no badge.
     */
    @property({ type: Number })
    delta?: number;

    /**
     * The figure in the current period, as a number. With `previous`, the badge works out the change. Ignored when
     * `delta` is set. The shown value is still `value`. For points, give both in percent units (62 means 62%).
     *
     * Defaults to `value` when that is a number, and `previous` is then on the value's scale: with points and a
     * `valueFormat` of `style: "percent"`, both are fractions (0.256 against 0.24 is +1.6 pp), as a table column's are.
     */
    @property({ type: Number })
    current?: number;

    /**
     * The same figure in the comparison period. With `current` (or a number `value`), the badge works out the change.
     * Ignored when `delta` is set. On the same scale as `current`, or as `value` when `current` is unset: with points
     * and a `valueFormat` of `style: "percent"`, a fraction then (0.24 is 24%).
     */
    @property({ type: Number })
    previous?: number;

    /** Whether the change is a percent change or a change in percentage points. */
    @property({ type: String, attribute: "delta-unit" })
    deltaUnit: UauiDeltaUnit = "percent";

    /** Shows a fall as good (green) and a rise as bad (red), e.g. for a bounce rate. */
    @property({ type: Boolean, attribute: "lower-is-better", reflect: true })
    lowerIsBetter = false;

    /** `stacked`: the label above the value and badge, for a table's column toolbar. `inline`: all on one line, for a `uui-box` header. */
    @property({ type: String, reflect: true })
    layout: UauiStatLayout = "stacked";

    #formatter = new UauiFigureFormatter();

    // The text to show (and the exact amount behind a compact one), or undefined for no value. The formatter is built on first use and kept per language and options.
    get #shown(): UauiFigureText | undefined {
        return this.#formatter.figure(this.value, this.localize.lang(), this.valueFormat);
    }

    // The badge's two numbers: `current` and `previous`, or a number `value` and `previous` on its scale.
    get #figures(): { current?: number; previous?: number } {
        return badgeFigures(this.value, this.current, this.previous, this.deltaUnit, this.valueFormat);
    }

    // Whether there is a change to show: the same rule the badge uses, so no empty badge takes up room.
    #hasChange(figures: { current?: number; previous?: number }): boolean {
        return Number.isFinite(deltaChange(this.delta, figures.current, figures.previous, this.deltaUnit));
    }

    override render(): TemplateResult {
        const shown = this.#shown;
        const figures = this.#figures;
        return html`<span class="label">${this.label}</span>
            <span class="row"
                >${shown !== undefined ? html`<span class="value"><uaui-figure-value .figure=${shown}></uaui-figure-value></span>` : nothing}${this.#hasChange(figures)
                    ? html`<uaui-delta-badge
                          size="sm"
                          .value=${this.delta}
                          .current=${figures.current}
                          .previous=${figures.previous}
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

        :host([layout="inline"]) {
            display: inline-flex;
            align-items: baseline;
            gap: var(--uui-size-space-3);
            white-space: nowrap;
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

        :host([layout="inline"]) .label {
            font-size: var(--uui-type-default-size);
            font-weight: 400;
            letter-spacing: normal;
            text-transform: none;
        }

        :host([layout="inline"]) .row {
            display: inline-flex;
            align-items: baseline;
            gap: var(--uui-size-space-3);
            margin-top: 0;
        }

        :host([layout="inline"]) .value {
            /* Between the 14px label and the box headline, as in the funnel design's header. */
            font-size: 16px;
        }

        :host([layout="inline"]) uaui-delta-badge {
            margin-inline-start: 0;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-stat": UauiStatElement;
    }
}
