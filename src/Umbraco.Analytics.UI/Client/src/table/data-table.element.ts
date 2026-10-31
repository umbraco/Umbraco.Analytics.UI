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
import "../error-state/error-state.element.js";
import { getLoadingMode, isBusy } from "../internal/loading/loading-mode.js";
import "../internal/loading/loading-bar.element.js";
import "../internal/loading/skeleton.element.js";
import { UauiPaletteStyles } from "../theme/index.js";
import "./cells/index.js";
import { UAUI_TABLE_CELL } from "./cells/cell-names.js";
import { UauiTableContextController } from "./internal/table-context.controller.js";
import "../internal/pager/compact-pager.element.js";
import "./internal/table-skeleton-cell.element.js";
import "./internal/table-sort-button.element.js";
import {
    DEFAULT_PAGE_SIZE,
    clampPage,
    computeStats,
    countRows,
    findCompareRow,
    indexCompareRows,
    nextSortDirection,
    normalizePageSize,
    pageCountOf,
    pageOfRows,
    pageSizeOptions,
    searchNeedle,
    searchRows,
    showsPager,
    sortRows,
    type UauiTableRow,
} from "./internal/table-rows.js";
import type {
    UauiTableCellElement,
    UauiTableColumn,
    UauiTableStatsInput,
    UauiTableMode,
    UauiTablePageChangeDetail,
    UauiTableRowClickDetail,
    UauiTableSortChangeDetail,
    UauiTableSort,
} from "./types.js";
import type { UauiSearchDetail } from "../search-field/search-field.element.js";

interface DerivedFrom {
    columns: UauiTableColumn[];
    rows: UauiTableRow[];
    compareRows: UauiTableRow[];
    rowKey?: string;
    stats?: UauiTableStatsInput;
    lang: string;
}

/** Native controls that keep a click or key press to themselves, as in `uui-table-row`'s `selectable`. */
const INTERACTIVE_TAGS = new Set(["A", "BUTTON", "INPUT", "TEXTAREA", "SELECT"]);

/** The cell element a column names, the text cell when it names none. */
function cellElementName(column: UauiTableColumn): string {
    return column.elementName || UAUI_TABLE_CELL.text;
}

/** Slot names of the column toolbar: `toolbar-<column key>`, and `toolbar-start` for the first column whatever its key. */
const SLOT_PREFIX = "toolbar-";
const START_SLOT = `${SLOT_PREFIX}start`;

const SKELETON_ROWS = 5;
/** Widths of the skeleton blocks, varied by row so the placeholder doesn't look like a grid of equal bars. */
const SKELETON_WIDTHS = [72, 54, 83, 47, 65];

