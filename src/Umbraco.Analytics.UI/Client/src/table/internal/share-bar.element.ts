import { css, customElement, html, property, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UaxPaletteStyles, type UaxColorSlot } from "../../theme/index.js";

/**
 * The thin bar under a share value: a filled part on a neutral track. Decorative, so hidden from assistive
 * tech. Internal: not exported.
 *
 * @element uax-share-bar
 */
@customElement("uax-share-bar")
export class UaxShareBarElement extends UmbLitElement {
    /** How much of the track is filled, 0 to 100. */
    @property({ type: Number })
    percent = 0;

    /** The palette slot of the bar (1 to 4). */
    @property({ type: Number })
    color: UaxColorSlot = 1;

    override render() {
        return html`<div class="track" aria-hidden="true">
            <div class="share-bar" style="width: ${this.percent}%; background-color: var(--uax-color-series-${this.color})"></div>
        </div>`;
    }

    static override styles: CSSResultGroup = [
        UaxPaletteStyles,
        css`
            :host {
                display: block;
            }

            .track {
                height: 4px;
                border-radius: 999px;
                background-color: var(--uax-color-tint-neutral);
                overflow: hidden;
            }

            .share-bar {
                height: 100%;
                border-radius: 999px;
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-share-bar": UaxShareBarElement;
    }
}
