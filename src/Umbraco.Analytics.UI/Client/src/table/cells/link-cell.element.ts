import { css, customElement, html, property, type CSSResultGroup, type TemplateResult } from "#platform/lit";
import { UauiLitElement } from "#platform/base-element";
import { asText } from "../internal/cell-values.js";
import { safeHref } from "../internal/safe-href.js";
import "../table-skeleton-cell.element.js";
import "../internal/table-secondary-line.element.js";
import type { UauiTableCellElement, UauiTableColumn } from "../types.js";

/**
 * A table cell that shows its value as a link. The `href` is the item's `column.meta.hrefKey` value. A missing or unsafe
 * URL (anything but `http:`, `https:`, `mailto:`, `tel:` or relative) shows the text without a link.
 * An optional second line, the item's `column.meta.secondaryKey` value, is plain muted text under it, never part of the link.
 * Its name is `UAUI_TABLE_CELL.link`, and it is usable on its own.
 *
 * @element uaui-link-cell
 */
@customElement("uaui-link-cell")
export class UauiLinkCellElement extends UauiLitElement implements UauiTableCellElement {
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
        const secondaryKey = this.column.meta?.secondaryKey;
        if (this.loading) return html`<uaui-table-skeleton-cell .align=${this.column.align ?? "start"} .lines=${secondaryKey ? 2 : 1}></uaui-table-skeleton-cell>`;
        const text = asText(this.value);
        const hrefKey = this.column.meta?.hrefKey;
        const href = hrefKey ? safeHref(this.item[hrefKey]) : undefined;
        const main = href ? html`<a href=${href}>${text}</a>` : html`${text}`;
        return secondaryKey
            ? html`<div>${main}</div><uaui-table-secondary-line .align=${this.column.align ?? "start"} .text=${asText(this.item[secondaryKey])}></uaui-table-secondary-line>`
            : main;
    }

    static override styles: CSSResultGroup = css`
        :host {
            display: block;
        }

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