/**
 * A table of rows. Each column names the cell element that shows its values in `elementName`: the built-in
 * cells (`UAUI_TABLE_CELL`) show text, links, numbers, percentages or a share of the column total with a bar,
 * and a product can name its own. The default is the text cell.
 *
 * Built on `uui-table`, so it looks like the backoffice's own tables. Put it in a `uui-box` with
 * `--uui-box-default-padding: 0` so it runs edge to edge: the cells pad themselves, and the toolbar
 * slot pads itself with `--uaui-table-padding`.
 *
 * Values are raw numbers. The number cells format them in the editor's culture, with the column's `valueFormat`.
 * The table provides `UAUI_TABLE_CONTEXT` to its cells, with each column's total and largest value (so a share
 * cell can draw a percent and a bar) and the compare-row lookup.
 *
 * Pass last period's rows in `compare-rows` and name the column that identifies a row in `row-key` so cells
 * can compare a row with its match. A row with no matching compare row shows no badge. Without a `row-key` there is no match.
 *
 * While `loading` is set it shows skeleton rows on first load, or keeps the old rows under a loading
 * bar when reloading. With no rows it shows `uaui-empty-state` under the header. While `error` is set it shows
 * `uaui-error-state` under the header in place of the rows and pager (error wins over loading, and loading over empty). Replace `rows` and
 * `columns` (and `compare-rows`) with new arrays to update the table: changing one in place isn't noticed.
 *
 * Give a column `sortable` to make its header a button. Clicking it sets `sort` and raises `sort-change`
 * with `{ key, direction }`: the first click on a column sorts numbers descending and text ascending, and
 * clicking the sorted column flips it. In `client` mode (the default) the table also sorts the rows it's
 * given, keeping equal rows in their order and empty values last. In `server` mode it never reorders:
 * the product sorts and passes new `rows`. Column totals stay those of the whole column either way.
 *
 * The footer shows "Per page" (10, 25, 50 or 100), the range ("1–10 of 272") and previous and next
 * buttons, and is hidden when the rows fit the smallest page size. In `client` mode the table pages the
 * (sorted) rows itself. In `server` mode it draws the `rows` it's given as the current page, reads the
 * row count from `total-rows`, and the product loads the new page when `page-change` is raised. Either way the
 * table sets its own `page` and `page-size` when the editor changes them, and goes back to page 1 when a
 * header is clicked. In `server` mode that sort is a `sort-change` for the product to load, not a `page-change`.
 *
 * Set `query` to search. In `client` mode the table keeps the rows that contain it, ignoring case, in the text of
 * the columns marked `searchable` (every column when none is), shows the empty state when none match, and goes
 * back to page 1. Put a `uaui-search-field` in the `toolbar` slot, or in a `toolbar-start` or `toolbar-[key]` slot, and the table sets `query` itself from its
 * `search` event. In `server` mode the table never filters: the product loads the matching rows. Column totals and
 * bars stay those of all the `rows`, searched or not.
 *
 * Set `clickable-rows` to make rows openable. Clicking a row, or pressing Enter or Space on a focused row, raises
 * `row-click` with `{ row }`. Rows are then keyboard-reachable and show a pointer and a hover tint. A click or key press
 * on a link, button or form control inside a row is that control's own and raises nothing. Without `clickable-rows` rows
 * are plain, even when something listens for `row-click`, because an element can't tell that it has a listener.
 *
 * The toolbar is one idea, filled across the full width (`toolbar`) or column by column (`toolbar-<column key>`). Slot content
 * into `toolbar-<column key>` to show a row above the column headings. It suits a `uaui-search-field` in the first column
 * and a `uaui-table-total` over each number column
 * (`<uaui-table-total slot="toolbar-pageviews" label="Pageviews" value="272"></uaui-table-total>`). Each piece sits in its own
 * column's cell, so it lines up with the column below and takes the column's `align`. `toolbar-start` is always the first
 * column's cell, whatever its key, so every product can write `<uaui-search-field slot="toolbar-start">`. If both
 * `toolbar-start` and `toolbar-<first column key>` have content, both show in that cell, `toolbar-start` first. A column whose
 * key is literally `start` has no cell of its own to fill: its `toolbar-start` is the first column's cell, which it shares.
 * A `search` event from any of these drives the table like one from the `toolbar` slot. A column with nothing slotted has an
 * empty cell, and the row is hidden while nothing is slotted for any column. The row isn't sorted, searched or paged, and the
 * product works out its numbers, as the table's `stats` aren't totals it shows. With a `toolbar` too, the order is toolbar,
 * column toolbar, headings.
 *
 * Each column's total and largest value are worked out from the `rows` the table holds: all of them in `client`
 * mode, but only the current page in `server` mode. Pass `stats` (the column's `total` and `max` across every
 * page, by column `key`) so a share is still a share of the whole and bars keep one scale from page to page.
 *
 * @element uaui-data-table
 * @fires retry - The Retry button of the error state was pressed (needs `retryable`). Bubbles, not composed.
 * @fires sort-change - A sortable header was clicked, by pointer or keyboard. Bubbles, not composed or cancelable, like `uaui-group-by`. `detail` is `{ key, direction }`; the table has already set `sort` to it and reset `page` to 1, so a `server` product loads page 1 and resets its own page binding.
 * @fires page-change - The editor picked another page or page size. Bubbles, not composed or cancelable, like `sort-change`. `detail` is `{ page, pageSize }`; the table has already set `page` and `pageSize`. A new page size goes back to page 1.
 * @fires row-click - A row was clicked, or Enter or Space was pressed on it, while `clickable-rows` is set. Bubbles, not composed or cancelable, like `sort-change`. `detail` is `{ row }`: the object from `rows`.
 * @fires search - Not raised by the table: the `search` event of a `uaui-search-field` in the `toolbar` slot or a `toolbar-start` or `toolbar-[key]` slot bubbles through it, and the table has already set `query` and gone back to page 1 when a product's listener runs.
 * @slot toolbar - Full-width content above the header row that isn't tied to a column. Put totals, and a search beside them, in the `toolbar-start` and `toolbar-[key]` slots instead. It pads itself with `--uaui-table-padding`.
 * @slot toolbar-start - Content for the first column's cell in the row above the column headings, whatever that column's key, such as a search box. It shows before `toolbar-[key]` content for the same column, and a column keyed `start` shares this cell rather than having its own. The row shows when this has content.
 * @slot toolbar-[key] - Content for the row above the column headings, in the cell of the column whose `key` follows `toolbar-`, such as a `uaui-table-total` over a number column. The row shows when any of these has content.
 * @slot footer - Content below the rows, on the left of the pager, such as an "updated" note. The footer shows whenever this has content, even while loading, and pads itself with `--uaui-table-padding`.
 * @cssprop --uaui-table-padding - Padding of the toolbar and footer sections, as a CSS `padding` value. Defaults to `12px 24px`. The loading bar ignores it and spans the full width at the top edge.
 * @cssprop --uaui-series-1 - Bar colour of the first share column. Also `--uaui-series-2` to `--uaui-series-4` for the other slots.
 * @cssprop --uaui-tint-neutral - Colour of the track behind a share bar.
 */
