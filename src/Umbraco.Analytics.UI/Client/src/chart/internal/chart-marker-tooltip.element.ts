import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiChartTooltipSurface } from "./chart-tooltip-surface.css.js";

/** One marker as the tooltip lists it. */
export interface UauiChartMarkerTooltipEntry {
    /** The marker's formatted date. */
    date: string;
    title: string;
    description?: string;
}

/**
 * The tooltip over a marker's dot of `uaui-time-series-chart`: each marker's date, title and description, and how
 * many more there are when a crowded dot has more than the chart lists. It has no position of its own:
 * the chart places it. Internal: not exported.
 *
 * @element uaui-chart-marker-tooltip
 */
@customElement("uaui-chart-marker-tooltip")
export class UauiChartMarkerTooltipElement extends UmbLitElement {
    /** The markers to list. */
    @property({ attribute: false })
    entries: UauiChartMarkerTooltipEntry[] = [];

    /** How many markers of the dot are not listed. */
    @property({ type: Number })
    more = 0;

    override render(): TemplateResult {
        return html`${this.entries.map(
                (entry) => html`<div class="marker-entry">
                    <div class="tooltip-date">${entry.date}</div>
                    <div class="marker-title">${entry.title}</div>
                    ${entry.description ? html`<div class="marker-note">${entry.description}</div>` : nothing}
                </div>`,
            )}
            ${this.more > 0 ? html`<div class="marker-more">${this.localize.term("uauiAnalytics_chartMarkersMore", this.more)}</div>` : nothing}`;
    }

    static override styles: CSSResultGroup = [
        UauiChartTooltipSurface,
        css`
            :host {
                top: 6px;
                max-width: 240px;
                padding: 9px 12px;
            }

            .marker-entry + .marker-entry {
                margin-top: var(--uui-size-space-2);
                padding-top: var(--uui-size-space-2);
                border-top: 1px solid color-mix(in srgb, var(--uui-palette-white) 18%, transparent);
            }

            .marker-title {
                font-size: 13px;
                font-weight: 700;
                line-height: 1.3;
            }

            .marker-note {
                margin-top: 3px;
                line-height: 1.45;
                color: color-mix(in srgb, var(--uui-palette-white) 82%, transparent);
            }

            .marker-more {
                margin-top: var(--uui-size-space-2);
                font-size: 11px;
                color: color-mix(in srgb, var(--uui-palette-white) 70%, transparent);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-chart-marker-tooltip": UauiChartMarkerTooltipElement;
    }
}
