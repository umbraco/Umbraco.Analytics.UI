import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { getNumberFormat } from "../../internal/format/number-format.js";
import type { UaxChartData } from "./chart-data.js";

/**
 * The visually hidden table of `uax-time-series-chart`'s data, for screen readers: a row per date, a column per
 * series (and its compare points for the line kinds), and for the bar kinds the total and the compare total.
 * Internal: not exported.
 *
 * @element uax-chart-data-table
 */
@customElement("uax-chart-data-table")
export class UaxChartDataTableElement extends UmbLitElement {
    /** The formatted date of each row. */
    @property({ attribute: false })
    dates: string[] = [];

    /** The series to list, with their values on the rows' dates. */
    @property({ attribute: false })
    series: UaxChartData["series"] = [];

    /** The bar kinds: compare points are listed as one total, not per series. */
    @property({ type: Boolean })
    bars = false;

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
        const { series, bars, totals, compareTotal } = this;
        return html`<table>
            <caption>
                ${this.localize.term("uaxAnalytics_chartTableCaption")}
            </caption>
            <thead>
                <tr>
                    <th scope="col">${this.localize.term("uaxAnalytics_chartTableDateHeader")}</th>
                    ${series.map(
                        (s) => html`<th scope="col">${s.label}</th>
                            ${s.compare && !bars
                                ? html`<th scope="col">${this.localize.term("uaxAnalytics_chartTableCompareHeader", s.label)}</th>`
                                : nothing}`,
                    )}
                    ${totals ? html`<th scope="col">${this.totalLabel}</th>` : nothing}
                    ${compareTotal
                        ? html`<th scope="col">${this.localize.term("uaxAnalytics_chartTableCompareHeader", this.totalLabel)}</th>`
                        : nothing}
                </tr>
            </thead>
            <tbody>
                ${this.dates.map(
                    (date, row) => html`<tr>
                        <th scope="row">${date}</th>
                        ${series.map((s) => html`${this.#cell(s.values[row])}${s.compare && !bars ? this.#cell(s.compare[row]) : nothing}`)}
                        ${totals ? this.#cell(totals[row]) : nothing} ${compareTotal ? this.#cell(compareTotal[row]) : nothing}
                    </tr>`,
                )}
            </tbody>
        </table>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            position: absolute;
            width: 1px;
            height: 1px;
            margin: -1px;
            padding: 0;
            overflow: hidden;
            clip-path: inset(50%);
            white-space: nowrap;
            border: 0;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-chart-data-table": UaxChartDataTableElement;
    }
}