@customElement("uaui-data-table")
export class UauiDataTableElement extends UmbLitElement {
    /** The columns, left to right. */
    @property({ attribute: false })
    columns: UauiTableColumn[] = [];

    /** The rows. Each column reads its value from the row's `key`. */
    @property({ attribute: false })
    rows: Record<string, unknown>[] = [];

    /** Last period's rows. Each is matched to a row in `rows` by its `rowKey` value. When several share a key, the last one wins. */
    @property({ attribute: false })
    compareRows: Record<string, unknown>[] = [];

    /** The key in each row, and compare row, that identifies it, such as a URL. Without it no compare badges are shown. */
    @property({ type: String, attribute: "row-key" })
    rowKey?: string;

    /** Shows skeleton rows on first load, or a loading bar over the old rows when reloading. */
    @property({ type: Boolean, reflect: true })
    loading = false;

    /** The load failed. Shows `uaui-error-state` under the header in place of the rows and pager, and wins over `loading` and the empty state. */
    @property({ type: Boolean, reflect: true })
    error = false;

    /** Headline of the error state. Defaults to the translation of "Something went wrong". */
    @property({ type: String, attribute: "error-headline" })
    errorHeadline?: string;

    /** Description of the error state. Defaults to the translation of "The data could not be loaded.". */
    @property({ type: String, attribute: "error-description" })
    errorDescription?: string;

    /** Shows a Retry button in the error state. Pressing it raises `retry` on the table. */
    @property({ type: Boolean })
    retryable = false;

    /** Headline of the empty state. Defaults to the translation of "No data yet". */
    @property({ type: String, attribute: "empty-headline" })
    emptyHeadline?: string;

    /** Description of the empty state. Defaults to the translation of "Try a wider date range.". */
    @property({ type: String, attribute: "empty-description" })
    emptyDescription?: string;

    /** The column the rows are sorted by. Set by the product, and by the table itself when a header is clicked. */
    @property({ attribute: false })
    sort?: UauiTableSort;

    /** `client` sorts the rows itself. `server` only raises `sort-change`, and the product passes the sorted rows. */
    @property({ type: String })
    mode: UauiTableMode = "client";

    /** The page shown, starting at 1. Set by the product, and by the table itself when the editor pages. A page past the last one shows the last. */
    @property({ type: Number })
    page = 1;

    /** Rows per page. The footer offers 10, 25, 50 and 100, and adds this size to the list when it's another number. */
    @property({ type: Number, attribute: "page-size" })
    pageSize = DEFAULT_PAGE_SIZE;

