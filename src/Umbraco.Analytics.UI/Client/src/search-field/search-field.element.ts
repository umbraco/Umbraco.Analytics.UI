import { css, customElement, html, nothing, property, query, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import type { UUIInputElement, UUIInputEvent } from "@umbraco-cms/backoffice/external/uui";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

/** The detail of the `search` event of `uaui-search-field`: what the editor typed. Empty when the box was cleared. */
export type UauiSearchFieldDetail = {
    query: string;
};

/** How long typing has to stop before `search` is raised. */
const DEBOUNCE_MS = 300;

/**
 * A search box. It raises `search` with the text, 300ms after typing stops, and works anywhere a product filters
 * something. In a `uaui-data-table`'s `toolbar`, `toolbar-start` or `toolbar-<key>` slot the table picks the event up
 * and sets its own `query`, so there is nothing to wire for a `client` table. In `server` mode listen for `search`
 * and load the rows that match.
 *
 * Built like the picker search field of the CMS (`umb-picker-search-field`): a `uui-input` with the search icon in
 * its `prepend` slot and, once there is text, a compact clear button in `append`.
 *
 * @element uaui-search-field
 * @fires search - The text changed and typing stopped. Bubbles, not composed or cancelable, like `sort-change`. `detail` is `{ query }`. Clearing the box raises it at once.
 */
@customElement("uaui-search-field")
export class UauiSearchFieldElement extends UmbLitElement {
    /**
     * The text in the box. Typing updates it, as `uui-input` does. Setting it from code does not raise `search`:
     * a product that restores or clears it sets the table's `query` too.
     */
    @property({ type: String })
    value = "";

    @query("uui-input")
    private _input?: UUIInputElement;

    #timer?: ReturnType<typeof setTimeout>;

    override focus() {
        this._input?.focus();
    }

    override disconnectedCallback() {
        super.disconnectedCallback();
        clearTimeout(this.#timer);
    }

    #raise() {
        clearTimeout(this.#timer);
        this.dispatchEvent(new CustomEvent<UauiSearchFieldDetail>("search", { bubbles: true, detail: { query: this.value } }));
    }

    #onInput(event: UUIInputEvent) {
        event.stopPropagation();
        this.value = String(event.target.value ?? "");
        clearTimeout(this.#timer);
        this.#timer = setTimeout(() => this.#raise(), DEBOUNCE_MS);
    }

    #clear() {
        this.value = "";
        this.#raise();
        this._input?.focus();
    }

    override render(): TemplateResult {
        return html`<uui-input
            .value=${this.value}
            label=${this.localize.term("general_search")}
            placeholder=${this.localize.term("general_search")}
            @input=${this.#onInput}>
            <div slot="prepend">
                <uui-icon name="icon-search" aria-hidden="true"></uui-icon>
            </div>
            ${this.value
                ? html`<uui-button slot="append" type="button" compact label=${this.localize.term("general_clear")} @click=${this.#clear}>
                      <uui-icon name="icon-delete"></uui-icon>
                  </uui-button>`
                : nothing}
        </uui-input>`;
    }

    static override styles: CSSResultGroup = [
        css`
            :host {
                display: block;
                width: 100%;
                max-width: 260px;
            }

            uui-input {
                width: 100%;
            }

            /* The CMS picker search field: the icon is centred in the prepend slot. */
            uui-input [slot="prepend"] {
                display: flex;
                align-items: center;
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-search-field": UauiSearchFieldElement;
    }
}
