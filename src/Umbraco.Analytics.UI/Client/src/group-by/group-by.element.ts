import { css, customElement, html, property, repeat, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UaxPaletteStyles } from "../theme/index.js";

export type UaxGroupBy = "day" | "week" | "month";

const allOptions: UaxGroupBy[] = ["day", "week", "month"];

const termKeys: Record<UaxGroupBy, string> = {
    day: "uaxAnalytics_groupByDay",
    week: "uaxAnalytics_groupByWeek",
    month: "uaxAnalytics_groupByMonth",
};

/**
 * Switches a chart between daily, weekly and monthly points: a segmented control that is a radio group.
 *
 * Arrow keys move the selection and focus to the next or previous option, wrapping at the ends, as in
 * `uui-radio-group`. Only the selected option is in the tab order. Put it in a `uui-box`'s `header-actions` slot.
 *
 * @element uax-group-by
 * @fires change - The editor picked a different option. Bubbles, not cancelable. `detail` is `{ value }`.
 */
@customElement("uax-group-by")
export class UaxGroupByElement extends UmbLitElement {
    /** The selected option. Picking an option updates it, as `uui-radio-group` does, then raises `change`. */
    @property({ type: String, reflect: true })
    value: UaxGroupBy = "day";

    /** The options to show, in order. Defaults to day, week and month. */
    @property({ attribute: false })
    options: UaxGroupBy[] = allOptions;

    #select(value: UaxGroupBy) {
        if (value === this.value) return;
        this.value = value;
        this.dispatchEvent(new CustomEvent("change", { bubbles: true, detail: { value } }));
    }

    #onKeydown(e: KeyboardEvent, index: number) {
        const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const length = this.options.length;
        const next = this.options[(index + step + length) % length];
        this.#select(next);
        // Selection follows focus, so move focus once the roving tabindex has rendered.
        this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLElement>(`[data-value="${next}"]`)?.focus());
    }

    override render() {
        // With no selected option (a value that isn't in `options`), the first one takes the tab stop.
        const tabStop = this.options.includes(this.value) ? this.value : this.options[0];
        return html`<div class="group" role="radiogroup" aria-label=${this.localize.term("uaxAnalytics_groupByLabel")}>
            ${repeat(
                this.options,
                (option) => option,
                (option, index) => html`<button
                    type="button"
                    role="radio"
                    data-value=${option}
                    aria-checked=${option === this.value ? "true" : "false"}
                    tabindex=${option === tabStop ? "0" : "-1"}
                    @click=${() => this.#select(option)}
                    @keydown=${(e: KeyboardEvent) => this.#onKeydown(e, index)}>
                    ${this.localize.term(termKeys[option])}
                </button>`,
            )}
        </div>`;
    }

    static override styles: CSSResultGroup = [
        UaxPaletteStyles,
        css`
            :host {
                display: inline-flex;
                /* Design's selected segment is space cadet. That vanishes on the dark surface, so dark uses malibu light. */
                --_uax-group-by-selected-bg: light-dark(var(--uui-palette-space-cadet), var(--uui-palette-malibu-light));
                --_uax-group-by-selected-fg: light-dark(var(--uui-palette-white), var(--uui-palette-space-cadet));
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
                background: var(--_uax-group-by-selected-bg);
                color: var(--_uax-group-by-selected-fg);
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
        "uax-group-by": UaxGroupByElement;
    }
}
