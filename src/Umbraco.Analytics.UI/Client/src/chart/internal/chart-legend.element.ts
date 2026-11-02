import { css, customElement, html, nothing, property, repeat, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import type { UauiSeriesColorKey } from "./chart-colors.js";
import { UauiPaletteStyles } from "../../theme/index.js";

/** One series as the legend lists it. */
export interface UauiChartLegendEntry {
    id: string;
    label: string;
    /** What the series is coloured by: a palette slot (1 to 4) or a status colour. */
    color: UauiSeriesColorKey;
    /** Draws a square in the bar colour (`true`) or a line (`false`) for this entry. Defaults to the legend's `bars`. */
    bar?: boolean;
}

/**
 * The legend under a chart: a list with a line (or, for the bar kinds, a square) in each series'
 * colour, and an entry for the compared period when `compareLabel` is set. Internal: not exported.
 *
 * @element uaui-chart-legend
 */
@customElement("uaui-chart-legend")
export class UauiChartLegendElement extends UmbLitElement {
    /** The series to list. */
    @property({ attribute: false })
    entries: UauiChartLegendEntry[] = [];

    /** Draw squares in the bar colours, as the bar kinds do. An entry's own `bar` overrides it. */
    @property({ type: Boolean })
    bars = false;

    /** Names the compared period. Set only while the chart compares: it adds an entry for it. */
    @property({ type: String, attribute: "compare-label" })
    compareLabel?: string;

    /**
     * How the compared period is drawn, one swatch each in the compare entry: a bar (the compare total behind the bars)
     * and a dashed line (a line's compare line), or one of them. Defaults to a bar with `bars`, else a line.
     */
    @property({ attribute: false })
    compareShapes?: readonly ("bar" | "line")[];

    override render(): TemplateResult {
        const shapes = this.compareShapes?.length ? this.compareShapes : [this.bars ? "bar" : "line"];
        return html`<ul aria-label=${this.localize.term("uauiAnalytics_chartLegendLabel")}>
            ${repeat(
                this.entries,
                (entry) => entry.id,
                (entry) => {
                    const bar = entry.bar ?? this.bars;
                    return html`<li>
                        <span
                            class=${bar ? "legend-swatch" : "legend-line"}
                            style="--swatch: var(--uaui-color-${bar ? "bar" : "series"}-${entry.color})"
                            aria-hidden="true"></span>
                        ${entry.label}
                    </li>`;
                },
            )}
            ${this.compareLabel
                ? html`<li>
                      ${shapes.map(
                          (shape) =>
                              html`<span class=${shape === "bar" ? "legend-swatch legend-compare-swatch" : "legend-line legend-compare"} aria-hidden="true"></span>`,
                      )}
                      ${this.compareLabel}
                  </li>`
                : nothing}
        </ul>`;
    }

    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
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
                background: var(--uaui-color-compare-bar);
            }

            .legend-compare {
                border-top-style: dashed;
                border-top-width: 2px;
                border-top-color: var(--uaui-color-compare);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-chart-legend": UauiChartLegendElement;
    }
}
