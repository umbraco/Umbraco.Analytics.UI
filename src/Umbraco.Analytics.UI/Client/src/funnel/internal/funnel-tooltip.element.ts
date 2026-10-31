import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../../delta-badge/delta-badge.element.js";
import { UauiChartTooltipSurface } from "../../chart/internal/chart-tooltip-surface.css.js";
import { UauiFunnelSwatchStyles } from "./funnel-swatch.css.js";

/**
 * The tooltip of a hovered or focused `uaui-funnel` step: its label, this period's value, the compare value with its
 * change, and the step's share of the first step and of the previous one. It draws what it is given and has no
 * position of its own: the funnel places it. Internal: not exported.
 *
 * @element uaui-funnel-tooltip
 */
@customElement("uaui-funnel-tooltip")
export class UauiFunnelTooltipElement extends UmbLitElement {
    /** The step's label. */
    @property({ type: String })
    heading = "";

    /** This period's value, formatted. */
    @property({ type: String })
    value = "";

    /** Names this period. */
    @property({ type: String, attribute: "value-label" })
    valueLabel = "";

    /** The compare value, formatted. Unset when the step has no compare value. */
    @property({ type: String })
    compare?: string;

    /** Names the compared period. */
    @property({ type: String, attribute: "compare-label" })
    compareLabel = "";

    /** The two raw values the change badge is worked out from. */
    @property({ attribute: false })
    change?: { current: number; previous: number };

    /** The first step's label, for the "Of {0}" line. */
    @property({ type: String, attribute: "first-label" })
    firstLabel = "";

    /** The share of the first step, formatted. Unset when there is none. */
    @property({ type: String, attribute: "of-first" })
    ofFirst?: string;

    /** The share of the previous step, formatted. Unset for the first step. */
    @property({ type: String, attribute: "from-previous" })
    fromPrevious?: string;

    #line(label: string, value: string) {
        return html`<div class="tooltip-line"><span>${label}</span><span class="tooltip-figure">${value}</span></div>`;
    }

    override render(): TemplateResult {
        return html`<div class="tooltip-date">${this.heading}</div>
            <div class="tooltip-row">
                <span class="swatch" aria-hidden="true"></span>
                <span class="tooltip-value">${this.value}</span>
                <span class="tooltip-label">${this.valueLabel}</span>
            </div>
            ${this.compare === undefined
                ? nothing
                : html`<div class="tooltip-row">
                      <span class="swatch swatch-compare" aria-hidden="true"></span>
                      <span class="tooltip-value">${this.compare}</span>
                      ${this.change && this.change.previous > 0
                          ? html`<uaui-delta-badge size="sm" .current=${this.change.current} .previous=${this.change.previous}></uaui-delta-badge>`
                          : nothing}
                  </div>
                  <div class="tooltip-sub">${this.compareLabel}</div>`}
            ${this.ofFirst === undefined && this.fromPrevious === undefined
                ? nothing
                : html`<div class="tooltip-shares">
                      ${this.ofFirst === undefined ? nothing : this.#line(this.localize.term("uauiAnalytics_funnelTooltipOfFirst", this.firstLabel), this.ofFirst)}
                      ${this.fromPrevious === undefined ? nothing : this.#line(this.localize.term("uauiAnalytics_funnelFromPrevious"), this.fromPrevious)}
                  </div>`}`;
    }

    static override styles: CSSResultGroup = [
        UauiChartTooltipSurface,
        UauiFunnelSwatchStyles,
        css`
            :host {
                min-width: 168px;
            }

            .tooltip-row {
                display: flex;
                align-items: center;
                gap: var(--uui-size-space-2);
                line-height: 1.6;
            }

            /* The neutral tint is of the theme's text colour, dark in light themes: on this dark box use white's. */
            .swatch-compare {
                background: color-mix(in srgb, var(--uui-palette-white) 20%, transparent);
            }

            .tooltip-value {
                font-size: 13px;
                font-weight: 700;
                white-space: nowrap;
            }

            .tooltip-label {
                min-width: 0;
                overflow-wrap: anywhere;
                color: color-mix(in srgb, var(--uui-palette-white) 82%, transparent);
            }

            /* Dark in every theme: the same overrides as the chart's tooltip. */
            uaui-delta-badge {
                margin-inline-start: auto;
                white-space: nowrap;
                --_uaui-tooltip-tint: 15%;
                --uui-color-scheme: dark;
                --uaui-text-positive: initial;
                --uaui-text-negative: initial;
                --uaui-text-neutral: var(--uui-palette-white);
                --uaui-tint-positive: color-mix(in srgb, var(--uui-palette-jungle-green) var(--_uaui-tooltip-tint), transparent);
                --uaui-tint-negative: color-mix(in srgb, var(--uui-palette-spanish-pink) var(--_uaui-tooltip-tint), transparent);
                --uaui-tint-neutral: color-mix(in srgb, var(--uui-palette-white) var(--_uaui-tooltip-tint), transparent);
            }

            .tooltip-sub {
                margin-block: -2px 2px;
                margin-inline-start: calc(14px + var(--uui-size-space-2));
                font-size: 11px;
                white-space: nowrap;
                color: color-mix(in srgb, var(--uui-palette-white) 70%, transparent);
            }

            .tooltip-shares {
                margin-top: 2px;
                padding-top: 2px;
                border-top: 1px solid color-mix(in srgb, var(--uui-palette-white) 18%, transparent);
            }

            .tooltip-line {
                display: flex;
                justify-content: space-between;
                gap: var(--uui-size-space-4);
                line-height: 1.6;
                color: color-mix(in srgb, var(--uui-palette-white) 82%, transparent);
            }

            .tooltip-figure {
                font-weight: 700;
                white-space: nowrap;
                color: var(--uui-palette-white);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-funnel-tooltip": UauiFunnelTooltipElement;
    }
}
