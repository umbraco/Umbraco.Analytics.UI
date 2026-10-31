import { css, customElement, html, nothing, property, type CSSResultGroup, type PropertyValues, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { asIsoDay } from "../internal/cell-values.js";
import { getUtcDateFormat } from "../../internal/format/date-format.js";
import "../internal/table-skeleton-cell.element.js";
import type { UauiTableCellElement, UauiTableColumn } from "../types.js";

/** How a date cell formats its day when the column has no `dateFormat`. */
const DEFAULT_DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "medium" };

/**
 * A table cell that shows an ISO date (`yyyy-mm-dd`) as a date in the editor's culture, formatted with the column's
 * `dateFormat` (default `{ dateStyle: "medium" }`, e.g. "Jun 1, 2026", also used when `Intl` rejects the column's options). A date-time ("2026-06-01T23:30:00Z") is read
 * as its day, as written, so no timezone moves it to the day before or after. A missing value, or one that isn't a
 * real ISO date, shows nothing. Sort the column with `sortAs: "date"`. Search looks in the ISO value, not the shown
 * text. Its name is `UAUI_TABLE_CELL.date`, and it is usable on its own.
 *
 * @element uaui-date-cell
 */
@customElement("uaui-date-cell")
export class UauiDateCellElement extends UmbLitElement implements UauiTableCellElement {
    /** The column the cell is in. Its `dateFormat` formats the date. */
    @property({ attribute: false })
    column: UauiTableColumn = { key: "value", label: "" };

    /** The row the cell is in. */
    @property({ attribute: false })
    item: Record<string, unknown> = {};

    /** The ISO date or date-time to show. */
    @property({ attribute: false })
    value: unknown;

    /** Draws a placeholder instead of the value while the table loads. */
    @property({ type: Boolean })
    loading = false;

    #format?: { column: UauiTableColumn; lang: string; format: Intl.DateTimeFormat };

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const lang = this.localize.lang();
        // Resolved once per column and language, not per render: the cache key is built from the options.
        if (this.#format?.column !== this.column || this.#format.lang !== lang) {
            this.#format = { column: this.column, lang, format: getUtcDateFormat(lang, this.column.dateFormat ?? DEFAULT_DATE_FORMAT, DEFAULT_DATE_FORMAT) };
        }
    }

    override render(): TemplateResult | typeof nothing {
        if (this.loading) return html`<uaui-table-skeleton-cell .align=${this.column.align ?? "start"}></uaui-table-skeleton-cell>`;
        const day = asIsoDay(this.value);
        if (!day) return nothing;
        const [year, month, date] = day.split("-").map(Number);
        // Midnight UTC of the day, formatted in UTC, so the day is the one written whatever the browser's timezone.
        const text = this.#format!.format.format(new Date(Date.UTC(year, month - 1, date)));
        return html`<time datetime=${day}>${text}</time>`;
    }

    static override styles: CSSResultGroup = css`
        :host {
            font-variant-numeric: tabular-nums;
            white-space: nowrap;
        }
    `;
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-date-cell": UauiDateCellElement;
    }
}
