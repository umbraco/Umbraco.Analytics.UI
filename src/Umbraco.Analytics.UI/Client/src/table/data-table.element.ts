import {
    css,
    customElement,
    html,
    ifDefined,
    nothing,
    property,
    type CSSResultGroup,
    type PropertyValues,
    type TemplateResult,
} from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "../delta-badge/delta-badge.element.js";
import "../empty-state/empty-state.element.js";
import { getLoadingMode } from "../internal/loading/loading-mode.js";
import "../internal/loading/loading-bar.element.js";
import "../internal/loading/skeleton.element.js";
import { uaxThemeTokens } from "../internal/theme/tokens.css.js";
import { asNumber, asText, getNumberFormat } from "./internal/number-format.js";
import { safeHref } from "./internal/safe-href.js";
import type { UaxTableColumn, UaxTableMode, UaxTablePageChangeDetail, UaxTableSort } from "./types.js";

type UaxTableRow = Record<string, unknown>;

/** A column with everything the cells need, worked out once per change of columns, rows or language. */
interface DerivedColumn {
    column: UaxTableColumn;
    align: "start" | "end";
    /** `number`, `percent` and `share` columns: the value. */
    format?: Intl.NumberFormat;
    /** `share` columns: the percent of the column total. */
    shareFormat?: Intl.NumberFormat;
    /** `share` columns: the palette slot of the bar. */
    color: 1 | 2 | 3 | 4;
    /** `share` columns: the sum and the largest of the column's values. */
    total: number;
    max: number;
}

interface DerivedFrom {
    columns: UaxTableColumn[];
    rows: UaxTableRow[];
    compareRows: UaxTableRow[];
    rowKey?: string;
    totals?: Record<string, number>;
    maxes?: Record<string, number>;
    lang: string;
}

/** The page sizes the footer offers. The first is also the size under which a table never needs a footer. */
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

function isNumeric(column: UaxTableColumn): boolean {
    return column.type === "number" || column.type === "percent" || column.type === "share";
}

/** A row's identity for matching: strings and numbers only. Anything else never matches. */
function rowIdentity(value: unknown): string | undefined {
    return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

const collators = new Map<string, Intl.Collator>();
/** A collator for the language, built once: `localeCompare` builds one per comparison, too slow for hundreds of rows. */
function getCollator(lang: string): Intl.Collator {
    let collator = collators.get(lang);
    if (!collator) {
        collator = new Intl.Collator(lang, { sensitivity: "base" });
        collators.set(lang, collator);
    }
    return collator;
}

const SKELETON_ROWS = 5;
/** Widths of the skeleton blocks, varied by row so the placeholder doesn't look like a grid of equal bars. */
const SKELETON_WIDTHS = [72, 54, 83, 47, 65];

const shareFormatOptions: Intl.NumberFormatOptions = { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 };
const percentFormatOptions: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 1 };

