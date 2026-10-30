import { css, customElement, html, nothing, property, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { getLoadingMode } from "../internal/loading/index.js";
import { UaxPaletteStyles } from "../theme/index.js";
import type { UaxDeltaUnit } from "../delta-badge/delta-badge.element.js";
import "../delta-badge/delta-badge.element.js";

/**
 * A headline number as a card: an icon in a pink square, a label, the value and an optional change badge.
 *
 * Put tiles in a CSS grid row and they stay the same height. The badge drops below the value when the tile is
 * too narrow for both. While `loading` with no `value` it shows a skeleton the size of a loaded tile. While
 * loading with a `value` it keeps the value and marks the tile busy, without a loading bar.
 *
 * @element uax-kpi-tile
 * @fires selected - A selectable, unselected tile was pressed. Cancelable: cancel it to keep the tile unselected.
 * @fires deselected - A selectable, selected tile was pressed while `deselectable`. Cancelable: cancel it to keep the tile selected.
 * @cssprop --uax-kpi-icon-bg - Background of the icon square. Defaults to spanish pink in every theme.
 * @cssprop --uax-kpi-selected - Colour of the selection border. Defaults to `--uui-color-selected` in light and high contrast, and to malibu light in dark, where the UUI colour is under 3:1 on the surface.
 * @cssprop --uax-kpi-icon-fg - Icon colour. Defaults to space cadet, which passes 3:1 on the default square. A product that overrides either owns that contrast.
 */
@customElement("uax-kpi-tile")
export class UaxKpiTileElement extends UmbLitElement {
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
    deltaUnit: UaxDeltaUnit = "percent";

    /** Shows a fall as good (green) and a rise as bad (red), e.g. for refund rate. */
    @property({ type: Boolean, attribute: "lower-is-better" })
    lowerIsBetter = false;

    /** The product is fetching the value. */
    @property({ type: Boolean, reflect: true })
    loading = false;

    /**
     * Makes the tile a toggle button, so a row of tiles can switch a chart's metric. Pressing it raises a
     * cancelable `selected` or `deselected` event and then flips `selected`, unless the event was cancelled.
     * Follows `uui-card`, so product code reads the same.
     */
    @property({ type: Boolean, reflect: true })
    selectable = false;

    /** Draws the active state and reports `aria-pressed="true"`. Only has an effect while `selectable`. */
    @property({ type: Boolean, reflect: true })
    selected = false;

    /**
     * Whether pressing a selected tile deselects it. Set it to false (as a property) when exactly one tile
     * must stay selected: pressing the selected tile then raises `selected` again and changes nothing.
     */
    @property({ type: Boolean })
    deselectable = true;

    #toggle() {
        const deselecting = this.selected && this.deselectable;
        const event = new CustomEvent(deselecting ? "deselected" : "selected", { bubbles: true, cancelable: true, detail: {} });
        this.dispatchEvent(event);
        if (event.defaultPrevented) return;
        this.selected = !deselecting;
    }

    override render() {
        const hasValue = this.value !== undefined && this.value !== null && this.value !== "";
        const mode = getLoadingMode(this.loading, hasValue);

        const content = html`${this.icon
                ? html`<span class="icon" aria-hidden="true"><uui-icon name=${this.icon}></uui-icon></span>`
                : nothing}
            <span class="content" aria-busy=${this.loading ? "true" : "false"}>
                ${mode === "skeleton"
                    ? html`<uax-skeleton></uax-skeleton>`
                    : html`<span class="body">
                          <span class="label">${this.label}</span>
                          <span class="row">
                              ${hasValue ? html`<span class="value">${this.value}</span>` : nothing}
                              ${this.delta === undefined || this.delta === null
                                  ? nothing
                                  : html`<uax-delta-badge
                                        .value=${this.delta}
                                        .unit=${this.deltaUnit}
                                        .lowerIsBetter=${this.lowerIsBetter}></uax-delta-badge>`}
                          </span>
                      </span>`}
            </span>`;

        // A native button gives Enter and Space for free, and both arrive as one click.
        return this.selectable
            ? html`<button
                  type="button"
                  class="tile selectable"
                  aria-pressed=${this.selected ? "true" : "false"}
                  @click=${this.#toggle}>
                  ${content}<span class="select-border" aria-hidden="true"></span>
              </button>`
            : html`<div class="tile">${content}</div>`;
    }

    static override styles: CSSResultGroup = [
        UaxPaletteStyles,
        css`
            :host {
                display: block;
                height: 100%;
                /* Content height of a tile with the badge beside the value: the icon square. */
                --_uax-skeleton-height: 48px;
                /* Pink square with a dark glyph in every theme (series-2 is maroon in light, so a dark glyph
                   on it fails 3:1). Both palette colours are theme-independent: space-cadet on spanish-pink
                   is 12.5:1. A product that overrides either public name owns the 3:1 between them. */
                --_uax-kpi-icon-bg: var(--uax-kpi-icon-bg, var(--uui-palette-spanish-pink));
                --_uax-kpi-icon-fg: var(--uax-kpi-icon-fg, var(--uui-palette-space-cadet));
                --_uax-kpi-selected: var(
                    --uax-kpi-selected,
                    light-dark(var(--uui-color-selected), var(--uui-palette-malibu-light))
                );
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
                position: relative;
                margin: 0;
                width: 100%;
                text-align: inherit;
                font: inherit;
                color: inherit;
                cursor: pointer;
            }

            /* The selection border copies uui-card: 2px just outside the card, with a glow. */
            .select-border {
                position: absolute;
                z-index: 2;
                inset: -2px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 120ms;
            }

            .select-border::after {
                content: "";
                position: absolute;
                width: 100%;
                height: 100%;
                box-sizing: border-box;
                border: 2px solid var(--_uax-kpi-selected);
                border-radius: calc(var(--uui-border-radius-3) + 2px);
                box-shadow:
                    0 0 4px 0 var(--_uax-kpi-selected),
                    inset 0 0 2px 0 var(--_uax-kpi-selected);
            }

            button.tile[aria-pressed="true"] .select-border {
                opacity: 1;
            }

            button.tile[aria-pressed="false"]:hover .select-border {
                opacity: 0.33;
            }

            button.tile[aria-pressed="true"]:hover .select-border {
                opacity: 0.8;
            }

            @media (prefers-reduced-motion: no-preference) {
                button.tile[aria-pressed="false"]:hover .select-border::after {
                    animation: not-selected--hover 1.2s infinite;
                }

                button.tile[aria-pressed="true"]:hover .select-border::after {
                    animation: selected--hover 1.4s infinite;
                }
            }

            @keyframes not-selected--hover {
                0%,
                100% {
                    opacity: 0.66;
                }
                50% {
                    opacity: 1;
                }
            }

            @keyframes selected--hover {
                0%,
                100% {
                    opacity: 1;
                }
                50% {
                    opacity: 0.66;
                }
            }

            /* Same as uui-card: 3px wide and 3px off. */
            button.tile:focus-visible {
                outline: 3px solid var(--uui-color-focus);
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
                background: var(--_uax-kpi-icon-bg);
                color: var(--_uax-kpi-icon-fg);
                font-size: 20px;
            }

            .content {
                flex: 1;
                min-width: 0;
                min-height: var(--_uax-skeleton-height);
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
                display: block;
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
                display: block;
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
        "uax-kpi-tile": UaxKpiTileElement;
    }
}
