import { css, customElement, html, nothing, property, type CSSResultGroup, type TemplateResult } from "#platform/lit";
import { UauiLitElement } from "#platform/base-element";
import "../internal/loading/skeleton.element.js";

/**
 * The placeholder in a table cell while the table loads for the first time. The built-in cells use it, and a custom cell can
 * too, drawn in the shape of its loaded content so the switch to loaded rows doesn't jump. One line (the default) matches a
 * cell whose content is a single 20px line, `lines` of `2` adds a 16px second line, for a cell with 12px muted text under
 * its value (see `meta.secondaryKey`). Set `align` to the column's `align`.
 *
 * @element uaui-table-skeleton-cell
 */
@customElement("uaui-table-skeleton-cell")
export class UauiTableSkeletonCellElement extends UauiLitElement {
    /**
     * The width of the first block, as a percent of the cell. A second block is 70% of it. The table sets its own width per
     * row, which wins, so this only matters outside a table.
     * @internal
     */
    @property({ type: Number })
    width = 50;

    /** Which side the blocks sit on. Use the column's `align`. */
    @property({ type: String, reflect: true })
    align: "start" | "end" = "start";

    /** How many lines to draw: `1` for a cell's value, `2` when it has a second line under it. Any other value is read as `1`. */
    @property({ type: Number })
    lines: 1 | 2 = 1;

    override render(): TemplateResult {
        return html`<div class="line">
                <uaui-skeleton style="width: var(--_uaui-skeleton-width, ${this.width}%); height: var(--_uaui-skeleton-height, 14px)"></uaui-skeleton>
            </div>
            ${this.lines === 2
                ? html`<div class="line secondary">
                      <uaui-skeleton style="width: calc(var(--_uaui-skeleton-width, ${this.width}%) * 0.7); "></uaui-skeleton>
                  </div>`
                : nothing}`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: flex-start;
            min-height: var(--_uaui-table-content-height);
        }

        :host([align="end"]) {
            align-items: flex-end;
        }

        .line {
            display: flex;
            align-items: center;
            width: 100%;
            height: var(--_uaui-table-line, 20px);
        }

        :host([align="end"]) .line {
            justify-content: flex-end;
        }

        .secondary {
            height: var(--_uaui-table-secondary-line, 16px);
        }

        /* The second block is a fixed 10px, as the 12px text it stands in for. */
        .secondary uaui-skeleton {
            height: 10px;
            min-height: 0;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-table-skeleton-cell": UauiTableSkeletonCellElement;
    }
}