/**
 * A table of rows, with columns that show their values as text, links, numbers, percentages or a
 * share of the column total with a bar.
 *
 * Built on `uui-table`, so it looks like the backoffice's own tables. Put it in a `uui-box` with
 * `--uui-box-default-padding: 0` so it runs edge to edge: the cells pad themselves, and the toolbar
 * slot pads itself with `--uax-table-padding`.
 *
 * Values are raw numbers. They are formatted in the editor's culture, with the column's `valueFormat`.
 * A `share` column shows the value, its percent of the column's total, and a thin bar scaled to the
 * column's largest value. The first share column uses the palette slot `--uax-series-1`, the second
 * `--uax-series-2` and so on, unless the column sets `color`.
 *
 * Pass last period's rows in `compare-rows` and name the column that identifies a row in `row-key` to
 * show a small change badge after each share value. A row with no matching compare row, or a compare
 * value of zero, shows no badge. Without a `row-key` there are no badges.
 *
 * While `loading` is set it shows skeleton rows on first load, or keeps the old rows under a loading
 * bar when reloading. With no rows it shows `uax-empty-state` under the header. Replace `rows` and
 * `columns` (and `compare-rows`) with new arrays to update the table: changing one in place isn't noticed.
 *
 * Give a column `sortable` to make its header a button. Clicking it sets `sort` and raises `sort-change`
 * with `{ key, direction }`: the first click on a column sorts numbers descending and text ascending, and
 * clicking the sorted column flips it. In `client` mode (the default) the table also sorts the rows it's
 * given, keeping equal rows in their order and empty values last. In `server` mode it never reorders:
 * the product sorts and passes new `rows`. Shares stay a share of the whole column either way.
 *
 * The footer shows "Show rows" (10, 25, 50 or 100), the range ("1–10 of 272") and previous and next
 * buttons, and is hidden when the rows fit the smallest page size. In `client` mode the table pages the
 * (sorted) rows itself. In `server` mode it draws the `rows` it's given as the current page, reads the
 * row count from `total`, and the product loads the new page when `page-change` is raised. Either way the
 * table sets its own `page` and `page-size` when the editor changes them, and goes back to page 1 when a
 * header is clicked. In `server` mode that sort is a `sort-change` for the product to load, not a `page-change`.
 *
 * Shares and bars are worked out from the `rows` the table holds: all of them in `client` mode, but only
 * the current page in `server` mode. Pass `totals` (the column's total across every page) so a share is
 * still a share of the whole, and `maxes` (the column's largest value across every page) so bars
 * keep one scale from page to page.
 *
 * @element uax-data-table
 * @fires sort-change - A sortable header was clicked, by pointer or keyboard. Bubbles, not composed or cancelable, like `uax-group-by`. `detail` is `{ key, direction }`; the table has already set `sort` to it and reset `page` to 1, so a `server` product loads page 1 and resets its own page binding.
 * @fires page-change - The editor picked another page or page size. Bubbles, not composed or cancelable, like `sort-change`. `detail` is `{ page, pageSize }`; the table has already set `page` and `pageSize`. A new page size goes back to page 1.
 * @slot toolbar - Content above the header row, such as a search box and totals. It pads itself with `--uax-table-padding`.
 * @cssprop --uax-table-padding - Padding around the `toolbar` slot, as a CSS `padding` value. Defaults to `12px 24px`. The loading bar ignores it and spans the full width at the top edge.
 * @cssprop --uax-series-1 - Bar colour of the first share column. Also `--uax-series-2` to `--uax-series-4` for the other slots.
 * @cssprop --uax-tint-neutral - Colour of the track behind a share bar.
 */
@customElement("uax-data-table")
export class UaxDataTableElement extends UmbLitElement {
    /** The columns, left to right. */
    @property({ attribute: false })
    columns: UaxTableColumn[] = [];

    /** The rows. Each column reads its value from the row's `key`. */
    @property({ attribute: false })
    rows: Record<string, unknown>[] = [];

    /** Last period's rows. Each is matched to a row in `rows` by its `rowKey` value. */
    @property({ attribute: false })
    compareRows: Record<string, unknown>[] = [];

    /** The key in each row, and compare row, that identifies it, such as a URL. Without it no compare badges are shown. */
    @property({ type: String, attribute: "row-key" })
    rowKey?: string;

    /** Shows skeleton rows on first load, or a loading bar over the old rows when reloading. */
    @property({ type: Boolean, reflect: true })
    loading = false;

    /** Headline of the empty state. Defaults to the translation of "No data yet". */
    @property({ type: String, attribute: "empty-headline" })
    emptyHeadline?: string;

    /** Description of the empty state. Defaults to the translation of "Try a wider date range.". */
    @property({ type: String, attribute: "empty-description" })
    emptyDescription?: string;

    /** The column the rows are sorted by. Set by the product, and by the table itself when a header is clicked. */
    @property({ attribute: false })
    sort?: UaxTableSort;

    /** `client` sorts the rows itself. `server` only raises `sort-change`, and the product passes the sorted rows. */
    @property({ type: String })
    mode: UaxTableMode = "client";

    /** The page shown, starting at 1. Set by the product, and by the table itself when the editor pages. A page past the last one shows the last. */
    @property({ type: Number })
    page = 1;

    /** Rows per page. The footer offers 10, 25, 50 and 100, and adds this size to the list when it's another number. */
    @property({ type: Number, attribute: "page-size" })
    pageSize = DEFAULT_PAGE_SIZE;

    /** `server` mode: how many rows there are across every page. `client` mode counts `rows` and ignores this. */
    @property({ type: Number })
    total?: number;

