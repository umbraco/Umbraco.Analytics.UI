import { css, customElement, html, property, type CSSResultGroup } from "#platform/lit";
import { UauiLitElement } from "#platform/base-element";

/**
 * The button inside a sortable column header: the label (slotted) and a `uui-symbol-sort`, as in `umb-table`.
 * The symbol follows the label, except with `align="end"`, where it comes first so the label's edge lines up with the
 * column's values (the symbol takes its width even when it isn't drawn). It only draws and takes focus. The header cell around it carries `aria-sort` and handles the click, which
 * bubbles out of the native button. Internal: not exported.
 *
 * @element uaui-table-sort-button
 * @slot - The header label.
 */
@customElement("uaui-table-sort-button")
export class UauiTableSortButtonElement extends UauiLitElement {
    /** This column is the one the table is sorted by. */
    @property({ type: Boolean })
    active = false;

    /** The sort is descending. Only drawn while `active`. */
    @property({ type: Boolean })
    descending = false;

    /** Which side the label sits on. With `end` the symbol goes before the label, so the label ends flush with the column. */
    @property({ type: String, reflect: true })
    align: "start" | "end" = "start";

    override render() {
        return html`<button type="button">
            <span class="label"><slot></slot></span>
            <uui-symbol-sort ?active=${this.active} ?descending=${this.active && this.descending}></uui-symbol-sort>
        </button>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: block;
        }

        :host(:hover),
        :host(:focus-within) {
            --uui-symbol-sort-hover: 1;
        }

        button {
            display: inline-flex;
            /* Baseline, not center: the symbol is placed from the label's baseline (see uui-symbol-sort below). */
            align-items: baseline;
            justify-content: flex-start;
            gap: var(--uui-size-1);
            width: 100%;
            padding: var(--uui-size-3) 0;
            border: none;
            border-radius: var(--uui-border-radius);
            background: transparent;
            color: inherit;
            cursor: pointer;
            font: inherit;
            letter-spacing: inherit;
            text-transform: inherit;
            text-align: inherit;
        }

        /*
         * Puts the visible chevron's middle level with the middle of the label's capitals, at any font size and in
         * any font. uui-symbol-sort draws each chevron in a 24px-tall SVG but positions it in em, so the chevron's
         * middle sits 12px - 0.8em below the middle of the symbol's 1em box (3.2px at a table header's 11px, none
         * at 15px); centring the box doesn't move the drawing. With baseline alignment the box's bottom is on the
         * label's baseline (it has no baseline of its own), so its middle is 0.5em above it and the chevron's
         * middle is 1.3em - 12px above it. This moves that to half the cap height above the baseline.
         *
         * The chevron path (y 9 to 17 of 24) also sits one viewBox unit below the SVG's middle, and the descending
         * one is the same SVG rotated, so it sits one unit above: 0.0375em (0.9em / 24) either way, taken off here.
         */
        uui-symbol-sort {
            transform: translateY(calc(1.3em - 12px - 0.5cap - 0.0375em));
        }

        uui-symbol-sort[descending] {
            transform: translateY(calc(1.3em - 12px - 0.5cap + 0.0375em));
        }

        :host([align="end"]) button {
            justify-content: flex-end;
        }

        /*
         * The symbol always takes its width, drawn or not. After the label of an end-aligned column it would push the
         * label left of the column's values, so it goes before the label: the label ends where the values end.
         */
        :host([align="end"]) uui-symbol-sort {
            order: -1;
        }

        button:focus-visible {
            outline: calc(2px * var(--uui-show-focus-outline, 1)) solid var(--uui-color-focus);
            outline-offset: -2px;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-table-sort-button": UauiTableSortButtonElement;
    }
}
