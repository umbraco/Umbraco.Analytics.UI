import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiVisuallyHiddenStyles } from "../../internal/a11y/visually-hidden.css.js";
import { getNumberFormat } from "../../internal/format/number-format.js";
import type { UauiChartData } from "./chart-data.js";

/**
 * The visually hidden table of `uaui-time-series-chart`'s data, for screen readers: a row per date, a column per
 * series (and its compare points for a compared line), and for bars the total and the compare total.
 * Internal: not exported.
 *
 * @element uaui-chart-data-table
 */
@customElement("uaui-chart-data-table")
export class UauiChartDataTableElement extends UmbLitElement {
    /** The formatted date of each row. */
    @property({ attribute: false })
    dates: string[] = [];

    /** The series to list, with their values on the rows' dates. */
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

    #format(value: number) {
        return (this.numberFormat ?? getNumberFormat(this.localize.lang())).format(value);
    }

    #cell(value: number | null | undefined) {
        return html`<td>${value === null || value === undefined ? "" : this.#format(value)}</td>`;
    }

    override render(): TemplateResult {
        const { series, totals, compareTotal } = this;
        return html`<table class="visually-hidden">
            <caption>
                ${this.logScale ? this.localize.term("uauiAnalytics_chartTableCaptionLog") : this.localize.term("uauiAnalytics_chartTableCaption")}
            </caption>
            <thead>
                <tr>
                    <th scope="col">${this.localize.term("uauiAnalytics_chartTableDateHeader")}</th>
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
                ${this.dates.map(
                    (date, row) => html`<tr>
                        <th scope="row">${date}</th>
                        ${series.map((s) => html`${this.#cell(s.values[row])}${s.compare ? this.#cell(s.compare[row]) : nothing}`)}
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
