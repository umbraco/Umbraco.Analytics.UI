import { css, customElement, html, nothing, property, repeat, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UaxPaletteStyles } from "../../theme/index.js";

/** One series as the legend lists it. */
export interface UaxChartLegendEntry {
    id: string;
    label: string;
    /** The series' palette slot, 1 to 4. */
    slot: number;
}

/**
 * The legend under `uax-time-series-chart`: a list with a line (or, for the bar kinds, a square) in each series'
 * colour, and an entry for the compared period when `compareLabel` is set. Internal: not exported.
 *
 * @element uax-chart-legend
 */
@customElement("uax-chart-legend")
export class UaxChartLegendElement extends UmbLitElement {
    /** The series to list. */
    @property({ attribute: false })
    entries: UaxChartLegendEntry[] = [];

    /** Draw squares in the bar colours, as the bar kinds do. */
    @property({ type: Boolean })
    bars = false;

    /** Names the compared period. Set only while the chart compares: it adds an entry for it. */
    @property({ type: String, attribute: "compare-label" })
    compareLabel?: string;

    override render(): TemplateResult {
        const token = this.bars ? "bar" : "series";
        return html`<ul aria-label=${this.localize.term("uaxAnalytics_chartLegendLabel")}>
            ${repeat(
                this.entries,
                (entry) => entry.id,
                (entry) => html`<li>
                    <span
                        class=${this.bars ? "legend-swatch" : "legend-line"}
                        style="--swatch: var(--uax-color-${token}-${entry.slot})"
                        aria-hidden="true"></span>
                    ${entry.label}
                </li>`,
            )}
            ${this.compareLabel
                ? html`<li>
                      <span class=${this.bars ? "legend-swatch legend-compare-swatch" : "legend-line legend-compare"} aria-hidden="true"></span>
                      ${this.compareLabel}
                  </li>`
                : nothing}
        </ul>`;
    }

    static override styles: CSSResultGroup = [
        UaxPaletteStyles,
        css`
            :host {
                display: block;
            }

            ul {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                justify-content: center;
                gap: var(--uui-size-space-2) var(--uui-size-space-6);
                margin: var(--uui-size-space-3) 0 0;
                padding: 0;
                list-style: none;
                font-size: 12.5px;
                color: var(--uui-color-text);
            }

            li {
                display: inline-flex;
                align-items: center;
                gap: 7px;
            }

            .legend-line {
                width: 18px;
                border-top: 3px solid var(--swatch);
                border-radius: 2px;
            }

            .legend-swatch {
                flex: none;
                width: 10px;
                height: 10px;
                border-radius: 2px;
                background: var(--swatch);
            }

            .legend-compare-swatch {
                background: var(--uax-color-compare-bar);
            }

            .legend-compare {
                border-top-style: dashed;
                border-top-width: 2px;
                border-top-color: var(--uax-color-compare);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-chart-legend": UaxChartLegendElement;
    }
}
