import { css, customElement, html, property, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../../internal/loading/skeleton.element.js";

/**
 * The placeholder in a table cell while the table loads for the first time: a grey block as tall as a loaded
 * row's content, so the switch to loaded rows doesn't jump. The table sets `--_uax-table-content-height` and
 * `--_uax-skeleton-height`. Internal: not exported.
 *
 * @element uax-table-skeleton-cell
 */
@customElement("uax-table-skeleton-cell")
export class UaxTableSkeletonCellElement extends UmbLitElement {
    /** The width of the block, as a percent of the cell. */
    @property({ type: Number })
    width = 50;

    /** Which side the block sits on. */
    @property({ type: String, reflect: true })
    align: "start" | "end" = "start";

    override render() {
        return html`<uax-skeleton style="width: ${this.width}%; height: var(--_uax-skeleton-height)"></uax-skeleton>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: flex;
            align-items: center;
            min-height: var(--_uax-table-content-height);
        }

        :host([align="end"]) {
            justify-content: flex-end;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-table-skeleton-cell": UaxTableSkeletonCellElement;
    }
}
