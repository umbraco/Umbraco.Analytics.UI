import { css, customElement, html, property, type CSSResultGroup } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../../internal/loading/skeleton.element.js";

/**
 * The placeholder in a table cell while the table loads for the first time: a grey block as tall as a loaded
 * row's content, so the switch to loaded rows doesn't jump. The table sets `--_uaui-table-content-height`,
 * `--_uaui-skeleton-height` and optionally `--_uaui-skeleton-width`, which wins over `width`. Internal: not exported.
 *
 * @element uaui-table-skeleton-cell
 */
@customElement("uaui-table-skeleton-cell")
export class UauiTableSkeletonCellElement extends UmbLitElement {
    /** The width of the block, as a percent of the cell. */
    @property({ type: Number })
    width = 50;

    /** Which side the block sits on. */
    @property({ type: String, reflect: true })
    align: "start" | "end" = "start";

    override render() {
        return html`<uaui-skeleton style="width: var(--_uaui-skeleton-width, ${this.width}%); height: var(--_uaui-skeleton-height)"></uaui-skeleton>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: flex;
            align-items: center;
            min-height: var(--_uaui-table-content-height);
        }

        :host([align="end"]) {
            justify-content: flex-end;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-table-skeleton-cell": UauiTableSkeletonCellElement;
    }
}
