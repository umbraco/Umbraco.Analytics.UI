import type { UauiColorSlot } from "../theme/types.js";
import type { UauiDeltaUnit } from "../delta-badge/delta-badge.element.js";

/**
 * Per-column settings that the cells and `uaui-table-compare-badge` read, so `UauiTableColumn` doesn't grow a field per cell.
 * Add your own keys for a custom cell of your own by merging into this interface:
 * `declare module "@umbraco/analytics-ui" { interface UauiTableColumnMeta { myKey?: string } }`. The block must sit in a file
 * with a top-level `import` or `export`, or TypeScript treats it as a new module instead of merging.
 */
export interface UauiTableColumnMeta {
    /** `uaui-link-cell`: the key in each row that holds the URL. A missing or unsafe URL shows the text without a link. */
    hrefKey?: string;
    /** `uaui-share-cell`: the palette slot of the bar (the same slots as `UauiSeries.color`). Defaults to the share column's position. */
    color?: UauiColorSlot;
    /** Whether a fall in this column is good, e.g. refund rate or duration. A compare badge then shows a fall as an improvement. */
    lowerIsBetter?: boolean;
    /**
     * What a compare badge measures the change in: `"percent"` (the default), the percent change, or `"points"`, the
     * difference in percentage points, for rate columns (a refund rate going from 5% to 6% is +1 pp, not +20%). Values
     * shown as percentages of a fraction (the percent cell, or `valueFormat.style: "percent"`) count 0.05 as 5%. Any
     * other value is read as `"percent"`.
     */
    deltaUnit?: UauiDeltaUnit;
}

/** One column of a `uaui-data-table`. */
export type UauiTableColumn = {
    /** The key in each row that holds this column's value. */
    key: string;
    /** The header text. */
    label: string;
    /**
     * The tag name of the cell element that shows this column's values. Defaults to `uaui-text-cell`. Use the
     * built-in names in `UAUI_TABLE_CELL` or your own element. Like the CMS `umb-table`, the table creates one
     * element per cell (and reuses it while the name stays the same) and sets `column`, `item` and `value` on it.
     * See `UauiTableCellElement`. Cells that need more than that read the table's `UAUI_TABLE_CONTEXT`.
     */
    elementName?: string;
    /** Settings the cells read: `hrefKey`, `color`, `lowerIsBetter`, `deltaUnit`. See `UauiTableColumnMeta`. */
    meta?: UauiTableColumnMeta;
    /** Formats the numbers of the number, percent and share cells, e.g. `{ style: "currency", currency: "EUR" }`. */
    valueFormat?: Intl.NumberFormatOptions;
    /** Text alignment of the header and cells. Defaults to `"start"`: numeric columns usually want `"end"`. */
    align?: "start" | "end";
    /** The column's width as a CSS length, e.g. `"27%"` or `"120px"`, as `uui-table-column` takes it. Without it the browser sizes the column. */
    width?: string;
    /** Whether the table's search looks in this column's values. Only text values are searched. */
    searchable?: boolean;
    /** Makes the header a button that sorts by this column. Clicking raises `sort-change`. */
    sortable?: boolean;
    /**
     * How the table sorts this column in `client` mode: `"number"` (non-numbers last), `"text"` (the editor's
     * culture, the default), or your own compare function on two cell values, which sorts ascending. Missing
     * values (`undefined` or `null`) always go last. The first click sorts `"number"` columns biggest first, others ascending.
     */
    sortAs?: "number" | "text" | ((a: unknown, b: unknown) => number);
};

/**
 * What a table cell element receives, as in the CMS `umb-table`: the table sets these three properties on every
 * cell element, a built-in one (`uaui-text-cell` and the others) or the one a column names in `elementName`.
 */
export interface UauiTableCellElement {
    /** The column the cell is in. */
    column: UauiTableColumn;
    /** The row the cell is in. */
    item: Record<string, unknown>;
    /** The row's value for the column: `item[column.key]`. */
    value: unknown;
    /**
     * Set to `true`, with no `value`, while the table shows its loading rows. A cell that has this property draws
     * its own placeholder, as tall as a loaded cell, so the table doesn't jump. Cells without it get a generic
     * one-line placeholder.
     */
    loading?: boolean;
}

/** The direction of a sort. */
export type UauiTableSortDirection = "asc" | "desc";

/** The column a table is sorted by, and which way. */
export type UauiTableSort = {
    /** The `key` of a column. */
    key: string;
    direction: UauiTableSortDirection;
};

/** How a table handles sorting: `client` sorts the rows it's given, `server` leaves the order to the product. */
export type UauiTableMode = "client" | "server";

/** The detail of the `sort-change` event: the column the editor chose and the direction to sort it in. */
export type UauiTableSortChangeDetail = UauiTableSort;

/** The detail of the `page-change` event: the page and page size the editor chose. `page` starts at 1. */
export type UauiTablePageChangeDetail = {
    page: number;
    pageSize: number;
};

/** The detail of the `row-click` event: the row the editor opened, the same object the table was given in `rows`. */
export type UauiTableRowClickDetail = {
    row: Record<string, unknown>;
};

/** What `UAUI_TABLE_CONTEXT` knows about one column's numbers. */
export type UauiTableColumnStats = {
    /** The sum of the column's values, or the table's `stats` entry for it. What a share is a percent of. */
    total: number;
    /** The largest of the column's values, or the table's `stats` entry for it. What a full bar stands for. */
    max: number;
};

/** The stats of every column, by column `key`, as `UAUI_TABLE_CONTEXT` gives them: every field worked out. */
export type UauiTableStats = Readonly<Record<string, UauiTableColumnStats>>;

/**
 * The stats a product gives the table, by column `key`. Each entry may hold `total`, `max`, both or neither: a field
 * left out is worked out from the rows the table holds, as it is for a column with no entry at all.
 */
export type UauiTableStatsInput = Readonly<Record<string, Partial<UauiTableColumnStats>>>;

/** Finds the compare-period row that matches a row, by the table's `rowKey`. `undefined` when there is none. */
export type UauiTableCompareLookup = (item: Record<string, unknown>) => Record<string, unknown> | undefined;
