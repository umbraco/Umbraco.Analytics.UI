import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

/**
 * Tells the editor the data could not be loaded, with an optional Retry button.
 *
 * The chart and table show it when their `error` is set, and a product can place it on its own. The KPI tile shows
 * a dash instead, with no Retry. It is the sibling of
 * `uax-empty-state`: same layout, with an alert icon. Without `headline` or `description` it shows the built-in
 * "Something went wrong" / "The data could not be loaded." text. The text is announced when it appears (`role="alert"`).
 * Set an attribute to an empty string to leave that line out.
 *
 * @element uax-error-state
 * @fires retry - The Retry button was pressed. Bubbles, is not composed. Only shown while `retryable`.
 */
@customElement("uax-error-state")
export class UaxErrorStateElement extends UmbLitElement {
    /** The main line. Defaults to the translation of "Something went wrong". An empty string hides it. */
    @property({ type: String })
    headline?: string;

    /** The line under the headline. Defaults to the translation of "The data could not be loaded.". An empty string hides it. */
    @property({ type: String })
    description?: string;

    /** Name of a backoffice icon, shown in a circle above the text. */
    @property({ type: String })
    icon = "icon-alert";

    /** Shows a Retry button that raises `retry`. Leave it off when nothing listens. */
    @property({ type: Boolean })
    retryable = false;

    #retry = () => {
        this.dispatchEvent(new Event("retry", { bubbles: true }));
    };

    override render(): TemplateResult {
        const headline = this.headline ?? this.localize.term("uaxAnalytics_errorHeadline");
        const description = this.description ?? this.localize.term("uaxAnalytics_errorDescription");

        return html`<div class="error" role="alert">
            <div class="icon"><uui-icon name=${this.icon}></uui-icon></div>
            ${headline ? html`<div class="headline">${headline}</div>` : nothing}
            ${description ? html`<p>${description}</p>` : nothing}
            ${this.retryable
                ? html`<uui-button look="outline" label=${this.localize.term("general_retry")} @click=${this.#retry}></uui-button>`
                : nothing}
        </div>`;
    }

    static override styles: CSSResultGroup = [
        css`
            :host {
                display: block;
            }

            .error {
                padding: 48px var(--uui-size-space-6);
                text-align: center;
                color: var(--uui-color-text-alt);
            }

            .icon {
                box-sizing: border-box;
                width: 56px;
                height: 56px;
                margin: 0 auto var(--uui-size-space-4);
                border-radius: 50%;
                background: var(--uui-color-surface-alt);
                color: var(--uui-color-danger);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 28px;
            }

            .headline {
                margin: 0 0 var(--uui-size-space-1);
                font-size: 14px;
                font-weight: 700;
                color: var(--uui-color-text);
            }

            p {
                margin: 0;
                font-size: 13px;
            }

            uui-button {
                margin-top: var(--uui-size-space-4);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-error-state": UaxErrorStateElement;
    }
}
