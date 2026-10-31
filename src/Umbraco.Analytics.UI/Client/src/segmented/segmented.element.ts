import { css, customElement, html, ifDefined, property, repeat, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiPaletteStyles } from "../theme/index.js";

/** One choice of `uaui-segmented`: the `value` it reports and the `label` it shows. */
export type UauiSegmentedOption = { value: string; label: string };

/** The detail of the `change` event of `uaui-segmented`: the option the editor picked. */
export type UauiSegmentedChangeDetail = { value: string };

/**
 * A segmented control: a row of options where exactly one is selected, built as a radio group.
 *
 * Arrow keys move the selection and focus to the next or previous option, wrapping at the ends, as in
 * `uui-radio-group`. Only the selected option is in the tab order. Put it in a `uui-box`'s `header-actions` slot.
 *
 * @element uaui-segmented
 * @fires change - The editor picked a different option. Bubbles, not cancelable. `detail` is `{ value }` (`UauiSegmentedChangeDetail`).
 */
@customElement("uaui-segmented")
export class UauiSegmentedElement extends UmbLitElement {
    /** The selected option's `value`. Picking an option updates it, as `uui-radio-group` does, then raises `change`. */
    @property({ type: String, reflect: true })
    value = "";

    /** The options to show, in order. */
    @property({ attribute: false })
    options: UauiSegmentedOption[] = [];

    /** The accessible name of the group, read by screen readers. Not shown. */
    @property({ type: String })
    label = "";

    #select(value: string) {
        if (value === this.value) return;
        this.value = value;
        this.dispatchEvent(new CustomEvent<UauiSegmentedChangeDetail>("change", { bubbles: true, detail: { value } }));
    }

    #onKeydown(e: KeyboardEvent, index: number) {
        const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const length = this.options.length;
        const next = this.options[(index + step + length) % length].value;
        this.#select(next);
        // Selection follows focus, so move focus once the roving tabindex has rendered.
        this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLElement>(`[data-value="${CSS.escape(next)}"]`)?.focus());
    }

    override render(): TemplateResult {
        // With no selected option (a value that isn't in `options`), the first one takes the tab stop.
        const tabStop = this.options.some((o) => o.value === this.value) ? this.value : this.options[0]?.value;
        return html`<div class="group" role="radiogroup" aria-label=${ifDefined(this.label || undefined)}>
            ${repeat(
                this.options,
                (option) => option.value,
                (option, index) => html`<button
                    type="button"
                    role="radio"
                    data-value=${option.value}
                    aria-checked=${option.value === this.value ? "true" : "false"}
                    tabindex=${option.value === tabStop ? "0" : "-1"}
                    @click=${() => this.#select(option.value)}
                    @keydown=${(e: KeyboardEvent) => this.#onKeydown(e, index)}>
                    ${option.label}
                </button>`,
            )}
        </div>`;
    }

    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
        css`
            :host {
                display: inline-flex;
                /* Design's selected segment is space cadet. That vanishes on the dark surface, so dark uses malibu light. */
                --_uaui-segmented-selected-bg: light-dark(var(--uui-palette-space-cadet), var(--uui-palette-malibu-light));
                --_uaui-segmented-selected-fg: light-dark(var(--uui-palette-white), var(--uui-palette-space-cadet));
            }

            .group {
                display: inline-flex;
                box-sizing: border-box;
                height: 40px;
                padding: 3px;
                background: var(--uui-color-surface);
                border: 1px solid var(--uui-color-border-standalone);
                border-radius: var(--uui-border-radius-3);
            }

            button {
                appearance: none;
                border: none;
                margin: 0;
                padding: 0 var(--uui-size-space-4);
                background: transparent;
                color: var(--uui-color-text-alt);
                font: inherit;
                font-size: 13px;
                font-weight: 600;
                border-radius: var(--uui-border-radius-2);
                cursor: pointer;
                transition:
                    background 80ms,
                    color 80ms;
            }

            button:hover {
                color: var(--uui-color-text);
            }

            button[aria-checked="true"] {
                background: var(--_uaui-segmented-selected-bg);
                color: var(--_uaui-segmented-selected-fg);
            }

            button:focus-visible {
                outline: calc(2px * var(--uui-show-focus-outline, 1)) solid var(--uui-color-focus);
                outline-offset: 1px;
            }

            @media (prefers-reduced-motion: reduce) {
                button {
                    transition: none;
                }
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-segmented": UauiSegmentedElement;
    }
}
