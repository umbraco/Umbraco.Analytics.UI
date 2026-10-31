import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { getNumberFormat } from "../../internal/format/number-format.js";
import "../../delta-badge/delta-badge.element.js";
import { UauiChartTooltipSurface } from "./chart-tooltip-surface.css.js";

/** The compared period's value for a row or a total, with the date it is from and the current value to measure the change against. */
export interface UauiChartTooltipCompare {
    /** The compare value. */
    value: number;
    /** The compare point's formatted date. */
    date: string;
    /** The current value the change is measured from. `null` when there is none, so no badge shows. */
    current: number | null;
}

/** One series' point at the hovered date. */
export interface UauiChartTooltipRow {
    /** The series' palette slot, 1 to 4. */
    slot: number;
    value: number;
    /** The series' label. Left out when there is only one series. */
    label?: string;
    /** Line kinds: this series' compare point. */
    compare?: UauiChartTooltipCompare;
}

/**
 * The tooltip over a hovered date of `uaui-time-series-chart`: the date, one row per series with its compare point
 * and change, and for the bar kinds the total and the compare total. It draws what it is given and has no
 * position of its own: the chart places it. Internal: not exported.
 *
 * @element uaui-chart-tooltip
 */
@customElement("uaui-chart-tooltip")
export class UauiChartTooltipElement extends UmbLitElement {
    /** The hovered date, formatted. */
    @property({ type: String })
    date = "";

    /** The rows to list: only series with a point at the date. */
    @property({ attribute: false })
    rows: UauiChartTooltipRow[] = [];

    /** Draw square swatches in the bar colours, as the bar kinds do. */
    @property({ type: Boolean })
    bars = false;

    /** Bar kinds: the sum of the rows, with its label. */
    @property({ attribute: false })
    total?: { value: number; label: string };

    /** Bar kinds: the compare total. */
    @property({ attribute: false })
    compareTotal?: UauiChartTooltipCompare;

    /** Formats every number. Defaults to the backoffice user's culture with no options. */
    @property({ attribute: false })
    numberFormat?: Intl.NumberFormat;

    #format(value: number) {
        return (this.numberFormat ?? getNumberFormat(this.localize.lang())).format(value);
    }

    /** The compare value, with the change from it to the current value. No badge when there is nothing to divide by. */
    #renderCompare({ value, date, current }: UauiChartTooltipCompare): TemplateResult {
        return html`<div class="tooltip-compare">
            <div class="tooltip-row">
                <span class=${this.bars ? "swatch swatch-compare swatch-square" : "swatch swatch-compare"}></span>
                <span class="tooltip-value">${this.#format(value)}</span>
                ${value !== 0 && current !== null
                    ? html`<uaui-delta-badge size="sm" .value=${((current - value) / Math.abs(value)) * 100}></uaui-delta-badge>`
                    : nothing}
            </div>
            <div class="tooltip-sub">${date}</div>
        </div>`;
    }

    override render(): TemplateResult {
        const token = this.bars ? "bar" : "series";
        const swatch = this.bars ? "swatch swatch-square" : "swatch";
        return html`<div class="tooltip-date">${this.date}</div>
            ${this.rows.map(
                (row) => html`<div class="tooltip-row tooltip-series">
                        <span class=${swatch} style="--swatch: var(--uaui-color-${token}-${row.slot})"></span>
                        <span class="tooltip-value">${this.#format(row.value)}</span>
                        ${row.label === undefined ? nothing : html`<span class="tooltip-label">${row.label}</span>`}
                    </div>
                    ${row.compare ? this.#renderCompare(row.compare) : nothing}`,
            )}
            ${this.total
                ? html`<div class="tooltip-row tooltip-total">
                      <span class="tooltip-value">${this.#format(this.total.value)}</span>
                      <span class="tooltip-label">${this.total.label}</span>
                  </div>`
                : nothing}
            ${this.compareTotal ? this.#renderCompare(this.compareTotal) : nothing}`;
    }

    static override styles: CSSResultGroup = [
        UauiChartTooltipSurface,
        css`
            .tooltip-row {
                display: flex;
                align-items: center;
                gap: var(--uui-size-space-2);
                line-height: 1.6;
            }

            .swatch {
                flex: none;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--swatch);
            }

            .tooltip-value {
                font-size: 13px;
                font-weight: 700;
            }

            /* The tooltip is dark in every theme: the badge reads its dark branch and ignores product overrides here.
               The tints are 15%: jungle green on a 20% tint of itself over space cadet is 4.47:1, under 4.5:1. */
            uaui-delta-badge {
                margin-left: auto;
                --_uaui-tooltip-tint: 15%;
                --uui-color-scheme: dark;
                --uaui-text-positive: initial;
                --uaui-text-negative: initial;
                --uaui-text-neutral: var(--uui-palette-white);
                --uaui-tint-positive: color-mix(in srgb, var(--uui-palette-jungle-green) var(--_uaui-tooltip-tint), transparent);
                --uaui-tint-negative: color-mix(in srgb, var(--uui-palette-spanish-pink) var(--_uaui-tooltip-tint), transparent);
                --uaui-tint-neutral: color-mix(in srgb, var(--uui-palette-white) var(--_uaui-tooltip-tint), transparent);
            }

            .tooltip-value,
            uaui-delta-badge {
                white-space: nowrap;
            }

            /* Indented under the value, past the swatch and its gap. */
            .tooltip-sub {
                margin: -2px 0 2px calc(8px + var(--uui-size-space-2));
                font-size: 11px;
                white-space: nowrap;
                color: color-mix(in srgb, var(--uui-palette-white) 70%, transparent);
            }

            .swatch-square {
                border-radius: 2px;
            }

            .swatch-compare {
                background: var(--uaui-color-compare);
            }

            .swatch-compare.swatch-square {
                background: var(--uaui-color-compare-bar);
            }

            /* Indented under the swatch column, with a hairline above, so it reads as the sum of the rows. */
            .tooltip-total {
                margin-top: 2px;
                padding: 2px 0 0 calc(8px + var(--uui-size-space-2));
                border-top: 1px solid color-mix(in srgb, var(--uui-palette-white) 18%, transparent);
            }

            .tooltip-label {
                min-width: 0;
                overflow-wrap: anywhere;
                color: color-mix(in srgb, var(--uui-palette-white) 82%, transparent);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-chart-tooltip": UauiChartTooltipElement;
    }
}
