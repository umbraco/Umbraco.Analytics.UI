import { css, customElement, html, nothing, property, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { getLoadingMode } from "../internal/loading/index.js";
import { uanThemeTokens } from "../internal/theme/tokens.css.js";
import type { UanDeltaUnit } from "../delta-badge/delta-badge.element.js";
import "../delta-badge/delta-badge.element.js";

/**
 * A headline number as a card: an icon in a pink square, a label, the value and an optional change badge.
 *
 * Put tiles in a CSS grid row and they stay the same height. The badge drops below the value when the tile is
 * too narrow for both. While `loading` with no `value` it shows a skeleton the size of a loaded tile. While
 * loading with a `value` it keeps the value and marks the tile busy, without a loading bar.
 *
 * @element uan-kpi-tile
 * @cssprop --uan-kpi-icon-bg - Background of the icon square. Defaults to spanish pink in every theme.
 * @cssprop --uan-kpi-icon-fg - Icon colour. Defaults to space cadet, which passes 3:1 on the default square. A product that overrides either owns that contrast.
 */
@customElement("uan-kpi-tile")
export class UanKpiTileElement extends UmbLitElement {
    /** What the number is, e.g. "Revenue". */
    @property({ type: String })
    label = "";

    /** The number, already formatted by the product (e.g. "€ 4,837.40"). It is shown exactly as given. */
    @property({ type: String })
    value?: string;

    /** Name of a backoffice icon, shown in the pink square. */
    @property({ type: String })
    icon?: string;

    /** The change against the comparison period. 18.7 means +18.7%. No badge when unset. */
    @property({ type: Number })
    delta?: number;

    /** Whether `delta` is a percent change or a change in percentage points. */
    @property({ type: String, attribute: "delta-unit" })
    deltaUnit: UanDeltaUnit = "percent";

    /** Shows a fall as good (green) and a rise as bad (red), e.g. for refund rate. */
    @property({ type: Boolean, attribute: "lower-is-better" })
    lowerIsBetter = false;

    /** The product is fetching the value. */
    @property({ type: Boolean, reflect: true })
    loading = false;

    /** Makes the tile a button that raises `select` when pressed, so a row of tiles can switch a chart's metric. */
    @property({ type: Boolean, reflect: true })
    selectable = false;

    /** Draws the active state and reports `aria-pressed="true"`. Only has an effect while `selectable`. */
    @property({ type: Boolean, reflect: true })
    selected = false;

    #select() {
        this.dispatchEvent(new CustomEvent("select", { bubbles: true, composed: true, detail: {} }));
    }

    override render() {
        const hasValue = this.value !== undefined && this.value !== null && this.value !== "";
        const mode = getLoadingMode(this.loading, hasValue);

        const content = html`${this.icon
                ? html`<div class="icon" aria-hidden="true"><uui-icon name=${this.icon}></uui-icon></div>`
                : nothing}
            <div class="content" aria-busy=${this.loading ? "true" : "false"}>
                ${mode === "skeleton"
                    ? html`<uan-skeleton></uan-skeleton>`
                    : html`<div class="body">
                          <div class="label">${this.label}</div>
                          <div class="row">
                              ${hasValue ? html`<div class="value">${this.value}</div>` : nothing}
                              ${this.delta === undefined || this.delta === null
                                  ? nothing
                                  : html`<uan-delta-badge
                                        .value=${this.delta}
                                        .unit=${this.deltaUnit}
                                        .lowerIsBetter=${this.lowerIsBetter}></uan-delta-badge>`}
                          </div>
                      </div>`}
            </div>`;

        // A native button gives Enter and Space for free, and both arrive as one click.
        return this.selectable
            ? html`<button
                  type="button"
                  class="tile selectable"
                  aria-pressed=${this.selected ? "true" : "false"}
                  @click=${this.#select}>
                  ${content}
              </button>`
            : html`<div class="tile">${content}</div>`;
    }

    static override styles: CSSResultGroup = [
        uanThemeTokens,
        css`
            :host {
                display: block;
                height: 100%;
                /* Content height of a tile with the badge beside the value: the icon square. */
                --_uan-skeleton-height: 48px;
                /* Pink square with a dark glyph in every theme (series-2 is maroon in light, so a dark glyph
                   on it fails 3:1). Both palette colours are theme-independent: space-cadet on spanish-pink
                   is 12.5:1. A product that overrides either public name owns the 3:1 between them. */
                --_uan-kpi-icon-bg: var(--uan-kpi-icon-bg, var(--uui-palette-spanish-pink));
                --_uan-kpi-icon-fg: var(--uan-kpi-icon-fg, var(--uui-palette-space-cadet));
            }

            .tile {
                box-sizing: border-box;
                height: 100%;
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 16px 20px;
                background: var(--uui-color-surface);
                border: 1px solid var(--uui-color-border);
                border-radius: var(--uui-border-radius-3);
                box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
            }

            button.tile {
                /* Reset the button so it fills the row like the div card does. */
                appearance: none;
                margin: 0;
                width: 100%;
                text-align: inherit;
                font: inherit;
                color: inherit;
                cursor: pointer;
                transition:
                    border-color 120ms,
                    box-shadow 120ms;
            }

            button.tile:hover {
                border-color: var(--uui-color-interactive);
                box-shadow: 0 0 0 1px var(--uui-color-interactive);
            }

            /* Selected is a thicker ring (3px against 1px), so it reads without relying on colour. */
            button.tile[aria-pressed="true"] {
                border-color: var(--uui-color-interactive);
                box-shadow: 0 0 0 2px var(--uui-color-interactive);
            }

            button.tile:focus-visible {
                outline: 2px solid var(--uui-color-focus);
                outline-offset: 3px;
            }

            .icon {
                flex: 0 0 auto;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 48px;
                height: 48px;
                border-radius: 9px;
                background: var(--_uan-kpi-icon-bg);
                color: var(--_uan-kpi-icon-fg);
                font-size: 20px;
            }

            .content {
                flex: 1;
                min-width: 0;
                min-height: var(--_uan-skeleton-height);
                display: flex;
                flex-direction: column;
                justify-content: center;
            }

            .body {
                display: flex;
                flex-direction: column;
                justify-content: center;
                gap: 5px;
            }

            .label {
                font-size: 12px;
                font-weight: 600;
                line-height: 1.3;
                color: var(--uui-color-text-alt);
                text-transform: uppercase;
                letter-spacing: 0.4px;
            }

            .row {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 8px 10px;
            }

            .value {
                font-size: 24px;
                font-weight: 700;
                line-height: 1.1;
                white-space: nowrap;
                color: var(--uui-color-text);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uan-kpi-tile": UanKpiTileElement;
    }
}
