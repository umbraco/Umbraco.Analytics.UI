import { UmbContextToken, type UmbContextMinimal } from "@umbraco-cms/backoffice/context-api";
import type { Observable } from "@umbraco-cms/backoffice/external/rxjs";
import type { UaxTableColumn, UaxTableCompareLookup, UaxTableStats } from "./types.js";

/**
 * What a `uax-data-table` tells the cells inside it. Cells read the table-wide numbers they can't work out
 * from their own row. Every value is observable, so a cell updates when the table's rows or columns change.
 */
export interface UaxTableContext extends UmbContextMinimal {
    /** The columns, left to right. */
    readonly columns: Observable<UaxTableColumn[]>;
    /** Each column's total and largest value, by column `key`, honouring the table's `stats`. */
    readonly stats: Observable<UaxTableStats>;
    /** Finds a row's compare-period row, by the table's `rowKey`. Replaced when `compare-rows` or `row-key` change. */
    readonly compare: Observable<UaxTableCompareLookup>;
}

/** The context a `uax-data-table` provides to its cells. */
export const UAX_TABLE_CONTEXT = new UmbContextToken<UaxTableContext>("UaxTableContext");
