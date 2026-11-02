import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiVisuallyHiddenStyles } from "../../internal/a11y/visually-hidden.css.js";
import { getNumberFormat } from "../../internal/format/number-format.js";
import type { UauiChartData } from "./chart-values.js";

/**
 * The visually hidden table of a chart's data, for screen readers: a row per x value (a date, a category), a column per
 * series (and its compare points for a compared line), and for bars the total and the compare total.
 * Internal: not exported.
 *
 * @element uaui-chart-data-table
 */
@customElement("uaui-chart-data-table")
export class UauiChartDataTableElement extends UmbLitElement {
    /** The formatted x value (a date on the time-series chart) of each row. */
    @property({ attribute: false })
    labels: string[] = [];

    /** The heading of the column of x values: "Date" on the time-series chart, "Category" on the category chart. */
    @property({ type: String, attribute: "labels-header" })
    labelsHeader = "";

    /** The series to list, with their values on the rows' x values. */
    @property({ attribute: false })
    series: UauiChartData["series"] = [];

    /** The chart's y-axis is logarithmic: the caption says so, as the table is all a screen reader gets of the chart. */
    @property({ type: Boolean, attribute: "log-scale" })
    logScale = false;

    /** The sum of the series per row. Set to add a total column. */
    @property({ attribute: false })
    totals?: (number | null)[];

    /** The label of the total column, also used in the heading of the compare total. */
    @property({ type: String, attribute: "total-label" })
    totalLabel = "";

    /** The bar kinds: the compare total per row. Set to add a column for it. */
    @property({ attribute: false })
    compareTotal?: (number | null)[];

    /** Formats every number. Defaults to the backoffice user's culture with no options. */
    @property({ attribute: false })
    numberFormat?: Intl.NumberFormat;

    /**
     * The share view: per series (in `series` order), each value's share (0 to 1) of its row's total, `null` where there
     * is none. Set to show each series cell as its share and its value ("42.5% (1,234)") and say so in the caption.
     */
    @property({ attribute: false })
    shares?: (number | null)[][];

    /** Formats a share. Defaults to a percent with up to one decimal in the backoffice user's culture. */
    @property({ attribute: false })
    shareFormat?: Intl.NumberFormat;

    #format(value: number) {
        return (this.numberFormat ?? getNumberFormat(this.localize.lang())).format(value);
    }

    #cell(value: number | null | undefined) {
        return html`<td>${value === null || value === undefined ? "" : this.#format(value)}</td>`;
    }

    /** A series cell of the share view: the share and the value, or the value alone where there is no share. */
    #shareCell(value: number | null, share: number | null | undefined) {
        if (value === null || share === null || share === undefined) return this.#cell(value);
        const format = this.shareFormat ?? getNumberFormat(this.localize.lang(), { style: "percent", maximumFractionDigits: 1 });
        return html`<td>${this.localize.term("uauiAnalytics_chartShareValue", format.format(share), this.#format(value))}</td>`;
    }

    get #caption() {
        if (this.shares) return this.localize.term("uauiAnalytics_chartTableCaptionShare");
        return this.logScale ? this.localize.term("uauiAnalytics_chartTableCaptionLog") : this.localize.term("uauiAnalytics_chartTableCaption");
    }

    override render(): TemplateResult {
        const { series, totals, compareTotal, shares } = this;
        return html`<table class="visually-hidden">
            <caption>
                ${this.#caption}
            </caption>
            <thead>
                <tr>
                    <th scope="col">${this.labelsHeader}</th>
                    ${series.map(
                        (s) => html`<th scope="col">${s.label}</th>
                            ${s.compare
                                ? html`<th scope="col">${this.localize.term("uauiAnalytics_chartTableCompareHeader", s.label)}</th>`
                                : nothing}`,
                    )}
                    ${totals ? html`<th scope="col">${this.totalLabel}</th>` : nothing}
                    ${compareTotal
                        ? html`<th scope="col">${this.localize.term("uauiAnalytics_chartTableCompareHeader", this.totalLabel)}</th>`
                        : nothing}
                </tr>
            </thead>
            <tbody>
                ${this.labels.map(
                    (label, row) => html`<tr>
                        <th scope="row">${label}</th>
                        ${series.map(
                            (s, i) =>
                                html`${shares ? this.#shareCell(s.values[row], shares[i]?.[row]) : this.#cell(s.values[row])}${s.compare
                                    ? this.#cell(s.compare[row])
                                    : nothing}`,
                        )}
                        ${totals ? this.#cell(totals[row]) : nothing} ${compareTotal ? this.#cell(compareTotal[row]) : nothing}
                    </tr>`,
                )}
            </tbody>
        </table>`;
    }

    static override styles: CSSResultGroup = [
        UauiVisuallyHiddenStyles,
        css`
            :host {
                position: relative;
                display: block;
                height: 0;
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-chart-data-table": UauiChartDataTableElement;
    }
}
