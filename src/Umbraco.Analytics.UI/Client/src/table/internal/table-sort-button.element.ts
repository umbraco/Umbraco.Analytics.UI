import { css, customElement, html, property, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";

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
export class UauiTableSortButtonElement extends UmbLitElement {
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
            align-items: center;
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
         * The chevron is drawn in the lower half of the symbol's box, and capitals sit above the middle of a line,
         * so a centred box still reads low next to uppercase labels. Nudge it up to match.
         */
        uui-symbol-sort {
            transform: translateY(-1.5px);
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
