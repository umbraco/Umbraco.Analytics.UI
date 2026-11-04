import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiVisuallyHiddenStyles } from "../a11y/visually-hidden.css.js";
import type { UauiFigureText } from "../format/figure.js";

/**
 * The number text of a `uaui-kpi-tile` or `uaui-stat`. A compact figure ("€1.23M") is drawn for the eye and hidden from
 * assistive tech, which reads the exact amount from visually hidden text instead; hovering the compact text shows the
 * exact amount as its title. The title sits on the hidden-from-assistive-tech text, so a screen reader doesn't announce
 * it a second time as a description. Font size and weight come from the parent. `figure` is a property only (no
 * attribute form). Internal: not exported.
 *
 * @element uaui-figure-value
 */
@customElement("uaui-figure-value")
export class UauiFigureValueElement extends UmbLitElement {
    /** What to show: the text, and the exact amount when the text is a compact form of it. */
    @property({ attribute: false })
    figure?: UauiFigureText;

    override render(): TemplateResult | typeof nothing {
        const figure = this.figure;
        if (!figure) return nothing;
        if (figure.exact === undefined) return html`${figure.text}`;
        return html`<span aria-hidden="true" title=${figure.exact}>${figure.text}</span><span class="visually-hidden">${figure.exact}</span>`;
    }

    static override styles: CSSResultGroup = [
        UauiVisuallyHiddenStyles,
        css`
            :host {
                /* Clips the visually hidden exact amount. */
                position: relative;
            }

            /* Selecting the value copies the shown text, not the exact amount after it. Screen readers don't use selection. */
            .visually-hidden {
                user-select: none;
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-figure-value": UauiFigureValueElement;
    }
}
