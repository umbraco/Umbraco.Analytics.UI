import { css, customElement, html, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiPaletteStyles } from "../../theme/index.js";

/**
 * A grey placeholder block shown while a data element loads for the first time. Internal: not exported.
 *
 * It fills the height its host declares with `--_uaui-skeleton-height`. Every data element must set that
 * on its own `:host` (so a nested element doesn't inherit an outer element's value), and use it as the
 * `min-height` of its loaded content so the switch to loaded doesn't jump. It is the content height:
 * a region with padding or a border must subtract those from the value it declares.
 * For a smaller block, such as a table row, give the element an inline `height` and `width`.
 * Its corners use `--_uaui-skeleton-radius` (default `var(--uui-border-radius)`). A host whose loaded marks have
 * other corners sets it on the skeleton itself, so the corners don't change when loading finishes.
 * Decorative, so hidden from assistive tech: the host sets `aria-busy` on its region instead.
 *
 * @element uaui-skeleton
 */
@customElement("uaui-skeleton")
export class UauiSkeletonElement extends UmbLitElement {
    override connectedCallback() {
        super.connectedCallback();
        this.setAttribute("aria-hidden", "true");
    }

    override render() {
        return html`<span class="block"></span>`;
    }

    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
        css`
            :host {
                display: block;
                box-sizing: border-box;
                height: var(--_uaui-skeleton-height, 100%);
                min-height: var(--uui-size-space-4);
            }

            .block {
                display: block;
                height: 100%;
                border-radius: var(--_uaui-skeleton-radius, var(--uui-border-radius));
                background-color: var(--uaui-color-tint-neutral);
                background-image: linear-gradient(
                    90deg,
                    transparent 0%,
                    color-mix(in srgb, var(--uui-color-surface) 55%, transparent) 50%,
                    transparent 100%
                );
                background-size: 800px 100%;
                background-repeat: no-repeat;
                animation: shimmer 1.2s linear infinite;
            }

            @keyframes shimmer {
                from {
                    background-position: -800px 0;
                }
                to {
                    background-position: 800px 0;
                }
            }

            @media (prefers-reduced-motion: reduce) {
                .block {
                    animation: none;
                    background-image: none;
                }
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-skeleton": UauiSkeletonElement;
    }
}
