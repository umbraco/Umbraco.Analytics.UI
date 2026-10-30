import { css, customElement, html, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

/**
 * A thin bar along the top edge of a data element that is reloading with data already shown.
 * Internal: not exported.
 *
 * It is positioned absolutely, so the host needs `position: relative` and the content doesn't shift.
 * Render it only while reloading (see `getLoadingMode`). Named "Loading" for assistive tech.
 *
 * @element uax-loading-bar
 */
@customElement("uax-loading-bar")
export class UaxLoadingBarElement extends UmbLitElement {
    override render() {
        return html`<div class="bar" role="progressbar" aria-label=${this.localize.term("general_loading")}>
            <div class="indicator"></div>
        </div>`;
    }

    static override styles: CSSResultGroup = [
        css`
            :host {
                display: block;
                position: absolute;
                inset: 0 0 auto 0;
                z-index: 1;
                pointer-events: none;
            }

            .bar {
                height: 3px;
                overflow: hidden;
                background-color: color-mix(in srgb, var(--uui-color-interactive) 20%, transparent);
            }

            .indicator {
                width: 30%;
                height: 100%;
                background-color: var(--uui-color-interactive);
                animation: slide 1.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }

            @keyframes slide {
                from {
                    transform: translateX(-100%);
                }
                to {
                    transform: translateX(333%);
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .indicator {
                    width: 100%;
                    animation: none;
                }
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-loading-bar": UaxLoadingBarElement;
    }
}