    /** `server` mode: how many rows there are across every page. `client` mode counts `rows` and ignores this. */
    @property({ type: Number, attribute: "total-rows" })
    totalRows?: number;

    /**
     * Each column's `total` and `max` across every page, by column `key`: the number a share is a percent of
     * and what a full bar stands for. Not a total the table shows. An entry may give just one of them. Whatever is
     * missing, a field or the whole entry, uses the sum or the largest value of the `rows` the table holds.
     */
    @property({ attribute: false })
    stats?: UauiTableStatsInput;

    /**
     * The text to search for. Set by the product, and by the table itself when a `search` event reaches it from a
     * `uaui-search-field` in the `toolbar`, `toolbar-start` or a `toolbar-[key]` slot. `client` mode only keeps the rows that match; `server` mode ignores it.
     */
    @property({ type: String })
    query = "";

    /**
     * Makes rows clickable and keyboard-reachable, and raises `row-click`. Set it when the product listens for
     * `row-click`: the table can't tell, so rows are plain until it's set.
     */
    @property({ type: Boolean, attribute: "clickable-rows" })
    clickableRows = false;

    /** Provides the columns, stats and compare lookup to the cells, as `UAUI_TABLE_CONTEXT`. */
    #context = new UauiTableContextController(this);
    #sorted?: { rows: UauiTableRow[]; sort: UauiTableSort; column: UauiTableColumn; lang: string; sortedRows: UauiTableRow[] };
    #derivedFrom?: DerivedFrom;
    #searched?: { rows: UauiTableRow[]; columns: UauiTableColumn[]; needle: string; lang: string; searchedRows: UauiTableRow[] };
    /** The compare rows by their `rowKey` value, rebuilt when `compareRows` or `rowKey` change. */
    #compareByKey = new Map<string, UauiTableRow>();

    protected override willUpdate(changed: PropertyValues<this>) {
        super.willUpdate(changed);
        const lang = this.localize.lang();
        const prev = this.#derivedFrom;
        if (!prev || prev.compareRows !== this.compareRows || prev.rowKey !== this.rowKey) {
            this.#compareByKey = indexCompareRows(this.compareRows, this.rowKey);
            this.#context.setCompare((item) => this.#compareRowFor(item));
        }
        if (
            !prev ||
            prev.columns !== this.columns ||
            prev.rows !== this.rows ||
            prev.stats !== this.stats ||
            prev.lang !== lang
        ) {
            this.#context.setColumns(this.columns);
            this.#context.setStats(computeStats(this.columns, this.rows, this.stats));
        }
        this.#derivedFrom = { columns: this.columns, rows: this.rows, compareRows: this.compareRows, rowKey: this.rowKey, stats: this.stats, lang };
    }

    /** The compare row that matches the row, or undefined when there is no `rowKey` or no matching row. */
    #compareRowFor(row: UauiTableRow): UauiTableRow | undefined {
        return findCompareRow(this.#compareByKey, this.rowKey, row);
    }

    /** The rows to draw: the searched rows, sorted, cut down to the current page in client mode. */
    get #visibleRows(): UauiTableRow[] {
        const rows = this.#sortedRows;
        if (this.mode !== "client") return rows;
        return pageOfRows(rows, this.#currentPage, this.#pageSize);
    }

