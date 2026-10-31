// The table's row rules as pure functions: which rows match a search, their order, the page shown, the stats and the
// compare-row index. No Lit and no DOM, so each rule has a fast unit test. `uaui-data-table` caches the results.
import { asIsoDay, asNumber, asText } from "./cell-values.js";
import type {
    UauiTableColumn,
    UauiTableColumnStats,
    UauiTableMode,
    UauiTableSort,
    UauiTableSortDirection,
    UauiTableStats,
    UauiTableStatsInput,
} from "../types.js";

export type UauiTableRow = Record<string, unknown>;

/** The page sizes the footer offers. The first is also the size under which a table never needs a footer. */
export const PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = PAGE_SIZES[0];

/** The fields a `rowKey` names: the one field of a string, the non-empty names of an array. Empty without a key. */
export function rowKeyFields(rowKey: string | readonly string[] | undefined): string[] {
    if (typeof rowKey === "string") return rowKey ? [rowKey] : [];
    return Array.isArray(rowKey) ? rowKey.filter((field): field is string => typeof field === "string" && field !== "") : [];
}

/** One field's value as part of a key: strings and numbers as text. `undefined` for anything else. */
function keyPart(value: unknown): string | undefined {
    return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
}

/**
 * A row's identity for matching, from the `rowKeyFields`. One field: its value, strings and numbers only, so a row
 * without it, or with another kind of value, never matches (as before keys could have several fields). Several
 * fields: the values as a JSON array of text, so ["a b", "c"] and ["a", "b c"] differ. A missing field (`undefined`
 * or `null`) counts as empty text, so a product without a variant matches its own compare row; a row with none of the
 * fields, or a field of another kind, never matches.
 */
export function rowIdentity(row: UauiTableRow, fields: readonly string[]): string | undefined {
    if (fields.length === 0) return undefined;
    if (fields.length === 1) return keyPart(row[fields[0]]);
    const parts: string[] = [];
    let any = false;
    for (const field of fields) {
        const value = row[field];
        if (value === undefined || value === null) {
            parts.push("");
            continue;
        }
        const part = keyPart(value);
        if (part === undefined) return undefined;
        parts.push(part);
        any = true;
    }
    return any ? JSON.stringify(parts) : undefined;
}

/** The compare rows by their identity (`rowIdentity`). Empty without key fields. When several share a key, the last one wins. */
export function indexCompareRows(compareRows: UauiTableRow[], fields: readonly string[]): Map<string, UauiTableRow> {
    const byKey = new Map<string, UauiTableRow>();
    if (fields.length === 0) return byKey;
    for (const row of compareRows) {
        const key = rowIdentity(row, fields);
        if (key !== undefined) byKey.set(key, row);
    }
    return byKey;
}

/** The compare row that matches the row, or undefined when there are no key fields or no matching row. */
export function findCompareRow(index: ReadonlyMap<string, UauiTableRow>, fields: readonly string[], row: UauiTableRow): UauiTableRow | undefined {
    const key = rowIdentity(row, fields);
    return key === undefined ? undefined : index.get(key);
}

/** The text of the columns a search looks in. Text values only. */
function searchTextOf(row: UauiTableRow, columns: UauiTableColumn[]): string {
    return columns.map((column) => (typeof row[column.key] === "string" ? (row[column.key] as string) : "")).join("\n");
}

/** The query as searched for: trimmed and lower-cased in the language. Empty when there is nothing to search for. */
export function searchNeedle(query: unknown, lang: string): string {
    return typeof query === "string" ? query.trim().toLocaleLowerCase(lang) : "";
}

/**
 * The rows whose text contains the needle (from `searchNeedle`), ignoring case, in the `searchable` columns, or in
 * every column when none is marked. An empty needle gives `rows` itself. Never changes `rows`.
 */
