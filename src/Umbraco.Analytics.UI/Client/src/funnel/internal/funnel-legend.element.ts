import { css, customElement, html, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiPaletteStyles } from "../../theme/index.js";
import { UauiFunnelSwatchStyles } from "./funnel-swatch.css.js";

/**
 * The legend above a comparing `uaui-funnel`: a small bar for this period and a bracketed one for the compared one.
 * Internal: not exported.
 *
 * @element uaui-funnel-legend
 */
@customElement("uaui-funnel-legend")
export class UauiFunnelLegendElement extends UmbLitElement {
    /** Names this period. */
    @property({ type: String })
    label = "";

    /** Names the compared period. */
    @property({ type: String, attribute: "compare-label" })
    compareLabel = "";

    override render(): TemplateResult {
        return html`<ul aria-label=${this.localize.term("uauiAnalytics_chartLegendLabel")}>
            <li><span class="swatch" aria-hidden="true"></span>${this.label}</li>
            <li><span class="swatch swatch-compare" aria-hidden="true"></span>${this.compareLabel}</li>
        </ul>`;
    }

    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
        UauiFunnelSwatchStyles,
        css`
            :host {
                display: block;
            }

            ul {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: var(--uui-size-space-1) var(--uui-size-space-4);
                margin: 0;
                padding: 0;
                list-style: none;
                font-size: 12px;
                line-height: 18px;
                color: var(--uui-color-text-alt);
            }

            li {
                display: inline-flex;
                align-items: center;
                gap: var(--uui-size-space-2);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-funnel-legend": UauiFunnelLegendElement;
    }
}
