import { css, customElement, html, ifDefined, property, type CSSResultGroup, type TemplateResult } from "#platform/lit";
import { UauiLitElement } from "#platform/base-element";

/**
 * The muted second line under a table cell's value (`meta.secondaryKey`): smaller, one line, cut with an ellipsis, the
 * full text as its `title`. It keeps its height when empty, so rows with and without one are the same height.
 * Internal: not exported.
 *
 * @element uaui-table-secondary-line
 */
@customElement("uaui-table-secondary-line")
export class UauiTableSecondaryLineElement extends UauiLitElement {
    /** The text to show. */
    @property({ type: String })
    text = "";

    /** Which side of the cell the line sits on. Use the column's `align`. */
    @property({ type: String, reflect: true })
    align: "start" | "end" = "start";

    override render(): TemplateResult {
        return html`<span class="text" title=${ifDefined(this.text || undefined)}>${this.text}</span>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: block;
            height: var(--_uaui-table-secondary-line, 16px);
            font-size: 12px;
            line-height: var(--_uaui-table-secondary-line, 16px);
            color: var(--uui-color-text-alt);
        }

        /* In an end-aligned column the capped line sits at the end, under the main line's end. */
        :host([align="end"]) .text {
            width: fit-content;
            margin-inline-start: auto;
        }

        /* Capped, as a nowrap line would otherwise stretch its column to the full text. */
        .text {
            display: block;
            max-width: 30em;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            overflow-wrap: normal;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-table-secondary-line": UauiTableSecondaryLineElement;
    }
}
