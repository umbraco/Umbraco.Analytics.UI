import { describe, expect, it } from "vitest";
import type { UauiTableColumn } from "../types.js";
import {
    PAGE_SIZES,
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
} from "./table-rows.js";

const col = (key: string, extra: Partial<UauiTableColumn> = {}): UauiTableColumn => ({ key, label: key, ...extra });
const numbered = (count: number) => Array.from({ length: count }, (_, i) => ({ id: i + 1 }));
const ids = (rows: Record<string, unknown>[]) => rows.map((row) => row.id);

describe("Feature: the table's row rules", () => {
    describe("Scenario: searching rows", () => {
        const rows = [
            { id: 1, name: "Alpha", note: "red" },
            { id: 2, name: "Beta", note: "alpha blue" },
            { id: 3, name: "Gamma", note: "green" },
        ];
        const columns = [col("name"), col("note")];

        it("keeps the rows that contain the needle in a column's text", () => {
            expect(ids(searchRows(rows, columns, "beta", "en"))).toEqual([2]);
        });
        it("looks only in the searchable columns when some are marked", () => {
            expect(ids(searchRows(rows, [col("name", { searchable: true }), col("note")], "alpha", "en"))).toEqual([1]);
        });
        it("looks in every column when none is marked", () => {
            expect(ids(searchRows(rows, columns, "alpha", "en"))).toEqual([1, 2]);
        });
        it("ignores case", () => {
            expect(ids(searchRows(rows, columns, searchNeedle("GAMMA", "en"), "en"))).toEqual([3]);
        });
        it("trims the query", () => {
            expect(searchNeedle("  Gamma  ", "en")).toBe("gamma");
        });
        it("lower-cases in the language's rules", () => {
            expect(searchNeedle("I", "tr")).toBe("ı");
        });
        it("keeps accents significant", () => {
            expect(ids(searchRows([{ id: 1, name: "café" }, { id: 2, name: "cafe" }], [col("name")], "café", "en"))).toEqual([1]);
        });
        it("ignores values that aren't text", () => {
            expect(ids(searchRows([{ id: 1, name: 42 }], [col("name")], "42", "en"))).toEqual([]);
        });
        it("gives rows itself for an empty needle", () => {
            expect(searchRows(rows, columns, "", "en")).toBe(rows);
        });
        it("gives an empty needle for a blank query", () => {
            expect(searchNeedle("   ", "en")).toBe("");
        });
        it("gives an empty needle for a query that isn't text", () => {
            expect(searchNeedle(undefined, "en")).toBe("");
        });
        it("gives no rows when nothing matches", () => {
            expect(searchRows(rows, columns, "zzz", "en")).toEqual([]);
        });
        it("never changes rows", () => {
            searchRows(rows, columns, "beta", "en");
            expect(rows).toHaveLength(3);
        });
    });

    describe("Scenario: sorting rows", () => {
        it("sorts text ascending", () => {
            const rows = [{ id: 1, v: "b" }, { id: 2, v: "c" }, { id: 3, v: "a" }];
            expect(ids(sortRows(rows, col("v"), "asc", "en"))).toEqual([3, 1, 2]);
        });
        it("sorts text descending", () => {
            const rows = [{ id: 1, v: "b" }, { id: 2, v: "c" }, { id: 3, v: "a" }];
            expect(ids(sortRows(rows, col("v"), "desc", "en"))).toEqual([2, 1, 3]);
        });
        it("sorts numbers as numbers, not text, with sortAs number", () => {
            const rows = [{ id: 1, v: 10 }, { id: 2, v: 9 }, { id: 3, v: 100 }];
            expect(ids(sortRows(rows, col("v", { sortAs: "number" }), "asc", "en"))).toEqual([2, 1, 3]);
        });
        it("sorts numbers as text by default", () => {
            const rows = [{ id: 1, v: 10 }, { id: 2, v: 9 }, { id: 3, v: 100 }];
            expect(ids(sortRows(rows, col("v"), "asc", "en"))).toEqual([1, 3, 2]);
        });
        it("sorts with the column's own comparer", () => {
            const rows = [{ id: 1, v: "aaa" }, { id: 2, v: "b" }, { id: 3, v: "cc" }];
            const byLength = (a: unknown, b: unknown) => (a as string).length - (b as string).length;
            expect(ids(sortRows(rows, col("v", { sortAs: byLength }), "asc", "en"))).toEqual([2, 3, 1]);
        });
        it("keeps equal rows in their order, ascending", () => {
            const rows = [{ id: 1, v: "a" }, { id: 2, v: "a" }, { id: 3, v: "a" }];
            expect(ids(sortRows(rows, col("v"), "asc", "en"))).toEqual([1, 2, 3]);
        });
        it("keeps equal rows in their order, descending", () => {
            const rows = [{ id: 1, v: "a" }, { id: 2, v: "a" }, { id: 3, v: "a" }];
            expect(ids(sortRows(rows, col("v"), "desc", "en"))).toEqual([1, 2, 3]);
        });
        it("puts empty values last, ascending", () => {
            const rows = [{ id: 1 }, { id: 2, v: "b" }, { id: 3, v: "a" }];
            expect(ids(sortRows(rows, col("v"), "asc", "en"))).toEqual([3, 2, 1]);
        });
        it("puts empty values last, descending", () => {
            const rows = [{ id: 1 }, { id: 2, v: "b" }, { id: 3, v: "a" }];
            expect(ids(sortRows(rows, col("v"), "desc", "en"))).toEqual([2, 3, 1]);
        });
        it("treats a non-finite number as empty with sortAs number", () => {
            const rows = [{ id: 1, v: Number.NaN }, { id: 2, v: 2 }, { id: 3, v: 1 }];
            expect(ids(sortRows(rows, col("v", { sortAs: "number" }), "asc", "en"))).toEqual([3, 2, 1]);
        });
        it("compares text in the language, ignoring case and accents", () => {
            const rows = [{ id: 1, v: "b" }, { id: 2, v: "Á" }, { id: 3, v: "a" }];
            expect(ids(sortRows(rows, col("v"), "asc", "en"))).toEqual([2, 3, 1]);
        });
        it("orders letters by the language's alphabet", () => {
            const rows = [{ id: 1, v: "z" }, { id: 2, v: "å" }, { id: 3, v: "a" }];
            expect(ids(sortRows(rows, col("v"), "asc", "da"))).toEqual([3, 1, 2]);
        });
        it("never changes rows", () => {
            const rows = [{ id: 1, v: "b" }, { id: 2, v: "a" }];
            sortRows(rows, col("v"), "asc", "en");
            expect(ids(rows)).toEqual([1, 2]);
        });
    });

    describe("Scenario: the next sort direction", () => {
        it("starts text columns ascending", () => {
            expect(nextSortDirection(undefined, col("v"))).toBe("asc");
        });
        it("starts number columns descending", () => {
            expect(nextSortDirection(undefined, col("v", { sortAs: "number" }))).toBe("desc");
        });
        it("flips ascending to descending on the sorted column", () => {
            expect(nextSortDirection({ key: "v", direction: "asc" }, col("v"))).toBe("desc");
        });
        it("flips descending to ascending on the sorted column", () => {
            expect(nextSortDirection({ key: "v", direction: "desc" }, col("v", { sortAs: "number" }))).toBe("asc");
        });
        it("starts afresh when another column is sorted", () => {
            expect(nextSortDirection({ key: "other", direction: "asc" }, col("v", { sortAs: "number" }))).toBe("desc");
        });
    });

    describe("Scenario: the page shown", () => {
        it("cuts the rows to the page window", () => {
            expect(ids(pageOfRows(numbered(25), 2, 10))).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
        });
        it("shrinks the last page to what is left", () => {
            expect(ids(pageOfRows(numbered(25), 3, 10))).toEqual([21, 22, 23, 24, 25]);
        });
        it("counts the pages", () => {
            expect(pageCountOf(25, 10)).toBe(3);
        });
        it("has one page for no rows", () => {
            expect(pageCountOf(0, 10)).toBe(1);
        });
        it("has fewer pages for a bigger page size", () => {
            expect(pageCountOf(25, 50)).toBe(1);
        });
        it("keeps a page that exists", () => {
            expect(clampPage(2, 3)).toBe(2);
        });
        it("clamps a page past the end to the last", () => {
            expect(clampPage(9, 3)).toBe(3);
        });
        it("clamps a page below 1 to the first", () => {
            expect(clampPage(0, 3)).toBe(1);
        });
        it("rounds a fractional page down", () => {
            expect(clampPage(2.7, 3)).toBe(2);
        });
        it("falls back to the first page for NaN", () => {
            expect(clampPage(Number.NaN, 3)).toBe(1);
        });
        it("reads the last page again after the page size grows", () => {
            expect(clampPage(3, pageCountOf(25, 50))).toBe(1);
        });
        it("keeps a whole page size of at least 1", () => {
            expect(normalizePageSize(25)).toBe(25);
        });
        it("rounds a fractional page size down", () => {
            expect(normalizePageSize(12.9)).toBe(12);
        });
        it("falls back to the default page size for 0", () => {
            expect(normalizePageSize(0)).toBe(10);
        });
        it("falls back to the default page size for NaN", () => {
            expect(normalizePageSize(Number.NaN)).toBe(10);
        });
        it("offers the standard page sizes", () => {
            expect(pageSizeOptions(25)).toEqual([10, 25, 50, 100]);
        });
        it("adds a custom page size in order", () => {
            expect(pageSizeOptions(30)).toEqual([10, 25, 30, 50, 100]);
        });
        it("never changes the standard sizes", () => {
            pageSizeOptions(30);
            expect(PAGE_SIZES).toEqual([10, 25, 50, 100]);
        });
    });

    describe("Scenario: counting rows", () => {
        it("counts the matched rows in client mode", () => {
            expect(countRows({ mode: "client", matched: 7, held: 20, totalRows: 500 })).toBe(7);
        });
        it("reads total-rows in server mode", () => {
            expect(countRows({ mode: "server", matched: 7, held: 20, totalRows: 500 })).toBe(500);
        });
        it("counts the held rows in server mode without total-rows", () => {
            expect(countRows({ mode: "server", matched: 7, held: 20, totalRows: undefined })).toBe(20);
        });
        it("floors a fractional total-rows", () => {
            expect(countRows({ mode: "server", matched: 7, held: 20, totalRows: 99.9 })).toBe(99);
        });
        it("never goes below 0", () => {
            expect(countRows({ mode: "server", matched: 7, held: 20, totalRows: -5 })).toBe(0);
        });
        it("counts the held rows for a total-rows that isn't a number", () => {
            expect(countRows({ mode: "server", matched: 7, held: 20, totalRows: Number.NaN })).toBe(20);
        });
    });

    describe("Scenario: whether the pager shows", () => {
        it("shows for more rows than the smallest page size", () => {
            expect(showsPager(11, 10)).toBe(true);
        });
        it("hides for rows that fit the smallest page size", () => {
            expect(showsPager(10, 10)).toBe(false);
        });
        it("shows for a smaller page size that would make a second page", () => {
            expect(showsPager(5, 3)).toBe(true);
        });
        it("hides for a bigger page size when the rows fit the smallest", () => {
            expect(showsPager(8, 50)).toBe(false);
        });
        it("shows for a bigger page size when the rows exceed the smallest", () => {
            expect(showsPager(30, 50)).toBe(true);
        });
        it("hides for no rows", () => {
            expect(showsPager(0, 10)).toBe(false);
        });
    });

    describe("Scenario: column stats", () => {
        const columns = [col("n")];

        it("works the total and max out from the rows", () => {
            expect(computeStats(columns, [{ n: 1 }, { n: 5 }, { n: 3 }])).toEqual({ n: { total: 9, max: 5 } });
        });
        it("takes a given total and works the max out", () => {
            expect(computeStats(columns, [{ n: 1 }, { n: 5 }], { n: { total: 100 } })).toEqual({ n: { total: 100, max: 5 } });
        });
        it("takes a given max and works the total out", () => {
            expect(computeStats(columns, [{ n: 1 }, { n: 5 }], { n: { max: 50 } })).toEqual({ n: { total: 6, max: 50 } });
        });
        it("takes both when both are given", () => {
            expect(computeStats(columns, [{ n: 1 }], { n: { total: 100, max: 50 } })).toEqual({ n: { total: 100, max: 50 } });
        });
        it("works out a given entry that holds neither", () => {
            expect(computeStats(columns, [{ n: 1 }, { n: 5 }], { n: {} })).toEqual({ n: { total: 6, max: 5 } });
        });
        it("uses a given entry for a column with no numbers", () => {
            expect(computeStats(columns, [], { n: { total: 100, max: 50 } })).toEqual({ n: { total: 100, max: 50 } });
        });
        it("falls back to 0 for the field a given entry lacks when the rows have no numbers", () => {
            expect(computeStats(columns, [], { n: { total: 100 } })).toEqual({ n: { total: 100, max: 0 } });
        });
        it("leaves out a column with no numbers and no entry", () => {
            expect(computeStats(columns, [{ n: "x" }])).toEqual({});
        });
        it("skips values that aren't finite numbers", () => {
            expect(computeStats(columns, [{ n: 2 }, { n: Number.NaN }, { n: "7" }])).toEqual({ n: { total: 2, max: 2 } });
        });
        it("ignores a given field that isn't a number", () => {
            expect(computeStats(columns, [{ n: 2 }], { n: { total: Number.NaN } })).toEqual({ n: { total: 2, max: 2 } });
        });
        it("gives one entry per column", () => {
            expect(computeStats([col("a"), col("b")], [{ a: 1, b: 2 }])).toEqual({ a: { total: 1, max: 1 }, b: { total: 2, max: 2 } });
        });
    });

    describe("Scenario: matching compare rows", () => {
        const compareRows = [{ url: "/a", v: 1 }, { url: "/b", v: 2 }, { url: "/a", v: 3 }, { url: 7, v: 4 }, { v: 5 }];

        it("finds the compare row with the same row-key value", () => {
            expect(findCompareRow(indexCompareRows(compareRows, "url"), "url", { url: "/b" })).toBe(compareRows[1]);
        });
        it("takes the last compare row when several share a key", () => {
            expect(findCompareRow(indexCompareRows(compareRows, "url"), "url", { url: "/a" })).toBe(compareRows[2]);
        });
        it("matches a number key as text", () => {
            expect(findCompareRow(indexCompareRows(compareRows, "url"), "url", { url: "7" })).toBe(compareRows[3]);
        });
        it("has no match for a key the compare rows lack", () => {
            expect(findCompareRow(indexCompareRows(compareRows, "url"), "url", { url: "/zzz" })).toBe(undefined);
        });
        it("has no match for a row without the key", () => {
            expect(findCompareRow(indexCompareRows(compareRows, "url"), "url", {})).toBe(undefined);
        });
        it("has no match for a key that isn't text or a number", () => {
            expect(findCompareRow(indexCompareRows(compareRows, "url"), "url", { url: {} })).toBe(undefined);
        });
        it("indexes nothing without a row-key", () => {
            expect(indexCompareRows(compareRows).size).toBe(0);
        });
        it("has no match without a row-key", () => {
            expect(findCompareRow(indexCompareRows(compareRows, "url"), undefined, { url: "/a" })).toBe(undefined);
        });
        it("skips compare rows without the key when indexing", () => {
            expect(indexCompareRows(compareRows, "url").size).toBe(3);
        });
    });
});
