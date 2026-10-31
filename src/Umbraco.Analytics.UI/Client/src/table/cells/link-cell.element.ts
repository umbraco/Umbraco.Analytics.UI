import { css, customElement, html, property, type CSSResultGroup, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { asText } from "../internal/cell-values.js";
import { safeHref } from "../internal/safe-href.js";
import "../internal/table-skeleton-cell.element.js";
import type { UauiTableCellElement, UauiTableColumn } from "../types.js";

/**
 * A table cell that shows its value as a link. The `href` is the item's `column.meta.hrefKey` value. A missing or unsafe
 * URL (anything but `http:`, `https:`, `mailto:`, `tel:` or relative) shows the text without a link.
 * Its name is `UAUI_TABLE_CELL.link`, and it is usable on its own.
 *
 * @element uaui-link-cell
 */
@customElement("uaui-link-cell")
export class UauiLinkCellElement extends UmbLitElement implements UauiTableCellElement {
    /** The column the cell is in. Its `meta.hrefKey` names the key in `item` that holds the URL. */
    @property({ attribute: false })
    column: UauiTableColumn = { key: "value", label: "" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The link text. */
    @property({ attribute: false })
    value: unknown;

    /** Draws a placeholder instead of the value while the table loads. */
    @property({ type: Boolean })
    loading = false;

    override render(): TemplateResult {
        if (this.loading) return html`<uaui-table-skeleton-cell .align=${this.column.align ?? "start"}></uaui-table-skeleton-cell>`;
        const text = asText(this.value);
        const hrefKey = this.column.meta?.hrefKey;
        const href = hrefKey ? safeHref(this.item[hrefKey]) : undefined;
        return href ? html`<a href=${href}>${text}</a>` : html`${text}`;
    }

    static override styles: CSSResultGroup = css`
        a {
            color: var(--uui-color-interactive);
            text-decoration: none;
            border-radius: var(--uui-border-radius);
        }

        a:hover {
            color: var(--uui-color-interactive-emphasis);
            text-decoration: underline;
        }

        a:focus-visible {
            outline: calc(2px * var(--uui-show-focus-outline, 1)) solid var(--uui-color-focus);
            outline-offset: 2px;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-link-cell": UauiLinkCellElement;
    }
}
