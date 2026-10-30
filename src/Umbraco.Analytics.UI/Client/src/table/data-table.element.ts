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
import "../empty-state/empty-state.element.js";
import { getLoadingMode } from "../internal/loading/loading-mode.js";
import "../internal/loading/loading-bar.element.js";
import "../internal/loading/skeleton.element.js";
import { uaxThemeTokens } from "../internal/theme/tokens.css.js";
import "./cells/index.js";
import type { UaxShareCellElement } from "./cells/share-cell.element.js";
import "./internal/table-pager.element.js";
import "./internal/table-skeleton-cell.element.js";
import "./internal/table-sort-button.element.js";
import { asNumber, asText } from "./internal/number-format.js";
import type { UaxTableCellElement, UaxTableColumn, UaxTableMode, UaxTablePageChangeDetail, UaxTableSort } from "./types.js";

type UaxTableRow = Record<string, unknown>;

/** A column with everything the cells need, worked out once per change of columns, rows or language. */
interface DerivedColumn {
    column: UaxTableColumn;
    align: "start" | "end";
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

/** The cell element of each built-in column type. A column's `elementName` takes its place. */
const CELL_ELEMENTS: Record<UaxTableColumn["type"], string> = {
    text: "uax-text-cell",
    link: "uax-link-cell",
    number: "uax-number-cell",
    percent: "uax-percent-cell",
    share: "uax-share-cell",
};

const SKELETON_ROWS = 5;
/** Widths of the skeleton blocks, varied by row so the placeholder doesn't look like a grid of equal bars. */
const SKELETON_WIDTHS = [72, 54, 83, 47, 65];

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
            this.#derived = this.#derive(this.columns, this.#statsRows);
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

    /** The matching compare row's value for the column, or undefined when there is no `rowKey`, no matching row or no number. */
    #compareValueFor(column: UaxTableColumn, row: UaxTableRow): number | undefined {
        if (!this.rowKey) return undefined;
        const key = rowIdentity(row[this.rowKey]);
        const compareRow = key === undefined ? undefined : this.#compareByKey.get(key);
        return compareRow ? asNumber(compareRow[column.key]) : undefined;
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

    #onPagerChange(event: CustomEvent<UaxTablePageChangeDetail>) {
        this.#changePage(event.detail.page, event.detail.pageSize);
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

    #derive(columns: UaxTableColumn[], rows: UaxTableRow[]): DerivedColumn[] {
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
            if (type === "share") {
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

    /** One cell element per row and column, reused while the column keeps its element name, as the CMS `umb-table` does. */
    #cellElements = new WeakMap<UaxTableRow, Map<string, HTMLElement>>();

    #renderCell(derived: DerivedColumn, row: UaxTableRow): HTMLElement {
        const { column } = derived;
        const elementName = column.elementName || CELL_ELEMENTS[column.type] || CELL_ELEMENTS.text;
        let rowCache = this.#cellElements.get(row);
        if (!rowCache) {
            rowCache = new Map();
            this.#cellElements.set(row, rowCache);
        }
        let element = rowCache.get(column.key);
        if (!element || element.tagName.toLowerCase() !== elementName.toLowerCase()) {
            element = document.createElement(elementName);
            rowCache.set(column.key, element);
        }
        const cell = element as HTMLElement & Partial<UaxTableCellElement> & Partial<UaxShareCellElement>;
        cell.column = column;
        cell.item = row;
        cell.value = row[column.key];
        // Only the built-in share cell takes what the table works out across rows.
        if (!column.elementName && column.type === "share") {
            const share = element as UaxShareCellElement;
            share.total = derived.total;
            share.max = derived.max;
            share.color = derived.color;
            share.compareValue = this.#compareValueFor(column, row);
        }
        return element;
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
            <uax-table-sort-button .active=${active} .descending=${descending} .align=${derived.align}>${column.label}</uax-table-sort-button>
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
        return derived.align === "end" ? "end" : "start";
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
                    <uax-table-skeleton-cell .width=${width} .align=${derived.align}></uax-table-skeleton-cell>
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
        return html`<uax-table-pager
            .page=${this.#currentPage}
            .pageSize=${this.#pageSize}
            .total=${this.#totalRows}
            .pageSizes=${this.#pageSizeOptions}
            @page-change=${this.#onPagerChange}></uax-table-pager>`;
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
