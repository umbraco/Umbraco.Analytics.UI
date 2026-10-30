/** How a column's values are shown. */
export type UaxTableColumnType = "text" | "link" | "number" | "percent" | "share";

/** One column of a `uax-data-table`. */
export type UaxTableColumn = {
    /** The key in each row that holds this column's value. */
    key: string;
    /** The header text. */
    label: string;
    /**
     * - `text`: the value as plain text.
     * - `link`: the value as an anchor. The `href` comes from the row's `hrefKey` value.
     * - `number`: a number in the editor's culture, right-aligned by default.
     * - `percent`: a fraction (0.25 is "25%"), right-aligned by default.
     * - `share`: the number, its percent of the column's total, and a bar scaled to the column's largest value.
     */
    type: UaxTableColumnType;
    /** `link` columns: the key in each row that holds the URL. A missing or unsafe URL shows the text without a link. */
    hrefKey?: string;
    /** Formats `number`, `percent` and `share` values, e.g. `{ style: "currency", currency: "EUR" }`. */
    valueFormat?: Intl.NumberFormatOptions;
    /** Text alignment of the header and cells. Defaults to `"end"` for `number` and `percent`, else `"start"`. */
    align?: "start" | "end";
    /** `share` columns: the palette slot of the bar (the same slots as `UaxSeries.color`). Defaults to the share column's position. */
    color?: 1 | 2 | 3 | 4;
    /** Makes the header a button that sorts by this column. Clicking raises `sort-change`. */
    sortable?: boolean;
    /**
     * The tag name of your own cell element, used instead of the built-in one for `type`. Like the CMS
     * `umb-table`, the table creates one element per cell (and reuses it while the name stays the same) and
     * sets `column`, `item` and `value` on it. See `UaxTableCellElement`. `type` still decides alignment and sorting.
     */
    elementName?: string;
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
