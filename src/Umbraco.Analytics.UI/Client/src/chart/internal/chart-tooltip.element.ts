import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import type { UauiSeriesColorKey } from "./chart-colors.js";
import { getNumberFormat } from "../../internal/format/number-format.js";
import "../../delta-badge/delta-badge.element.js";
import { deltaChange } from "../../internal/delta/delta-change.js";
import { UauiChartTooltipSurface } from "./chart-tooltip-surface.css.js";

/** The compared period's value for a row or a total, with the x value (a date on the time-series chart) it is from and the current value to measure the change against. */
export interface UauiChartTooltipCompare {
    /** The compare value. */
    value: number;
    /** The compare point's formatted x value. */
    label: string;
    /** The current value the change is measured from. `null` when there is none, so no badge shows. */
    current: number | null;
}

/** One series' point at the hovered x value. */
export interface UauiChartTooltipRow {
    /** What the series is coloured by: a palette slot (1 to 8) or a status colour. */
    color: UauiSeriesColorKey;
    /** Draws a square in the bar colour (`true`) or a dot (`false`) for this row. Defaults to the tooltip's `bars`. */
    bar?: boolean;
    /** The series' value. `null` when it has none at the hovered x value: the row reads "No data", with no compare change. */
    value: number | null;
    /**
     * The share view: the value's share (0 to 1) of the hovered x value's total, shown first, with `value` after it.
     * `null` when there is no share to show (the total is 0): the row shows `value` alone. Left out outside the share view.
     */
    share?: number | null;
    /** The series' label. Left out when there is only one series. */
    label?: string;
    /** Line kinds: this series' compare point. */
    compare?: UauiChartTooltipCompare;
}

/** Above this many rows the tooltip lists the largest and a "+N more" line, so it stays inside a chart of many series. */
export const TOOLTIP_MAX_ROWS = 8;

/**
 * The tooltip over the hovered x value (a date, a category) of a chart: its heading, one row per series with its
 * compare point and change, and for the bar kinds the total and the compare total. With more rows than `maxRows` it
 * lists the `maxRows - 1` largest (by share, else value), in the order given, and a "+N more" line for the rest: the
 * hidden table has them all. Keeping the order means rows never jump between series order and size order as series are
 * added; the chart gives them in its own order (series order, or stack order top first in the share view). It draws what it is given and has no
 * position of its own: the chart places it. Internal: not exported.
 *
 * @element uaui-chart-tooltip
 */
@customElement("uaui-chart-tooltip")
export class UauiChartTooltipElement extends UmbLitElement {
    /** The hovered x value, formatted: a date on the time-series chart. */
    @property({ type: String })
    heading = "";

    /** The rows to list: one per series, a series with no point reading "No data". */
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

    /** Shows a fall against the compare value as good in every badge. */
    @property({ type: Boolean, attribute: "lower-is-better", reflect: true })
    lowerIsBetter = false;

    /** Formats every number. Defaults to the backoffice user's culture with no options. */
    @property({ attribute: false })
    numberFormat?: Intl.NumberFormat;

    /** Formats a row's `share`. Defaults to a percent with up to one decimal in the backoffice user's culture. */
    @property({ attribute: false })
    shareFormat?: Intl.NumberFormat;

    /** The most lines of rows to show: more rows show the `maxRows - 1` largest and a "+N more" line. */
    @property({ type: Number, attribute: "max-rows" })
    maxRows = TOOLTIP_MAX_ROWS;

