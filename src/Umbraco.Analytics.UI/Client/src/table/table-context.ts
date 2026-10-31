import { UmbContextToken, type UmbContextMinimal } from "@umbraco-cms/backoffice/context-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import type { UauiTableColumn, UauiTableCompareLookup, UauiTableStats } from "./types.js";

/**
 * What a `uaui-data-table` tells the cells inside it. Cells read the table-wide numbers they can't work out
 * from their own row. Every value is observable, so a cell updates when the table's rows or columns change.
 */
export interface UauiTableContext extends UmbContextMinimal {
    /** The columns, left to right. */
    readonly columns: Observable<UauiTableColumn[]>;
    /** Each column's total and largest value, by column `key`, honouring the table's `stats`, each field falling back to the rows when it gives none. */
    readonly stats: Observable<UauiTableStats>;
    /** Finds a row's compare-period row, by the table's `rowKey`. Replaced when `compare-rows` or `row-key` change. */
    readonly compare: Observable<UauiTableCompareLookup>;
}

/** The context a `uaui-data-table` provides to its cells. */
export const UAUI_TABLE_CONTEXT = new UmbContextToken<UauiTableContext>("UauiTableContext");
