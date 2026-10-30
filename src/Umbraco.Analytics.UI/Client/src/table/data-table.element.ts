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
import { UaxPaletteStyles } from "../theme/index.js";
import "./cells/index.js";
import { UAX_TABLE_CELL } from "./cells/cell-names.js";
import { UaxTableContextController } from "./internal/table-context.controller.js";
import "./internal/table-pager.element.js";
import "./internal/table-skeleton-cell.element.js";
import "./internal/table-sort-button.element.js";
import { asNumber, asText } from "./internal/number-format.js";
import type {
    UaxTableCellElement,
    UaxTableColumn,
    UaxTableMode,
    UaxTablePageChangeDetail,
    UaxTableRowClickDetail,
    UaxTableSearchDetail,
    UaxTableSort,
    UaxTableStats,
} from "./types.js";

type UaxTableRow = Record<string, unknown>;

/** A column with everything the cells need, worked out once per change of columns, rows or language. */
interface DerivedColumn {
    column: UaxTableColumn;
    align: "start" | "end";
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

/** Native controls that keep a click or key press to themselves, as in `uui-table-row`'s `selectable`. */
const INTERACTIVE_TAGS = new Set(["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"]);

/** The page sizes the footer offers. The first is also the size under which a table never needs a footer. */
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

/** The cell element a column names, the text cell when it names none. */
function cellElementName(column: UaxTableColumn): string {
    return column.elementName || UAX_TABLE_CELL.text;
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

/** The text of the columns a search looks in: `searchable` columns, or every column when none is marked. Text values only. */
function searchTextOf(row: UaxTableRow, columns: UaxTableColumn[]): string {
    return columns.map((column) => (typeof row[column.key] === "string" ? (row[column.key] as string) : "")).join("\n");
}

const SKELETON_ROWS = 5;
/** Widths of the skeleton blocks, varied by row so the placeholder doesn't look like a grid of equal bars. */
const SKELETON_WIDTHS = [72, 54, 83, 47, 65];

/**
 * A table of rows. Each column names the cell element that shows its values in `elementName`: the built-in
 * cells (`UAX_TABLE_CELL`) show text, links, numbers, percentages or a share of the column total with a bar,
 * and a product can name its own. The default is the text cell.
 *
 * Built on `uui-table`, so it looks like the backoffice's own tables. Put it in a `uui-box` with
 * `--uui-box-default-padding: 0` so it runs edge to edge: the cells pad themselves, and the toolbar
 * slot pads itself with `--uax-table-padding`.
 *
 * Values are raw numbers. The number cells format them in the editor's culture, with the column's `valueFormat`.
 * The table provides `UAX_TABLE_CONTEXT` to its cells, with each column's total and largest value (so a share
 * cell can draw a percent and a bar) and the compare-row lookup.
 *
 * Pass last period's rows in `compare-rows` and name the column that identifies a row in `row-key` so cells
 * can compare a row with its match. A row with no matching compare row shows no badge. Without a `row-key` there is no match.
 *
 * While `loading` is set it shows skeleton rows on first load, or keeps the old rows under a loading
 * bar when reloading. With no rows it shows `uax-empty-state` under the header. Replace `rows` and
 * `columns` (and `compare-rows`) with new arrays to update the table: changing one in place isn't noticed.
 *
 * Give a column `sortable` to make its header a button. Clicking it sets `sort` and raises `sort-change`
 * with `{ key, direction }`: the first click on a column sorts numbers descending and text ascending, and
 * clicking the sorted column flips it. In `client` mode (the default) the table also sorts the rows it's
 * given, keeping equal rows in their order and empty values last. In `server` mode it never reorders:
 * the product sorts and passes new `rows`. Column totals stay those of the whole column either way.
 *
 * The footer shows "Show rows" (10, 25, 50 or 100), the range ("1–10 of 272") and previous and next
 * buttons, and is hidden when the rows fit the smallest page size. In `client` mode the table pages the
 * (sorted) rows itself. In `server` mode it draws the `rows` it's given as the current page, reads the
 * row count from `total`, and the product loads the new page when `page-change` is raised. Either way the
 * table sets its own `page` and `page-size` when the editor changes them, and goes back to page 1 when a
 * header is clicked. In `server` mode that sort is a `sort-change` for the product to load, not a `page-change`.
 *
 * Set `query` to search. In `client` mode the table keeps the rows that contain it, ignoring case, in the text of
 * the columns marked `searchable` (every column when none is), shows the empty state when none match, and goes
 * back to page 1. Put a `uax-table-search` in the `toolbar` slot and the table sets `query` itself from its `search`
 * event. In `server` mode the table never filters: the product loads the matching rows. Column totals and
 * bars stay those of all the `rows`, searched or not.
 *
 * Set `clickable-rows` to make rows openable. Clicking a row, or pressing Enter or Space on a focused row, raises
 * `row-click` with `{ row }`. Rows are then keyboard-reachable and show a pointer and a hover tint. A click or key press
 * on a link, button or form control inside a row is that control's own and raises nothing. Without `clickable-rows` rows
 * are plain, even when something listens for `row-click`, because an element can't tell that it has a listener.
 *
 * Totals and maxes are worked out from the `rows` the table holds: all of them in `client` mode, but only
 * the current page in `server` mode. Pass `totals` (the column's total across every page) so a share is
 * still a share of the whole, and `maxes` (the column's largest value across every page) so bars
 * keep one scale from page to page.
 *
 * @element uax-data-table
 * @fires sort-change - A sortable header was clicked, by pointer or keyboard. Bubbles, not composed or cancelable, like `uax-group-by`. `detail` is `{ key, direction }`; the table has already set `sort` to it and reset `page` to 1, so a `server` product loads page 1 and resets its own page binding.
 * @fires page-change - The editor picked another page or page size. Bubbles, not composed or cancelable, like `sort-change`. `detail` is `{ page, pageSize }`; the table has already set `page` and `pageSize`. A new page size goes back to page 1.
 * @fires row-click - A row was clicked, or Enter or Space was pressed on it, while `clickable-rows` is set. Bubbles, not composed or cancelable, like `sort-change`. `detail` is `{ row }`: the object from `rows`.
 * @fires search - Not raised by the table: the `search` event of a `uax-table-search` in the `toolbar` slot bubbles through it, and the table has already set `query` and gone back to page 1 when a product's listener runs.
 * @slot toolbar - Content above the header row, such as a search box and totals. It pads itself with `--uax-table-padding`.
 * @slot footer - Content below the rows, on the left of the pager, such as an "updated" note. The footer shows whenever this has content, even while loading, and pads itself with `--uax-table-padding`.
 * @cssprop --uax-table-padding - Padding of the toolbar and footer sections, as a CSS `padding` value. Defaults to `12px 24px`. The loading bar ignores it and spans the full width at the top edge.
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
     * Each column's total across every page, by column `key`: the number a share is a percent of,
     * not a total the table shows. Without an entry the total is the sum of the `rows` the table holds.
     */
    @property({ attribute: false })
    totals?: Record<string, number>;

    /**
     * Each column's largest value across every page, by column `key`: what a full bar stands for.
     * Without an entry the largest value in the `rows` the table holds is a full bar.
     */
    @property({ attribute: false })
    maxes?: Record<string, number>;

    /**
     * The text to search for. Set by the product, and by the table itself when a `search` event reaches it from a
     * `uax-table-search` in the `toolbar` slot. `client` mode only keeps the rows that match; `server` mode ignores it.
     */
    @property({ type: String })
    query = "";

    /**
     * Makes rows clickable and keyboard-reachable, and raises `row-click`. Set it when the product listens for
     * `row-click`: the table can't tell, so rows are plain until it's set.
     */
    @property({ type: Boolean, attribute: "clickable-rows" })
    clickableRows = false;

    /** Provides the columns, stats and compare lookup to the cells, as `UAX_TABLE_CONTEXT`. */
    #context = new UaxTableContextController(this);
    #derived: DerivedColumn[] = [];
    #sorted?: { rows: UaxTableRow[]; sort: UaxTableSort; column: UaxTableColumn; lang: string; sortedRows: UaxTableRow[] };
    #derivedFrom?: DerivedFrom;
    #searched?: { rows: UaxTableRow[]; columns: UaxTableColumn[]; needle: string; lang: string; searchedRows: UaxTableRow[] };
    /** The compare rows by their `rowKey` value, rebuilt when `compareRows` or `rowKey` change. */
    #compareByKey = new Map<string, UaxTableRow>();

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const lang = this.localize.lang();
        const prev = this.#derivedFrom;
        if (!prev || prev.compareRows !== this.compareRows || prev.rowKey !== this.rowKey) {
            this.#compareByKey = this.#indexCompareRows(this.compareRows, this.rowKey);
            this.#context.setCompare((item) => this.#compareRowFor(item));
        }
        if (
            !prev ||
            prev.columns !== this.columns ||
            prev.rows !== this.rows ||
            prev.totals !== this.totals ||
            prev.maxes !== this.maxes ||
            prev.lang !== lang
        ) {
            this.#derived = this.#derive(this.columns);
            this.#context.setColumns(this.columns);
            this.#context.setStats(this.#computeStats(this.columns, this.#statsRows));
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

    /** The compare row that matches the row, or undefined when there is no `rowKey` or no matching row. */
    #compareRowFor(row: UaxTableRow): UaxTableRow | undefined {
        if (!this.rowKey) return undefined;
        const key = rowIdentity(row[this.rowKey]);
        return key === undefined ? undefined : this.#compareByKey.get(key);
    }

    /**
     * The rows that column totals and bar scales are worked out from: all the rows the table holds, never
     * just the page on screen. In `server` mode that is the page the product passed, unless `totals` and `maxes` say more.
     */
    get #statsRows(): UaxTableRow[] {
        return this.rows;
    }