    #format(value: number) {
        return (this.numberFormat ?? getNumberFormat(this.localize.lang())).format(value);
    }

    /** The compare value, with the change from it to the current value, worked out by the badge: none when there is nothing to divide by. */
    #renderCompare({ value, label, current }: UauiChartTooltipCompare, square: boolean): TemplateResult {
        return html`<div class="tooltip-compare">
            <div class="tooltip-row">
                <span class=${square ? "swatch swatch-compare swatch-square" : "swatch swatch-compare"}></span>
                <span class="tooltip-value">${this.#format(value)}</span>
                ${Number.isFinite(deltaChange(undefined, current ?? undefined, value, "percent"))
                    ? html`<uaui-delta-badge size="sm" .current=${current} .previous=${value} .lowerIsBetter=${this.lowerIsBetter}></uaui-delta-badge>`
                    : nothing}
            </div>
            <div class="tooltip-sub">${label}</div>
        </div>`;
    }

    #formatShare(share: number) {
        return (this.shareFormat ?? getNumberFormat(this.localize.lang(), { style: "percent", maximumFractionDigits: 1 })).format(share);
    }

    /** The rows to show, and how many are left out: all of them, or the largest when there are more than `maxRows`. */
    get #shownRows(): { rows: UauiChartTooltipRow[]; more: number } {
        const max = Math.max(Math.floor(this.maxRows) || TOOLTIP_MAX_ROWS, 2);
        if (this.rows.length <= max) return { rows: this.rows, more: 0 };
        // A row with no value is the smallest.
        const size = (row: UauiChartTooltipRow) => row.share ?? row.value ?? Number.NEGATIVE_INFINITY;
        const largest = new Set([...this.rows].sort((a, b) => (size(a) < size(b) ? 1 : size(a) > size(b) ? -1 : 0)).slice(0, max - 1));
        const rows = this.rows.filter((row) => largest.has(row));
        return { rows, more: this.rows.length - rows.length };
    }

    #renderRow(row: UauiChartTooltipRow) {
        const bar = row.bar ?? this.bars;
        const share = row.value === null ? undefined : (row.share ?? undefined);
        return html`<div class="tooltip-row tooltip-series">
                <span class=${bar ? "swatch swatch-square" : "swatch"} style="--swatch: var(--uaui-color-${bar ? "bar" : "series"}-${row.color})"></span>
                ${row.value === null
                    ? html`<span class="tooltip-value tooltip-no-data">${this.localize.term("uauiAnalytics_chartNoData")}</span>`
                    : html`<span class="tooltip-value">${share === undefined ? this.#format(row.value) : this.#formatShare(share)}</span>`}
                ${row.label === undefined ? nothing : html`<span class="tooltip-label">${row.label}</span>`}
                ${share === undefined || row.value === null ? nothing : html`<span class="tooltip-amount">${this.#format(row.value)}</span>`}
            </div>
            ${row.compare ? this.#renderCompare(row.compare, bar) : nothing}`;
    }

    override render(): TemplateResult {
        const { rows, more } = this.#shownRows;
        return html`<div class="tooltip-date">${this.heading}</div>
            ${rows.map((row) => this.#renderRow(row))}
            ${more ? html`<div class="tooltip-row tooltip-more">${this.localize.term("uauiAnalytics_chartTooltipMore", more)}</div>` : nothing}
            ${this.total
                ? html`<div class="tooltip-row tooltip-total">
                      <span class="tooltip-value">${this.#format(this.total.value)}</span>
                      <span class="tooltip-label">${this.total.label}</span>
                  </div>`
                : nothing}
            ${this.compareTotal ? this.#renderCompare(this.compareTotal, true) : nothing}`;
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

            /* The share view: the value after the share and label, at the end of the row. */
            .tooltip-amount {
                margin-left: auto;
                padding-left: var(--uui-size-space-3);
                font-size: 12px;
                white-space: nowrap;
                color: color-mix(in srgb, var(--uui-palette-white) 82%, transparent);
            }

            /* Indented under the values, past the swatch and its gap: the rows left out. */
            .tooltip-more {
                padding-left: calc(8px + var(--uui-size-space-2));
                font-size: 12px;
                color: color-mix(in srgb, var(--uui-palette-white) 82%, transparent);
            }

            /* No value: plain weight and muted, so it reads as an absence beside the bold values. */
            .tooltip-no-data {
                font-weight: 400;
                color: color-mix(in srgb, var(--uui-palette-white) 70%, transparent);
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
