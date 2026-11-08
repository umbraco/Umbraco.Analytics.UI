import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "#platform/lit";
import { UauiLitElement } from "#platform/base-element";
import { parseIso } from "../../internal/date/date-math.js";

/**
 * One date field of the date range dialog: a label, a UUI date input and the message under it. It is
 * controlled: it shows `value` and raises `change` with what the editor typed, and the dialog decides what to
 * keep. The message is `error` when set, else "required" while the date is empty or half-typed. Internal: not exported.
 *
 * @element uaui-date-field
 * @fires change - The editor changed the date. Bubbles, not composed. Read the new date from the element's `value`.
 */
@customElement("uaui-date-field")
export class UauiDateFieldElement extends UauiLitElement {
    /** The field's name, which also names its message (`data-for`). Set as a property: it is not an attribute. */
    @property({ attribute: false })
    name = "";

    /** The field's label, as already translated text. */
    @property({ type: String })
    label = "";

    /** ISO date. Empty or half-typed has no value. */
    @property({ type: String })
    value = "";

    /** ISO date the field may not be after. */
    @property({ type: String })
    max = "";

    /** The message under the field. Takes the place of the "required" message. */
    @property({ type: String })
    error?: string;

    #onChange(e: Event) {
        // The input's own change would reach the dialog with the input as its target.
        e.stopPropagation();
        this.value = (e.target as HTMLInputElement).value;
        this.dispatchEvent(new Event("change", { bubbles: true }));
    }

    override render(): TemplateResult {
        const { name, error } = this;
        return html`<uui-form-layout-item>
            <uui-input
                type="date"
                name=${name}
                label=${this.label}
                .value=${this.value}
                .max=${this.max}
                ?error=${!!error}
                @change=${this.#onChange}></uui-input>
            ${error
                ? html`<div slot="message" class="error" data-for=${name} role="alert">${error}</div>`
                : !parseIso(this.value)
                  ? html`<div slot="message" class="error" data-for=${name}>${this.localize.term("validation_invalidEmpty")}</div>`
                  : nothing}
        </uui-form-layout-item>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: block;
        }

        uui-form-layout-item {
            margin: 0;
        }

        uui-input {
            width: 100%;
            /* The date picker follows the theme, as the backoffice's umb-input-date does */
        }

        .error {
            margin-top: var(--uui-size-space-1);
            font-size: var(--uui-type-small-size);
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-date-field": UauiDateFieldElement;
    }
}
