import { css, customElement, html, nothing, property, repeat, state, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import type { UauiSeriesColorKey } from "./chart-colors.js";
import { UauiPaletteStyles } from "../../theme/index.js";

/** One series as the legend lists it. */
export interface UauiChartLegendEntry {
    id: string;
    label: string;
    /** What the series is coloured by: a palette slot (1 to 8) or a status colour. */
    color: UauiSeriesColorKey;
    /** Draws a square in the bar colour (`true`) or a line (`false`) for this entry. Defaults to the legend's `bars`. */
    bar?: boolean;
}

/** Above this many series the legend folds: it lists the first `max - 1` and a "+N more" button. */
export const LEGEND_MAX_ENTRIES = 8;

/**
 * The legend under a chart: a list with a line (or, for the bar kinds, a square) in each series'
 * colour, and an entry for the compared period when `compareLabel` is set. Internal: not exported.
 *
 * With more series than `max` it folds: the first `max - 1` series, then a "+N more" button (`aria-expanded`) that
 * lists the rest, where it becomes "Show fewer". The entries wrap onto more lines either way. The compare entry always
 * shows. The button keeps its place, so focus stays on it.
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

    /** The most series listed before the legend folds. */
    @property({ type: Number })
    max = LEGEND_MAX_ENTRIES;

    /** Whether a folded legend shows every series. */
    @state()
    private _expanded = false;

    /** How many series fit before the fold, or `undefined` when they all show without one. */
    get #foldAt(): number | undefined {
        const max = Math.max(Math.floor(this.max) || LEGEND_MAX_ENTRIES, 2);
        return this.entries.length > max ? max - 1 : undefined;
    }

    #toggle() {
        this._expanded = !this._expanded;
    }

    #renderToggle(foldAt: number) {
        const hidden = this.entries.length - foldAt;
        return html`<li class="legend-toggle-item">
            <button type="button" class="legend-toggle" aria-expanded=${this._expanded ? "true" : "false"} @click=${this.#toggle}>
                ${this._expanded ? this.localize.term("uauiAnalytics_chartLegendFewer") : this.localize.term("uauiAnalytics_chartLegendMore", hidden)}
            </button>
        </li>`;
    }

    override render(): TemplateResult {
        const shapes = this.compareShapes?.length ? this.compareShapes : [this.bars ? "bar" : "line"];
        const foldAt = this.#foldAt;
        const shown = foldAt === undefined || this._expanded ? this.entries : this.entries.slice(0, foldAt);
        return html`<ul aria-label=${this.localize.term("uauiAnalytics_chartLegendLabel")}>
            ${repeat(
                shown,
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
            ${foldAt === undefined ? nothing : this.#renderToggle(foldAt)}
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

            /* A text button, as small as the entries, so a folded legend keeps its height. */
            .legend-toggle {
                padding: 0 var(--uui-size-space-1);
                border: 0;
                border-radius: var(--uui-border-radius);
                background: none;
                font: inherit;
                color: var(--uui-color-interactive);
                text-decoration: underline;
                text-underline-offset: 2px;
                cursor: pointer;
            }

            .legend-toggle:hover {
                color: var(--uui-color-interactive-emphasis);
            }

            .legend-toggle:focus-visible {
                outline: calc(2px * var(--uui-show-focus-outline, 1)) solid var(--uui-color-focus);
                outline-offset: 1px;
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
