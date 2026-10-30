/** One column of a `uax-data-table`. */
export type UaxTableColumn = {
    /** The key in each row that holds this column's value. */
    key: string;
    /** The header text. */
    label: string;
    /**
     * The tag name of the cell element that shows this column's values. Defaults to `uax-text-cell`. Use the
     * built-in names in `UAX_TABLE_CELL` or your own element. Like the CMS `umb-table`, the table creates one
     * element per cell (and reuses it while the name stays the same) and sets `column`, `item` and `value` on it.
     * See `UaxTableCellElement`. Cells that need more than that read the table's `UAX_TABLE_CONTEXT`.
     */
    elementName?: string;
    /** `uax-link-cell`: the key in each row that holds the URL. A missing or unsafe URL shows the text without a link. */
    hrefKey?: string;
    /** Formats the numbers of the number, percent and share cells, e.g. `{ style: "currency", currency: "EUR" }`. */
    valueFormat?: Intl.NumberFormatOptions;
    /** Text alignment of the header and cells. Defaults to `"start"`: numeric columns usually want `"end"`. */
    align?: "start" | "end";
    /** `uax-share-cell`: the palette slot of the bar (the same slots as `UaxSeries.color`). Defaults to the share column's position. */
    color?: 1 | 2 | 3 | 4;
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
 * cell element, a built-in one (`uax-text-cell` and the others) or the one a column names in `elementName`.
 */
export interface UaxTableCellElement {
    /** The column the cell is in. */
    column: UaxTableColumn;
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
export type UaxTableSortDirection = "asc" | "desc";

/** The column a table is sorted by, and which way. */
export type UaxTableSort = {
    /** The `key` of a column. */
    key: string;
    direction: UaxTableSortDirection;
};

/** How a table handles sorting: `client` sorts the rows it's given, `server` leaves the order to the product. */
export type UaxTableMode = "client" | "server";

/** The detail of the `sort-change` event: the column the editor chose and the direction to sort it in. */
export type UaxTableSortChangeDetail = UaxTableSort;

/** The detail of the `page-change` event: the page and page size the editor chose. `page` starts at 1. */
export type UaxTablePageChangeDetail = {
    page: number;
    pageSize: number;
};

/** What `UAX_TABLE_CONTEXT` knows about one column's numbers. */
export type UaxTableColumnStats = {
    /** The sum of the column's values, or the table's `totals` entry for it. What a share is a percent of. */
    total: number;
    /** The largest of the column's values, or the table's `maxes` entry for it. What a full bar stands for. */
    max: number;
};

/** The stats of every column, by column `key`. */
export type UaxTableStats = Readonly<Record<string, UaxTableColumnStats>>;

/** Finds the compare-period row that matches a row, by the table's `rowKey`. `undefined` when there is none. */
export type UaxTableCompareLookup = (item: Record<string, unknown>) => Record<string, unknown> | undefined;