export function searchRows(rows: UauiTableRow[], columns: UauiTableColumn[], needle: string, lang: string): UauiTableRow[] {
    if (!needle) return rows;
    const marked = columns.filter((column) => column.searchable);
    const searchColumns = marked.length > 0 ? marked : columns;
    return rows.filter((row) => searchTextOf(row, searchColumns).toLocaleLowerCase(lang).includes(needle));
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

/**
 * A copy of `rows` in the column's order: stable, with empty values last in both directions. `sortAs` picks
 * numbers, text (compared in the language, ignoring case and accents), dates (by their ISO day, so a value that isn't
 * one counts as empty) or the column's own comparer. Never changes `rows`.
 */
export function sortRows(rows: UauiTableRow[], column: UauiTableColumn, direction: UauiTableSortDirection, lang: string): UauiTableRow[] {
    const sortAs = column.sortAs ?? "text";
    const collator = getCollator(lang);
    const sign = direction === "desc" ? -1 : 1;
    const compare =
        typeof sortAs === "function"
            ? sortAs
            : sortAs === "number"
              ? (x: unknown, y: unknown) => (x as number) - (y as number)
              : sortAs === "date"
                ? // ISO days sort as plain strings: "2026-06-01" < "2026-06-12".
                  (x: unknown, y: unknown) => ((x as string) < (y as string) ? -1 : (x as string) > (y as string) ? 1 : 0)
                : (x: unknown, y: unknown) => collator.compare(String(x), String(y));
    const sortValue = (row: UauiTableRow): unknown => {
        const value = row[column.key];
        if (typeof sortAs === "function") return value ?? undefined;
        if (sortAs === "number") return asNumber(value);
        if (sortAs === "date") return asIsoDay(value);
        return asText(value) || undefined;
    };
    return [...rows].sort((a, b) => {
        const x = sortValue(a);
        const y = sortValue(b);
        // Empty values go last in both directions, so only real values flip with the sign.
        if (x === undefined || y === undefined) return x === y ? 0 : x === undefined ? 1 : -1;
        return sign * compare(x, y);
    });
}

/** The first click on a column sorts numbers biggest first and text A to Z. Later clicks flip the direction. */
export function nextSortDirection(current: UauiTableSort | undefined, column: UauiTableColumn): UauiTableSortDirection {
    if (current?.key === column.key) return current.direction === "asc" ? "desc" : "asc";
    return column.sortAs === "number" ? "desc" : "asc";
}

/** `pageSize`, or the default when it isn't a whole number of at least 1. */
export function normalizePageSize(pageSize: number): number {
    const size = Math.floor(pageSize);
    return Number.isFinite(size) && size >= 1 ? size : DEFAULT_PAGE_SIZE;
}

/**
 * How many rows there are across every page. `client` counts the rows that matched. `server` reads `totalRows`,
 * or counts the rows it holds when that isn't a number.
 */
export function countRows({ mode, matched, held, totalRows }: { mode: UauiTableMode; matched: number; held: number; totalRows?: number }): number {
    if (mode !== "server") return matched;
    const total = asNumber(totalRows);
    return total === undefined ? held : Math.max(0, Math.floor(total));
}

/** How many pages `total` rows make at the page size: at least one. */
export function pageCountOf(total: number, pageSize: number): number {
    return Math.max(1, Math.ceil(total / pageSize));
}

/** `page`, kept between the first page and the last. */
export function clampPage(page: number, pageCount: number): number {
    const whole = Math.floor(page);
    return Number.isFinite(whole) ? Math.min(Math.max(whole, 1), pageCount) : 1;
}

/** The rows of a page: `page` starts at 1 and is expected to be clamped already. */
export function pageOfRows(rows: UauiTableRow[], page: number, pageSize: number): UauiTableRow[] {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
}

/** The footer has nothing to offer when the rows fit the smallest size: even the smallest choice wouldn't make a second page. */
export function showsPager(total: number, pageSize: number): boolean {
    return total > Math.min(pageSize, PAGE_SIZES[0]);
}

/** The page sizes to offer: the standard ones, plus the current size when it's another number. */
export function pageSizeOptions(pageSize: number): number[] {
    return PAGE_SIZES.includes(pageSize) ? PAGE_SIZES : [...PAGE_SIZES, pageSize].sort((a, b) => a - b);
}

/** Each column's total and largest number, from `given` where it has them, else from the rows. A field `given` lacks falls back on its own. */
export function computeStats(columns: UauiTableColumn[], rows: UauiTableRow[], given?: UauiTableStatsInput): UauiTableStats {
    const stats: Record<string, UauiTableColumnStats> = {};
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
        const entry = given?.[key];
        total = asNumber(entry?.total) ?? total;
        max = asNumber(entry?.max) ?? max;
        if (any || entry !== undefined) stats[key] = { total, max };
    }
    return stats;
}
