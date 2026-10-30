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
};
