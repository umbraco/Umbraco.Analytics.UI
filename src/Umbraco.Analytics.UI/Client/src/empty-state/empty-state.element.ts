import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

/**
 * Tells the editor there is nothing to show, e.g. a chart or table with no rows.
 *
 * The data elements use it when they have no data, and a product can place it on its own.
 * Without `headline` or `description` it shows the built-in "No data yet" / "Try a wider date range." text.
 * The headline is styled text, not a heading element, so it fits under whatever heading the host box has.
 * Set an attribute to an empty string to leave that line out.
 *
 * @element uaui-empty-state
 */
@customElement("uaui-empty-state")
export class UauiEmptyStateElement extends UmbLitElement {
    /** The main line. Defaults to the translation of "No data yet". An empty string hides it. */
    @property({ type: String })
    headline?: string;

    /** The line under the headline. Defaults to the translation of "Try a wider date range.". An empty string hides it. */
    @property({ type: String })
    description?: string;

    /** Name of a backoffice icon, shown in a circle above the text. */
    @property({ type: String })
    icon = "icon-search";

    override render(): TemplateResult {
        const headline = this.headline ?? this.localize.term("uauiAnalytics_emptyHeadline");
        const description = this.description ?? this.localize.term("uauiAnalytics_emptyDescription");

        return html`<div class="empty">
            <div class="icon"><uui-icon name=${this.icon}></uui-icon></div>
            ${headline ? html`<div class="headline">${headline}</div>` : nothing}
            ${description ? html`<p>${description}</p>` : nothing}
        </div>`;
    }

    static override styles: CSSResultGroup = [
        css`
            :host {
                display: block;
            }

            .empty {
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
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-empty-state": UauiEmptyStateElement;
    }
}