    /**
     * Each `share` column's total across every page, by column `key`: the number a share is a percent of,
     * not a total the table shows. Without an entry the total is the sum of the `rows` the table holds.
     */
    @property({ attribute: false })
    totals?: Record<string, number>;

    /**
     * Each `share` column's largest value across every page, by column `key`: what a full bar stands for.
     * Without an entry the largest value in the `rows` the table holds is a full bar.
     */
    @property({ attribute: false })
    maxes?: Record<string, number>;

    #derived: DerivedColumn[] = [];
    #sorted?: { rows: UaxTableRow[]; sort: UaxTableSort; column: UaxTableColumn; lang: string; sortedRows: UaxTableRow[] };
    #derivedFrom?: DerivedFrom;
    /** The compare rows by their `rowKey` value, rebuilt when `compareRows` or `rowKey` change. */
    #compareByKey = new Map<string, UaxTableRow>();

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const lang = this.localize.lang();
        const prev = this.#derivedFrom;
        if (!prev || prev.compareRows !== this.compareRows || prev.rowKey !== this.rowKey) {
            this.#compareByKey = this.#indexCompareRows(this.compareRows, this.rowKey);
        }
        if (
            !prev ||
            prev.columns !== this.columns ||
            prev.rows !== this.rows ||
            prev.totals !== this.totals ||
            prev.maxes !== this.maxes ||
            prev.lang !== lang
        ) {
            this.#derived = this.#derive(this.columns, this.#statsRows, lang);
        }
        this.#derivedFrom = { columns: this.columns, rows: this.rows, compareRows: this.compareRows, rowKey: this.rowKey, totals: this.totals, maxes: this.maxes, lang };
    }

    #indexCompareRows(compareRows: UaxTableRow[], rowKey?: string): Map<string, UaxTableRow> {
        const byKey = new Map<string, UaxTableRow>();
        if (!rowKey) return byKey;
        for (const row of compareRows) {
            const key = rowIdentity(row[rowKey]);
            if (key !== undefined) byKey.set(key, row);
        }
        return byKey;
    }

    /** The percent change from the matching compare row's value, or undefined when there is nothing to compare or divide by. */
    #changeFor(column: UaxTableColumn, row: UaxTableRow, value: number): number | undefined {
        if (!this.rowKey) return undefined;
        const key = rowIdentity(row[this.rowKey]);
        const compareRow = key === undefined ? undefined : this.#compareByKey.get(key);
        const compare = compareRow ? asNumber(compareRow[column.key]) : undefined;
        return compare === undefined || compare === 0 ? undefined : ((value - compare) / Math.abs(compare)) * 100;
    }

    /**
     * The rows that column totals and bar scales are worked out from: all the rows the table holds, never
     * just the page on screen. In `server` mode that is the page the product passed, unless `totals` and `maxes` say more.
     */
    get #statsRows(): UaxTableRow[] {
        return this.rows;
    }

    /** The rows to draw: the sorted rows, cut down to the current page in client mode. Searching will narrow this. */
    get #visibleRows(): UaxTableRow[] {
        const rows = this.#sortedRows;
        if (this.mode !== "client") return rows;
        const size = this.#pageSize;
        const start = (this.#currentPage - 1) * size;
        return rows.slice(start, start + size);
    }

    /** `pageSize`, or the default when it isn't a whole number of at least 1. */
    get #pageSize(): number {
        const size = Math.floor(this.pageSize);
        return Number.isFinite(size) && size >= 1 ? size : DEFAULT_PAGE_SIZE;
    }

    /** How many rows there are across every page. */
    get #totalRows(): number {
        if (this.mode !== "server") return this.rows.length;
        const total = asNumber(this.total);
        return total === undefined ? this.rows.length : Math.max(0, Math.floor(total));
    }

    get #pageCount(): number {
        return Math.max(1, Math.ceil(this.#totalRows / this.#pageSize));
    }

    /** `page`, kept between the first page and the last. */
    get #currentPage(): number {
        const page = Math.floor(this.page);
        return Number.isFinite(page) ? Math.min(Math.max(page, 1), this.#pageCount) : 1;
    }

    /** The footer has nothing to offer when the rows fit the smallest size: even the smallest choice wouldn't make a second page. */
    get #showPager(): boolean {
        return this.#totalRows > Math.min(this.#pageSize, PAGE_SIZES[0]);
    }

    /** The page sizes to offer: the standard ones, plus the current size when it's another number. */
    get #pageSizeOptions(): number[] {
        const size = this.#pageSize;
        return PAGE_SIZES.includes(size) ? PAGE_SIZES : [...PAGE_SIZES, size].sort((a, b) => a - b);
    }

    /** Sets the page and size the editor chose, then raises `page-change` so a product can load them. */
    #changePage(page: number, pageSize: number) {
        this.page = page;
        this.pageSize = pageSize;
        this.dispatchEvent(new CustomEvent<UaxTablePageChangeDetail>("page-change", { bubbles: true, detail: { page, pageSize } }));
    }

    /**
     * Moves one page. When that disables the button that has focus (the last or first page), focus moves to the
     * other nav button so a keyboard user isn't dropped. `uui-pagination` loses focus there.
     */
    async #step(by: 1 | -1) {
        const button = this.renderRoot.querySelector<HTMLElement>(by === 1 ? ".next" : ".previous");
        const hadFocus = !!button?.matches(":focus-within");
        this.#changePage(this.#currentPage + by, this.#pageSize);
        if (!hadFocus) return;
        await this.updateComplete;
        const atEnd = by === 1 ? this.#currentPage >= this.#pageCount : this.#currentPage <= 1;
        if (atEnd) this.renderRoot.querySelector<HTMLElement>(by === 1 ? ".previous" : ".next")?.focus();
    }

    #onPageSizeChange(event: Event) {
        const size = Number((event.target as HTMLElement & { value: string }).value);
        if (!Number.isInteger(size) || size < 1 || size === this.#pageSize) return;
        this.#changePage(1, size);
    }

    /** `rows` in the `sort` order in client mode, sorted once per change of rows, sort or language. Never reorders `rows` itself. */
    get #sortedRows(): UaxTableRow[] {
        const sort = this.mode === "client" ? this.sort : undefined;
        const column = sort ? this.columns.find((c) => c.key === sort.key) : undefined;
        if (!sort || !column) return this.rows;
        const lang = this.localize.lang();
        const cached = this.#sorted;
        if (cached && cached.rows === this.rows && cached.sort === sort && cached.lang === lang && cached.column === column) return cached.sortedRows;
        const numeric = isNumeric(column);
        const collator = getCollator(lang);
        const sign = sort.direction === "desc" ? -1 : 1;
        const sortedRows = [...this.rows].sort((a, b) => {
            const x = numeric ? asNumber(a[column.key]) : asText(a[column.key]) || undefined;
            const y = numeric ? asNumber(b[column.key]) : asText(b[column.key]) || undefined;
            // Empty values go last in both directions, so only real values flip with the sign.
            if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? 1 : -1;
            return sign * (typeof x === "number" && typeof y === "number" ? x - y : collator.compare(String(x), String(y)));
        });
        this.#sorted = { rows: this.rows, sort, lang, column, sortedRows };
        return sortedRows;
    }

    /** The first click on a column sorts numbers biggest first and text A to Z. Later clicks flip the direction. */
    #sortBy(column: UaxTableColumn) {
        const current = this.sort;
        const direction = current?.key === column.key ? (current.direction === "asc" ? "desc" : "asc") : isNumeric(column) ? "desc" : "asc";
        this.sort = { key: column.key, direction };
        this.page = 1;
        this.dispatchEvent(new CustomEvent("sort-change", { bubbles: true, detail: { key: column.key, direction } }));
    }

    /** Whether anything is slotted into `toolbar`. `:host(:has())` can't tell, and a slot can't be styled by its content. */
    get #hasToolbar(): boolean {
        return this.querySelector(':scope > [slot="toolbar"]') !== null;
    }

    /** How many skeleton rows to draw on first load. */
    get #skeletonRowCount(): number {
        return SKELETON_ROWS;
    }

    #derive(columns: UaxTableColumn[], rows: UaxTableRow[], lang: string): DerivedColumn[] {
        let shareIndex = 0;
        return columns.map((column) => {
            const type = column.type;
            const derived: DerivedColumn = {
                column,
                align: column.align ?? (type === "number" || type === "percent" ? "end" : "start"),
                color: 1,
                total: 0,
                max: 0,
            };
            if (type === "number") derived.format = getNumberFormat(lang, column.valueFormat);
            if (type === "percent") derived.format = getNumberFormat(lang, { ...percentFormatOptions, ...column.valueFormat });
            if (type === "share") {
                derived.format = getNumberFormat(lang, column.valueFormat);
                derived.shareFormat = getNumberFormat(lang, shareFormatOptions);
                derived.color = column.color ?? ((shareIndex % 4) + 1) as 1 | 2 | 3 | 4;
                shareIndex++;
                for (const row of rows) {
                    const value = asNumber(row[column.key]);
                    if (value === undefined) continue;
                    derived.total += value;
                    derived.max = Math.max(derived.max, value);
                }
                derived.total = asNumber(this.totals?.[column.key]) ?? derived.total;
                derived.max = asNumber(this.maxes?.[column.key]) ?? derived.max;
            }
            return derived;
        });
    }

    #renderCell(derived: DerivedColumn, row: UaxTableRow): TemplateResult | typeof nothing | string {
        const { column } = derived;
        switch (column.type) {
            case "link":
                return this.#renderLink(column, row);
            case "number":
            case "percent": {
                const value = asNumber(row[column.key]);
                return value === undefined ? "" : derived.format!.format(value);
            }
            case "share":
                return this.#renderShare(derived, row);
            default:
                return asText(row[column.key]);
        }
    }

    #renderLink(column: UaxTableColumn, row: UaxTableRow): TemplateResult | string {
        const text = asText(row[column.key]);
        const href = column.hrefKey ? safeHref(row[column.hrefKey]) : undefined;
        return href ? html`<a href=${href}>${text}</a>` : text;
    }

    #renderShare(derived: DerivedColumn, row: UaxTableRow): TemplateResult | typeof nothing {
        const value = asNumber(row[derived.column.key]);
        if (value === undefined) return nothing;
        const share = derived.total ? value / derived.total : 0;
        const change = this.#changeFor(derived.column, row, value);
        const width = derived.max > 0 ? Math.round(Math.min(Math.max(value / derived.max, 0), 1) * 10000) / 100 : 0;
        return html`<div class="share">
            <div class="share-top">
                <span class="share-value">${derived.format!.format(value)}</span> <span class="share-percent">(${derived.shareFormat!.format(share)})</span>
                ${change === undefined ? nothing : html`<uax-delta-badge size="sm" .value=${change}></uax-delta-badge>`}
            </div>
            <div class="share-track" aria-hidden="true">
                <div class="share-bar" style="width: ${width}%; background-color: var(--_uax-series-${derived.color})"></div>
            </div>
        </div>`;
    }

    #renderHeaderCell(derived: DerivedColumn): TemplateResult {
        const { column } = derived;
        if (!column.sortable) return html`<uui-table-head-cell class=${this.#cellClass(derived)}>${column.label}</uui-table-head-cell>`;
        const active = this.sort?.key === column.key;
        const descending = this.sort?.direction === "desc";
        // The click handler is on the cell, so the whole header sorts. The button is what a keyboard reaches.
        return html`<uui-table-head-cell
            class="${this.#cellClass(derived)} sortable"
            aria-sort=${active ? (descending ? "descending" : "ascending") : "none"}
            @click=${() => this.#sortBy(column)}>
            <button type="button">
                <span>${column.label}</span>
                <uui-symbol-sort ?active=${active} ?descending=${active && descending}></uui-symbol-sort>
            </button>
        </uui-table-head-cell>`;
    }

    /**
     * Share columns get an equal slice of at most 27% each (the design's 46 / 27 / 27 split), so the
     * bars line up between tables and a long URL wraps instead of squeezing them. The other columns share what's left.
     */
    #columnWidth(derived: DerivedColumn): string | undefined {
        if (derived.column.type !== "share") return undefined;
        const shares = this.#derived.filter((d) => d.column.type === "share").length;
        return `width: ${Math.min(27, 80 / shares)}%`;
    }

    #cellClass(derived: DerivedColumn): string {
        const numeric = isNumeric(derived.column);
        return `${derived.align === "end" ? "end" : "start"}${numeric ? " numeric" : ""}`;
    }

    #renderRow(row: UaxTableRow): TemplateResult {
        return html`<uui-table-row>
            ${this.#derived.map(
                (derived) => html`<uui-table-cell class=${this.#cellClass(derived)}>${this.#renderCell(derived, row)}</uui-table-cell>`,
            )}
        </uui-table-row>`;
    }

    #renderSkeletonRow(index: number): TemplateResult {
        return html`<uui-table-row>
            ${this.#derived.map((derived, column) => {
                const text = derived.column.type === "text" || derived.column.type === "link";
                const width = text ? SKELETON_WIDTHS[(index + column) % SKELETON_WIDTHS.length] : 40;
                return html`<uui-table-cell class=${this.#cellClass(derived)}>
                    <div class="skeleton-cell">
                        <uax-skeleton style="width: ${width}%; height: var(--_uax-skeleton-height)"></uax-skeleton>
                    </div>
                </uui-table-cell>`;
            })}
        </uui-table-row>`;
    }

    override render() {
        const hasData = this.rows.length > 0;
        const mode = getLoadingMode(this.loading, hasData);
        const hasShare = this.#derived.some((derived) => derived.column.type === "share");
        return html`<div class="region ${hasShare ? "has-share" : ""} ${this.#hasToolbar ? "has-toolbar" : ""}">
            ${mode === "reload" ? html`<uax-loading-bar></uax-loading-bar>` : nothing}
            <div class="toolbar"><slot name="toolbar" @slotchange=${() => this.requestUpdate()}></slot></div>
            <uui-table aria-busy=${this.loading ? "true" : "false"}>
                ${this.#derived.map((derived) => html`<uui-table-column style=${ifDefined(this.#columnWidth(derived))}></uui-table-column>`)}
                <uui-table-head>${this.#derived.map((derived) => this.#renderHeaderCell(derived))}</uui-table-head>
                ${mode === "skeleton"
                    ? Array.from({ length: this.#skeletonRowCount }, (_, index) => this.#renderSkeletonRow(index))
                    : this.#visibleRows.map((row) => this.#renderRow(row))}
            </uui-table>
            ${mode === "idle" && !hasData
                ? html`<uax-empty-state .headline=${this.emptyHeadline} .description=${this.emptyDescription}></uax-empty-state>`
                : nothing}
            ${this.#showPager && mode !== "skeleton" ? this.#renderPager() : nothing}
        </div>`;
    }

    #renderPager(): TemplateResult {
        const size = this.#pageSize;
        const page = this.#currentPage;
        const total = this.#totalRows;
        const format = getNumberFormat(this.localize.lang()).format;
        const from = (page - 1) * size + 1;
        const to = Math.min(total, page * size);
        return html`<div class="pager" role="navigation" aria-label=${this.localize.term("uaxAnalytics_tablePagination")}>
            <div class="page-size">
                <span aria-hidden="true">${this.localize.term("uaxAnalytics_tableShowRows")}</span>
                <uui-select
                    name="page-size"
                    label=${this.localize.term("uaxAnalytics_tableShowRows")}
                    .options=${this.#pageSizeOptions.map((option) => ({ name: String(option), value: String(option), selected: option === size }))}
                    .value=${String(size)}
                    @change=${this.#onPageSizeChange}></uui-select>
            </div>
            <div class="range" aria-live="polite">${this.localize.term("uaxAnalytics_tablePagerPosition", format(from), format(to), format(total))}</div>
            <div class="nav">
                <uui-button
                    class="previous"
                    compact
                    label=${this.localize.term("uaxAnalytics_tablePreviousPage")}
                    ?disabled=${page <= 1}
                    @click=${() => page > 1 && this.#step(-1)}>
                    <uui-icon name="icon-navigation-left"></uui-icon>
                </uui-button>
                <uui-button
                    class="next"
                    compact
                    label=${this.localize.term("uaxAnalytics_tableNextPage")}
                    ?disabled=${page >= this.#pageCount}
                    @click=${() => page < this.#pageCount && this.#step(1)}>
                    <uui-icon name="icon-navigation-right"></uui-icon>
                </uui-button>
            </div>
        </div>`;
    }

    static override styles: CSSResultGroup = [
        uaxThemeTokens,
        css`
            :host {
                display: block;
                --_uax-skeleton-height: 14px;
                --_uax-table-line: 20px;
                font-size: 13px;
                line-height: var(--_uax-table-line);
            }

            .region {
                position: relative;
                /* A uui-box doesn't clip its content, so the last row would square off the box's rounded bottom corners. */
                overflow: clip;
                border-radius: 0 0 var(--uui-box-border-radius, var(--uui-border-radius-3)) var(--uui-box-border-radius, var(--uui-border-radius-3));
                /* The tallest content a body row holds, so a skeleton row and a loaded row are the same height. */
                --_uax-table-content-height: var(--_uax-table-line);
            }

            .region.has-share {
                --_uax-table-content-height: calc(var(--_uax-table-line) + 5px + 4px);
            }

            /* The toolbar pads itself, only when something is slotted, so the loading bar can span the full width. */
            .has-toolbar .toolbar {
                padding: var(--uax-table-padding, var(--uui-size-space-4) var(--uui-size-space-6));
            }

            uax-loading-bar {
                z-index: 3;
            }

            /* uui-table draws its own border and corners. The surrounding box does both, edge to edge. */
            uui-table {
                border: none;
                border-radius: 0;
            }

            uui-table-head {
                background-color: var(--uui-color-surface-alt);
            }

            /* The padding moves into the button, so the whole header is its hit area. Mirrors umb-table's sortable header. */
            uui-table-head-cell.sortable {
                --uui-table-cell-padding: 0 var(--uui-size-5);
                cursor: pointer;
            }

            uui-table-head-cell.sortable:hover,
            uui-table-head-cell.sortable:focus-within {
                --uui-symbol-sort-hover: 1;
            }

            uui-table-head-cell button {
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

            uui-table-head-cell.end button {
                justify-content: flex-end;
            }

            uui-table-head-cell button:focus-visible {
                outline: calc(2px * var(--uui-show-focus-outline, 1)) solid var(--uui-color-focus);
                outline-offset: -2px;
            }

            .has-toolbar uui-table-head-cell {
                border-top: 1px solid var(--uui-color-border);
            }

            uui-table-head-cell {
                --uui-table-cell-height: auto;
                --uui-table-cell-padding: var(--uui-size-3) var(--uui-size-5);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.6px;
                text-transform: uppercase;
                color: var(--uui-color-text-alt);
                white-space: nowrap;
            }

            uui-table-cell {
                --uui-table-cell-height: auto;
                --uui-table-cell-padding: var(--uui-size-5);
                color: var(--uui-color-text);
                /* Long URLs wrap anywhere rather than stretch the column. */
                overflow-wrap: anywhere;
            }

            .start {
                text-align: start;
            }

            .end {
                text-align: end;
            }

            .numeric {
                font-variant-numeric: tabular-nums;
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

            .share {
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-width: 92px;
            }

            .share-top {
                display: flex;
                align-items: baseline;
                gap: 6px;
                height: var(--_uax-table-line);
            }

            .end .share-top {
                justify-content: flex-end;
            }

            .share-value {
                font-weight: 700;
            }

            .share-percent {
                font-size: 12px;
                color: var(--uui-color-text-alt);
            }

            .share-track {
                height: 4px;
                border-radius: 999px;
                background-color: var(--_uax-tint-neutral);
                overflow: hidden;
            }

            .share-bar {
                height: 100%;
                border-radius: 999px;
            }

            .skeleton-cell {
                display: flex;
                align-items: center;
                min-height: var(--_uax-table-content-height);
            }

            .end .skeleton-cell {
                justify-content: flex-end;
            }

            /* The design's footer: right-aligned, "Show rows", the range, then previous and next. */
            .pager {
                display: flex;
                align-items: center;
                justify-content: flex-end;
                flex-wrap: wrap;
                gap: var(--uui-size-space-4);
                padding: var(--uax-table-padding, var(--uui-size-space-4) var(--uui-size-space-6));
                border-top: 1px solid var(--uui-color-border);
                font-size: 12px;
                color: var(--uui-color-text-alt);
            }

            .page-size,
            .nav {
                display: inline-flex;
                align-items: center;
                gap: var(--uui-size-space-2);
            }

            .range {
                font-variant-numeric: tabular-nums;
            }

            uui-select {
                font-size: inherit;
            }

            uax-empty-state {
                border-top: 1px solid var(--uui-color-border);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uax-data-table": UaxDataTableElement;
    }
}