    /** The rows to draw: the searched rows, sorted, cut down to the current page in client mode. */
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

    /** A `search` event came from the toolbar slot: take its query and go back to page 1, since the matches are other rows. */
    #onSearch = (event: Event) => {
        const query = (event as CustomEvent<UaxTableSearchDetail>).detail?.query;
        if (typeof query !== "string") return;
        this.query = query;
        this.page = 1;
    };

    /**
     * `rows` that contain `query`, in client mode, found once per change of rows, columns, query or language.
     * Without a query, and in server mode, it is `rows` itself. Never changes `rows`.
     */
    get #searchedRows(): UaxTableRow[] {
        const lang = this.localize.lang();
        const needle = typeof this.query === "string" ? this.query.trim().toLocaleLowerCase(lang) : "";
        if (this.mode !== "client" || !needle) return this.rows;
        const cached = this.#searched;
        if (cached && cached.rows === this.rows && cached.columns === this.columns && cached.needle === needle && cached.lang === lang) return cached.searchedRows;
        const marked = this.columns.filter((column) => column.searchable);
        const searchColumns = marked.length > 0 ? marked : this.columns;
        const searchedRows = this.rows.filter((row) => searchTextOf(row, searchColumns).toLocaleLowerCase(lang).includes(needle));
        this.#searched = { rows: this.rows, columns: this.columns, needle, lang, searchedRows };
        return searchedRows;
    }

    /** How many rows there are across every page. */
    get #totalRows(): number {
        if (this.mode !== "server") return this.#searchedRows.length;
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
        const rows = this.#searchedRows;
        if (!sort || !column) return rows;
        const lang = this.localize.lang();
        const cached = this.#sorted;
        if (cached && cached.rows === rows && cached.sort === sort && cached.lang === lang && cached.column === column) return cached.sortedRows;
        const sortAs = column.sortAs ?? "text";
        const collator = getCollator(lang);
        const sign = sort.direction === "desc" ? -1 : 1;
        const compare =
            typeof sortAs === "function" ? sortAs : sortAs === "number" ? (x: unknown, y: unknown) => (x as number) - (y as number) : (x: unknown, y: unknown) => collator.compare(String(x), String(y));
        const sortValue = (row: UaxTableRow): unknown => {
            const value = row[column.key];
            if (typeof sortAs === "function") return value ?? undefined;
            return sortAs === "number" ? asNumber(value) : asText(value) || undefined;
        };
        const sortedRows = [...rows].sort((a, b) => {
            const x = sortValue(a);
            const y = sortValue(b);
            // Empty values go last in both directions, so only real values flip with the sign.
            if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? 1 : -1;
            return sign * compare(x, y);
        });
        this.#sorted = { rows, sort, lang, column, sortedRows };
        return sortedRows;
    }

    /** The first click on a column sorts numbers biggest first and text A to Z. Later clicks flip the direction. */
    #sortBy(column: UaxTableColumn) {
        const current = this.sort;
        const direction = current?.key === column.key ? (current.direction === "asc" ? "desc" : "asc") : column.sortAs === "number" ? "desc" : "asc";
        this.sort = { key: column.key, direction };
        this.page = 1;
        this.dispatchEvent(new CustomEvent("sort-change", { bubbles: true, detail: { key: column.key, direction } }));
    }

    /** Whether anything is slotted into `toolbar`. `:host(:has())` can't tell, and a slot can't be styled by its content. */
    get #hasToolbar(): boolean {
        return this.querySelector(':scope > [slot="toolbar"]') !== null;
    }

    /** Whether anything is slotted into `footer`, for the same reason as `#hasToolbar`. */
    get #hasFooterContent(): boolean {
        return this.querySelector(':scope > [slot="footer"]') !== null;
    }

    /** How many skeleton rows to draw on first load. */
    get #skeletonRowCount(): number {
        return SKELETON_ROWS;
    }

    #derive(columns: UaxTableColumn[]): DerivedColumn[] {
        return columns.map((column) => ({ column, align: column.align ?? "start" }));
    }

    /** Each column's total and largest number, from `totals` and `maxes` where given, else from the rows the table holds. */
    #computeStats(columns: UaxTableColumn[], rows: UaxTableRow[]): UaxTableStats {
        const stats: Record<string, { total: number; max: number }> = {};
        for (const { key } of columns) {
            let total = 0;
            let max = 0;
            let any = false;
            for (const row of rows) {
                const value = asNumber(row[key]);
                if (value === undefined) continue;
                any = true;
                total += value;
                max = Math.max(max, value);
            }
            total = asNumber(this.totals?.[key]) ?? total;
            max = asNumber(this.maxes?.[key]) ?? max;
            if (any || this.totals?.[key] !== undefined || this.maxes?.[key] !== undefined) stats[key] = { total, max };
        }
        return stats;
    }

    /** One cell element per row and column, reused while the column keeps its element name, as the CMS `umb-table` does. */
    #cellElements = new WeakMap<UaxTableRow, Map<string, HTMLElement>>();

    #renderCell(derived: DerivedColumn, row: UaxTableRow): HTMLElement {
        const { column } = derived;
        const elementName = cellElementName(column);
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
        const cell = element as HTMLElement & Partial<UaxTableCellElement>;
        cell.column = column;
        cell.item = row;
        cell.value = row[column.key];
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

    #cellClass(derived: DerivedColumn): string {
        return derived.align === "end" ? "end" : "start";
    }

    /** A click on a link, button or form control inside the row belongs to that control. */
    #isOnInteractive(event: Event, row: EventTarget | null): boolean {
        for (const target of event.composedPath()) {
            if (target === row) return false;
            if (target instanceof Element && INTERACTIVE_TAGS.has(target.tagName)) return true;
        }
        return false;
    }

    #raiseRowClick(row: UaxTableRow) {
        this.dispatchEvent(new CustomEvent<UaxTableRowClickDetail>("row-click", { bubbles: true, detail: { row } }));
    }

    #onRowClick(event: MouseEvent, row: UaxTableRow) {
        if (this.#isOnInteractive(event, event.currentTarget)) return;
        this.#raiseRowClick(row);
    }

    /** Enter or Space on the row itself, not on something inside it. Space is held back from scrolling the page. */
    #onRowKeydown(event: KeyboardEvent, row: UaxTableRow) {
        if (event.code !== "Enter" && event.code !== "Space") return;
        if (event.composedPath()[0] !== event.currentTarget) return;
        event.preventDefault();
        this.#raiseRowClick(row);
    }

    #renderRow(row: UaxTableRow): TemplateResult {
        const clickable = this.clickableRows;
        return html`<uui-table-row
            class=${clickable ? "clickable" : ""}
            tabindex=${ifDefined(clickable ? "0" : undefined)}
            @click=${clickable ? (event: MouseEvent) => this.#onRowClick(event, row) : undefined}
            @keydown=${clickable ? (event: KeyboardEvent) => this.#onRowKeydown(event, row) : undefined}>
            ${this.#derived.map(
                (derived) => html`<uui-table-cell class=${this.#cellClass(derived)}>${this.#renderCell(derived, row)}</uui-table-cell>`,
            )}
        </uui-table-row>`;
    }

    /** Skeleton cell elements by row and column key, kept apart from the data rows' cells. */
    #skeletonElements = new Map<string, HTMLElement>();
    /** Cell names already waited for, so a late-defined cell re-renders the table once. */
    #waitingFor = new Set<string>();

    /**
     * The loading placeholder of a column: its own cell element with `loading` set, when the element is defined
     * and has a `loading` property, else the generic one-line placeholder. A cell defined later swaps in on its own.
     */
    #renderSkeletonCell(derived: DerivedColumn, row: number, column: number): TemplateResult | HTMLElement {
        const elementName = cellElementName(derived.column);
        const definition = customElements.get(elementName);
        if (!definition && !this.#waitingFor.has(elementName)) {
            this.#waitingFor.add(elementName);
            void customElements.whenDefined(elementName).then(() => {
                this.#waitingFor.delete(elementName);
                this.requestUpdate();
            });
        }
        if (!definition || !("loading" in definition.prototype)) {
            return html`<uax-table-skeleton-cell .width=${SKELETON_WIDTHS[(row + column) % SKELETON_WIDTHS.length]} .align=${derived.align}></uax-table-skeleton-cell>`;
        }
        const id = `${row}:${derived.column.key}`;
        let element = this.#skeletonElements.get(id);
        if (!element || element.tagName.toLowerCase() !== elementName.toLowerCase()) {
            element = document.createElement(elementName);
            this.#skeletonElements.set(id, element);
        }
        const cell = element as HTMLElement & Partial<UaxTableCellElement>;
        cell.column = derived.column;
        cell.item = {};
        cell.value = undefined;
        cell.loading = true;
        return element;
    }

    #renderSkeletonRow(index: number): TemplateResult {
        return html`<uui-table-row>
            ${this.#derived.map((derived, column) => {
                // Numbers sit at the end of their cell and are short, so their block is too.
                const width = derived.align === "end" ? 40 : SKELETON_WIDTHS[(index + column) % SKELETON_WIDTHS.length];
                return html`<uui-table-cell class=${this.#cellClass(derived)} style="--_uax-skeleton-width: ${width}%">
                    ${this.#renderSkeletonCell(derived, index, column)}
                </uui-table-cell>`;
            })}
        </uui-table-row>`;
    }

    override render() {
        const hasData = this.rows.length > 0;
        const mode = getLoadingMode(this.loading, hasData);
        return html`<div class="region ${this.#hasToolbar ? "has-toolbar" : ""}">
            ${mode === "reload" ? html`<uax-loading-bar></uax-loading-bar>` : nothing}
            <div class="toolbar"><slot name="toolbar" @slotchange=${() => this.requestUpdate()} @search=${this.#onSearch}></slot></div>
            <uui-table aria-busy=${this.loading ? "true" : "false"}>
                ${this.#derived.map((derived) => html`<uui-table-column style=${ifDefined(derived.column.width ? `width: ${derived.column.width}` : undefined)}></uui-table-column>`)}
                <uui-table-head>${this.#derived.map((derived) => this.#renderHeaderCell(derived))}</uui-table-head>
                ${mode === "skeleton"
                    ? Array.from({ length: this.#skeletonRowCount }, (_, index) => this.#renderSkeletonRow(index))
                    : this.#visibleRows.map((row) => this.#renderRow(row))}
            </uui-table>
            ${this.#renderEmptyState(mode, hasData)}
            ${this.#renderFooter(this.#showPager && mode !== "skeleton")}
        </div>`;
    }

    /** "No results" when a query leaves no rows on screen (either mode), else the product's empty state when there are no rows. */
    #renderEmptyState(mode: ReturnType<typeof getLoadingMode>, hasData: boolean): TemplateResult | typeof nothing {
        const searching = typeof this.query === "string" && this.query.trim() !== "";
        if (mode !== "skeleton" && searching && this.#visibleRows.length === 0) {
            return html`<uax-empty-state .headline=${this.localize.term("general_searchNoResult")} description=""></uax-empty-state>`;
        }
        if (mode === "idle" && !hasData) {
            return html`<uax-empty-state .headline=${this.emptyHeadline} .description=${this.emptyDescription}></uax-empty-state>`;
        }
        return nothing;
    }

    /** The footer section owns the border, padding and placement, like the toolbar above the table. The pager is only its controls. */
    #renderFooter(showPager: boolean): TemplateResult {
        // Always rendered, so the slot is there to raise `slotchange` when content arrives later. Hidden when it has nothing to show.
        return html`<div class="footer" ?hidden=${!showPager && !this.#hasFooterContent}>
            <slot name="footer" @slotchange=${() => this.requestUpdate()}></slot>
            ${showPager
                ? html`<uax-table-pager
                      .page=${this.#currentPage}
                      .pageSize=${this.#pageSize}
                      .total=${this.#totalRows}
                      .pageSizes=${this.#pageSizeOptions}
                      @page-change=${this.#onPagerChange}></uax-table-pager>`
                : nothing}
        </div>`;
    }

    static override styles: CSSResultGroup = [
        UaxPaletteStyles,
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

            /* The toolbar pads itself, only when something is slotted, so the loading bar can span the full width. */
            .has-toolbar .toolbar {
                padding: var(--uax-table-padding, var(--uui-size-space-4) var(--uui-size-space-6));
            }

            /* The footer slot grows on the left, so the pager stays on the right. */
            .footer {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: var(--uui-size-space-4);
                padding: var(--uax-table-padding, var(--uui-size-space-4) var(--uui-size-space-6));
                border-top: 1px solid var(--uui-color-border);
            }

            .footer[hidden] {
                display: none;
            }

            .footer slot {
                display: block;
                flex: 1;
            }

            uax-table-pager {
                margin-left: auto;
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

            /* Mirrors uui-table-row[selectable]'s pointer. Its own :focus-visible outline is the focus ring. */
            uui-table-row.clickable {
                cursor: pointer;
            }

            uui-table-row.clickable:hover {
                background-color: var(--uui-color-surface-emphasis);
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