    /** `pageSize`, or the default when it isn't a whole number of at least 1. */
    get #pageSize(): number {
        return normalizePageSize(this.pageSize);
    }

    /** A `search` event came from the toolbar slot or a column toolbar slot: take its query and go back to page 1, since the matches are other rows. */
    #onSearch = (event: Event) => {
        const query = (event as CustomEvent<UauiSearchDetail>).detail?.query;
        if (typeof query !== "string") return;
        this.query = query;
        this.page = 1;
    };

    /**
     * `rows` that contain `query`, in client mode, found once per change of rows, columns, query or language.
     * Without a query, and in server mode, it is `rows` itself. Never changes `rows`.
     */
    get #searchedRows(): UauiTableRow[] {
        const lang = this.localize.lang();
        const needle = searchNeedle(this.query, lang);
        if (this.mode !== "client" || !needle) return this.rows;
        const cached = this.#searched;
        if (cached && cached.rows === this.rows && cached.columns === this.columns && cached.needle === needle && cached.lang === lang) return cached.searchedRows;
        const searchedRows = searchRows(this.rows, this.columns, needle, lang);
        this.#searched = { rows: this.rows, columns: this.columns, needle, lang, searchedRows };
        return searchedRows;
    }

    /** How many rows there are across every page. */
    get #totalRows(): number {
        return countRows(this.mode, this.#searchedRows.length, this.rows.length, this.totalRows);
    }

    get #pageCount(): number {
        return pageCountOf(this.#totalRows, this.#pageSize);
    }

    /** `page`, kept between the first page and the last. */
    get #currentPage(): number {
        return clampPage(this.page, this.#pageCount);
    }

    /** The footer has nothing to offer when the rows fit the smallest size: even the smallest choice wouldn't make a second page. */
    get #showPager(): boolean {
        return showsPager(this.#totalRows, this.#pageSize);
    }

    /** The page sizes to offer: the standard ones, plus the current size when it's another number. */
    get #pageSizeOptions(): number[] {
        return pageSizeOptions(this.#pageSize);
    }

    /** Sets the page and size the editor chose, then raises `page-change` so a product can load them. */
    #changePage(page: number, pageSize: number) {
        this.page = page;
        this.pageSize = pageSize;
        this.dispatchEvent(new CustomEvent<UauiTablePageChangeDetail>("page-change", { bubbles: true, detail: { page, pageSize } }));
    }

    #onPagerChange(event: CustomEvent<UauiTablePageChangeDetail>) {
        this.#changePage(event.detail.page, event.detail.pageSize);
    }

    /** `rows` in the `sort` order in client mode, sorted once per change of rows, sort or language. Never reorders `rows` itself. */
    get #sortedRows(): UauiTableRow[] {
        const sort = this.mode === "client" ? this.sort : undefined;
        const column = sort ? this.columns.find((c) => c.key === sort.key) : undefined;
        const rows = this.#searchedRows;
        if (!sort || !column) return rows;
        const lang = this.localize.lang();
        const cached = this.#sorted;
        if (cached && cached.rows === rows && cached.sort === sort && cached.lang === lang && cached.column === column) return cached.sortedRows;
        const sortedRows = sortRows(rows, column, sort.direction, lang);
        this.#sorted = { rows, sort, lang, column, sortedRows };
        return sortedRows;
    }

    /** The first click on a column sorts numbers biggest first and text A to Z. Later clicks flip the direction. */
    #sortBy(column: UauiTableColumn) {
        const current = this.sort;
        const direction = nextSortDirection(current, column);
        this.sort = { key: column.key, direction };
        this.page = 1;
        this.dispatchEvent(new CustomEvent<UauiTableSortChangeDetail>("sort-change", { bubbles: true, detail: { key: column.key, direction } }));
    }

    /** Whether anything is slotted into `toolbar`. `:host(:has())` can't tell, and a slot can't be styled by its content. */
    get #hasToolbar(): boolean {
        return this.querySelector(':scope > [slot="toolbar"]') !== null;
    }

    /** Whether anything is slotted into `footer`, for the same reason as `#hasToolbar`. */
    get #hasFooterContent(): boolean {
        return this.querySelector(':scope > [slot="footer"]') !== null;
    }

    /** Whether anything is slotted into `toolbar-start` or a column's `toolbar-<key>` slot, for the same reason as `#hasToolbar`. */
    get #hasColumnToolbar(): boolean {
        if (this.columns.length === 0) return false;
        return (
            this.querySelector(`:scope > [slot="${START_SLOT}"]`) !== null ||
            this.columns.some((column) => this.querySelector(`:scope > [slot="${CSS.escape(`${SLOT_PREFIX}${column.key}`)}"]`) !== null)
        );
    }

    /** One cell element per row and column, reused while the column keeps its element name, as the CMS `umb-table` does. */
    #cellElements = new WeakMap<UauiTableRow, Map<string, HTMLElement>>();

    /** The element cached under `id`, created again when the column's element name has changed. */
    #cellElement(cache: Map<string, HTMLElement>, id: string, elementName: string): HTMLElement & Partial<UauiTableCellElement> {
        let element = cache.get(id);
        if (!element || element.tagName.toLowerCase() !== elementName.toLowerCase()) {
            element = document.createElement(elementName);
            cache.set(id, element);
        }
        return element;
    }

    #renderCell(column: UauiTableColumn, row: UauiTableRow): HTMLElement {
        let rowCache = this.#cellElements.get(row);
        if (!rowCache) {
            rowCache = new Map();
            this.#cellElements.set(row, rowCache);
        }
        const cell = this.#cellElement(rowCache, column.key, cellElementName(column));
        cell.column = column;
        cell.item = row;
        cell.value = row[column.key];
        return cell;
    }

    #renderHeaderCell(column: UauiTableColumn): TemplateResult {
        const align = column.align ?? "start";
        if (!column.sortable) return html`<uui-table-head-cell class=${align}>${column.label}</uui-table-head-cell>`;
        const active = this.sort?.key === column.key;
        const descending = this.sort?.direction === "desc";
        // The click handler is on the cell, so the whole header sorts. The button is what a keyboard reaches.
        return html`<uui-table-head-cell
            class="${align} sortable"
            aria-sort=${active ? (descending ? "descending" : "ascending") : "none"}
            @click=${() => this.#sortBy(column)}>
            <uaui-table-sort-button .active=${active} .descending=${descending} .align=${align}>${column.label}</uaui-table-sort-button>
        </uui-table-head-cell>`;
    }

    /** A click on a link, button or form control inside the row belongs to that control. */
    #isOnInteractive(event: Event, row: EventTarget | null): boolean {
        for (const target of event.composedPath()) {
            if (target === row) return false;
            if (target instanceof Element && INTERACTIVE_TAGS.has(target.tagName)) return true;
        }
        return false;
    }

    #raiseRowClick(row: UauiTableRow) {
        this.dispatchEvent(new CustomEvent<UauiTableRowClickDetail>("row-click", { bubbles: true, detail: { row } }));
    }

    #onRowClick(event: MouseEvent, row: UauiTableRow) {
        if (this.#isOnInteractive(event, event.currentTarget)) return;
        this.#raiseRowClick(row);
    }

    /** Enter or Space on the row itself, not on something inside it. Space is held back from scrolling the page. */
    #onRowKeydown(event: KeyboardEvent, row: UauiTableRow) {
        if (event.code !== "Enter" && event.code !== "Space") return;
        if (event.composedPath()[0] !== event.currentTarget) return;
        event.preventDefault();
        this.#raiseRowClick(row);
    }

    #renderRow(row: UauiTableRow): TemplateResult {
        const clickable = this.clickableRows;
        return html`<uui-table-row
            class=${clickable ? "clickable" : ""}
            tabindex=${ifDefined(clickable ? "0" : undefined)}
            @click=${clickable ? (event: MouseEvent) => this.#onRowClick(event, row) : undefined}
            @keydown=${clickable ? (event: KeyboardEvent) => this.#onRowKeydown(event, row) : undefined}>
            ${this.columns.map(
                (column) => html`<uui-table-cell class=${column.align ?? "start"}>${this.#renderCell(column, row)}</uui-table-cell>`,
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
    #renderSkeletonCell(column: UauiTableColumn, row: number): TemplateResult | HTMLElement {
        const elementName = cellElementName(column);
        const definition = customElements.get(elementName);
        if (!definition && !this.#waitingFor.has(elementName)) {
            this.#waitingFor.add(elementName);
            void customElements.whenDefined(elementName).then(() => {
                this.#waitingFor.delete(elementName);
                if (this.isConnected) this.requestUpdate();
            });
        }
        if (!definition || !("loading" in definition.prototype)) {
            return html`<uaui-table-skeleton-cell .align=${column.align ?? "start"}></uaui-table-skeleton-cell>`;
        }
        const cell = this.#cellElement(this.#skeletonElements, `${row}:${column.key}`, elementName);
        cell.column = column;
        cell.item = {};
        cell.value = undefined;
        cell.loading = true;
        return cell;
    }

    #renderSkeletonRow(index: number): TemplateResult {
        return html`<uui-table-row>
            ${this.columns.map((column, columnIndex) => {
                const align = column.align ?? "start";
                // Numbers sit at the end of their cell and are short, so their block is too.
                const width = align === "end" ? 40 : SKELETON_WIDTHS[(index + columnIndex) % SKELETON_WIDTHS.length];
                return html`<uui-table-cell class=${align} style="--_uaui-skeleton-width: ${width}%">
                    ${this.#renderSkeletonCell(column, index)}
                </uui-table-cell>`;
            })}
        </uui-table-row>`;
    }

    // The error state's `retry` stops at its shadow root, so the table raises its own.
    #onRetry() {
        this.dispatchEvent(new Event("retry", { bubbles: true }));
    }

    override render(): TemplateResult {
        const hasData = this.rows.length > 0;
        const mode = getLoadingMode(this.loading, hasData, this.error);
        const busy = isBusy(this.loading, this.error);
        const showColumnToolbar = this.#hasColumnToolbar && !this.error;
        return html`<div class="region ${this.#hasToolbar ? "has-toolbar" : ""} ${showColumnToolbar ? "has-column-toolbar" : ""}">
            ${mode === "reload" ? html`<uaui-loading-bar></uaui-loading-bar>` : nothing}
            <div class="toolbar"><slot name="toolbar" @slotchange=${() => this.requestUpdate()} @search=${this.#onSearch}></slot></div>
            <uui-table aria-busy=${busy ? "true" : "false"}>
                ${this.columns.map((column) => html`<uui-table-column style=${ifDefined(column.width ? `width: ${column.width}` : undefined)}></uui-table-column>`)}
                ${this.#renderColumnToolbar()}
                <uui-table-head>${this.columns.map((column) => this.#renderHeaderCell(column))}</uui-table-head>
                ${this.error
                    ? nothing
                    : mode === "skeleton"
                      ? Array.from({ length: SKELETON_ROWS }, (_, index) => this.#renderSkeletonRow(index))
                      : this.#visibleRows.map((row) => this.#renderRow(row))}
            </uui-table>
            ${this.error ? this.#renderErrorState() : this.#renderEmptyState(mode, hasData)}
            ${this.#renderFooter(this.#showPager && mode !== "skeleton" && !this.error)}
        </div>`;
    }

    /**
     * The column toolbar, above the headings: one cell per column, each a slot named `toolbar-<key>`, and the first cell also
     * has `toolbar-start`, before it. A column keyed `start` past the first has no slot, as its name is `toolbar-start`'s.
     * Always rendered, hidden while nothing is slotted for a column the table has, so the slots are there to raise
     * `slotchange` when content arrives later. The slots sit in the cells, so content lines up with its column. A `search`
     * from a slot drives the table.
     */
    #renderColumnToolbar(): TemplateResult {
        const slot = (name: string) => html`<slot name=${name} @slotchange=${() => this.requestUpdate()} @search=${this.#onSearch}></slot>`;
        return html`<uui-table-row class="column-toolbar" ?hidden=${!this.#hasColumnToolbar || this.error}>
            ${this.columns.map((column, index) => {
                const name = `${SLOT_PREFIX}${column.key}`;
                return html`<uui-table-cell class=${column.align ?? "start"}>
                    ${index === 0 ? slot(START_SLOT) : nothing}${name === START_SLOT ? nothing : slot(name)}
                </uui-table-cell>`;
            })}
        </uui-table-row>`;
    }

    #renderErrorState(): TemplateResult {
        return html`<uaui-error-state
            .headline=${this.errorHeadline}
            .description=${this.errorDescription}
            .retryable=${this.retryable}
            @retry=${this.#onRetry}></uaui-error-state>`;
    }

    /** "No results" when a query leaves no rows on screen (either mode), else the product's empty state when there are no rows. */
    #renderEmptyState(mode: ReturnType<typeof getLoadingMode>, hasData: boolean): TemplateResult | typeof nothing {
        const searching = typeof this.query === "string" && this.query.trim() !== "";
        if (mode !== "skeleton" && searching && this.#visibleRows.length === 0) {
            return html`<uaui-empty-state .headline=${this.localize.term("general_searchNoResult")} description=""></uaui-empty-state>`;
        }
        if (mode === "idle" && !hasData) {
            return html`<uaui-empty-state .headline=${this.emptyHeadline} .description=${this.emptyDescription}></uaui-empty-state>`;
        }
        return nothing;
    }

    /** The footer section owns the border, padding and placement, like the toolbar above the table. The pager is only its controls. */
    #renderFooter(showPager: boolean): TemplateResult {
        // Always rendered, so the slot is there to raise `slotchange` when content arrives later. Hidden when it has nothing to show.
        return html`<div class="footer" ?hidden=${!showPager && !this.#hasFooterContent}>
            <slot name="footer" @slotchange=${() => this.requestUpdate()}></slot>
            ${showPager
                ? html`<uaui-compact-pager
                      .page=${this.#currentPage}
                      .pageSize=${this.#pageSize}
                      .total=${this.#totalRows}
                      .pageSizes=${this.#pageSizeOptions}
                      @page-change=${this.#onPagerChange}></uaui-compact-pager>`
                : nothing}
        </div>`;
    }

    static override styles: CSSResultGroup = [
        UauiPaletteStyles,
        css`
            :host {
                display: block;
                --_uaui-skeleton-height: 14px;
                --_uaui-table-line: 20px;
                font-size: 13px;
                line-height: var(--_uaui-table-line);
            }

            .region {
                position: relative;
                /* A uui-box doesn't clip its content, so the last row would square off the box's rounded bottom corners. */
                overflow: clip;
                border-radius: 0 0 var(--uui-box-border-radius, var(--uui-border-radius-3)) var(--uui-box-border-radius, var(--uui-border-radius-3));
                /* The tallest content a body row holds, so a skeleton row and a loaded row are the same height. */
                --_uaui-table-content-height: var(--_uaui-table-line);
            }

            /* The toolbar pads itself, only when something is slotted, so the loading bar can span the full width. */
            .has-toolbar .toolbar {
                padding: var(--uaui-table-padding, var(--uui-size-space-4) var(--uui-size-space-6));
            }

            /* The footer slot grows on the left, so the pager stays on the right. */
            .footer {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: var(--uui-size-space-4);
                padding: var(--uaui-table-padding, var(--uui-size-space-4) var(--uui-size-space-6));
                border-top: 1px solid var(--uui-color-border);
            }

            .footer[hidden] {
                display: none;
            }

            .footer slot {
                display: block;
                flex: 1;
            }

            uaui-compact-pager {
                margin-left: auto;
            }

            uaui-loading-bar {
                z-index: 3;
            }

            /* uui-table draws its own border and corners. The surrounding box does both, edge to edge. */
            uui-table {
                border: none;
                border-radius: 0;
            }

            /*
             * UUI's head is a table-header-group, which a table always draws first, whatever the DOM order. As a plain
             * row it stays in place, so the column toolbar can sit above it. Outer styles beat UUI's :host rule.
             */
            uui-table-head {
                display: table-row;
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

            /* The heading row is bordered from whatever sits above it: a toolbar, or the column toolbar. */
            .has-toolbar uui-table-head-cell,
            .has-column-toolbar uui-table-head-cell {
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
                --_uaui-cell-inline-padding: var(--uui-size-5);
                --uui-table-cell-padding: var(--_uaui-cell-inline-padding);
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

            /*
             * The column toolbar is a band above the headings, like the toolbar: the cells keep their horizontal padding, which
             * is what lines content up with the column, and take the toolbar's vertical padding. The heading row draws the
             * line below it, and the row has a top line only under a toolbar.
             */
            uui-table-row.column-toolbar uui-table-cell {
                --uui-table-cell-padding: var(--uui-size-space-4) var(--_uaui-cell-inline-padding);
                border-top: none;
            }

            .has-toolbar uui-table-row.column-toolbar uui-table-cell {
                border-top: 1px solid var(--uui-color-border);
            }

            uui-table-row.column-toolbar[hidden] {
                display: none;
            }

            .start {
                text-align: start;
            }

            .end {
                text-align: end;
            }

            uaui-empty-state,
            uaui-error-state {
                border-top: 1px solid var(--uui-color-border);
            }
        `,
    ];
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-data-table": UauiDataTableElement;
    }
}
