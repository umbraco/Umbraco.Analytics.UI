import type { UauiCategory, UauiCategorySeries, UauiSeries } from "../../../chart/types.js";
import { uauiBucketsFor, type UauiDateSpan } from "../../../date-helpers/index.js";
import type { UauiGroupBy } from "../../../group-by/group-by.element.js";
import type { UauiFunnelStep } from "../../../funnel/types.js";
import type { UauiColorSlot, UauiStatusColor } from "../../../theme/types.js";
import type { FormsAnalyticsResult, FormsColumn } from "./forms-fake-data.js";

// #region adapter
// Forms' analytics API answers every query as a table: `columns` names each value, `rows` holds the values in that
// order. These functions turn an answer into what the package's elements take: rows keyed by column for
// `uaui-data-table`, series for `uaui-time-series-chart` and `uaui-category-chart`, steps for `uaui-funnel`. They read columns by name, never
// by position, so a query that asks for other columns still maps.

/** The answer's rows as objects keyed by column name, for `uaui-data-table`'s `rows` (and `compareRows`). */
export function formsRows(result: FormsAnalyticsResult): Record<string, unknown>[] {
    return result.rows.map((row) => Object.fromEntries(result.columns.map((column, i) => [column, row[i]])));
}

/** The first date column of an answer: `date`, or a `week` or `month` bucket. */
const dateIndex = (result: FormsAnalyticsResult) => result.columns.findIndex((c) => c === "date" || c === "week" || c === "month");

/** Forms answers .NET date-times ("2026-06-01T00:00:00"); the chart takes the day. */
const dayOf = (value: unknown) => String(value).slice(0, 10);

/** A metric column to plot as one series. */
export type FormsSeriesSpec = { column: FormsColumn; label: string; color?: UauiColorSlot | UauiStatusColor };

/** One series per metric column of a time answer (`[date, ...metrics]` rows), for `uaui-time-series-chart`. */
export function formsSeries(result: FormsAnalyticsResult, specs: FormsSeriesSpec[]): UauiSeries[] {
    const at = dateIndex(result);
    if (at < 0 || !result.rows.length) return [];
    return specs.flatMap(({ column, label, color }) => {
        const i = result.columns.indexOf(column);
        if (i < 0) return [];
        return [{ id: column, label, ...(color ? { color } : {}), points: result.rows.map((row) => ({ date: dayOf(row[at]), value: Number(row[i]) || 0 })) }];
    });
}

/**
 * A rate between two metric columns of a time answer, in % (0 to 100), as one series. A bucket with nothing to
 * divide by has no point, so the chart leaves a gap rather than drawing 0%.
 */
export function formsRateSeries(result: FormsAnalyticsResult, id: string, label: string, part: FormsColumn, whole: FormsColumn): UauiSeries[] {
    const at = dateIndex(result);
    const p = result.columns.indexOf(part);
    const w = result.columns.indexOf(whole);
    if (at < 0 || p < 0 || w < 0 || !result.rows.length) return [];
    const points = result.rows.flatMap((row) => {
        const divisor = Number(row[w]);
        return divisor ? [{ date: dayOf(row[at]), value: (Number(row[p]) / divisor) * 100 }] : [];
    });
    return [{ id, label, points }];
}

/**
 * One series per value of a dimension column, from `[date, name, value]` rows, as Forms' origins answer: one line per
 * source page. Forms names the page but sends no id, so the name is the series id (and matches the compare line).
 */
export function formsSeriesBy(result: FormsAnalyticsResult, dimension: FormsColumn, metric: FormsColumn): UauiSeries[] {
    const at = dateIndex(result);
    const d = result.columns.indexOf(dimension);
    const m = result.columns.indexOf(metric);
    if (at < 0 || d < 0 || m < 0) return [];
    const byName = new Map<string, UauiSeries>();
    for (const row of result.rows) {
        const name = String(row[d]);
        const series = byName.get(name) ?? { id: name, label: name, points: [] };
        series.points.push({ date: dayOf(row[at]), value: Number(row[m]) || 0 });
        byName.set(name, series);
    }
    return [...byName.values()];
}

/**
 * The 24 hours of the day as `uaui-category-chart` categories: ids "0" to "23", as Forms' `hour` column answers them,
 * labelled in the editor's culture ("2 PM", "14"). The hour is the answer's, so it is formatted as is, in UTC.
 */
export function formsHours(lang: string): UauiCategory[] {
    const format = new Intl.DateTimeFormat(lang, { hour: "numeric", timeZone: "UTC" });
    return Array.from({ length: 24 }, (_, hour) => ({ id: String(hour), label: format.format(Date.UTC(2026, 0, 1, hour)) }));
}

/**
 * One category series from `[hour, metric]` rows, for `uaui-category-chart` over `formsHours`. Forms leaves out an hour
 * with nothing in it; for a count that is 0, so every hour gets a point. Empty when the answer has no rows.
 */
export function formsHourSeries(result: FormsAnalyticsResult | undefined, column: FormsColumn, label: string): UauiCategorySeries[] {
    const h = result ? result.columns.indexOf("hour") : -1;
    const m = result ? result.columns.indexOf(column) : -1;
    if (!result || h < 0 || m < 0 || !result.rows.length) return [];
    const byHour = new Map(result.rows.map((row) => [String(row[h]), Number(row[m]) || 0]));
    return [{ id: column, label, points: Array.from({ length: 24 }, (_, hour) => ({ category: String(hour), value: byHour.get(String(hour)) ?? 0 })) }];
}

/** The sum of a metric column over every row of an answer. */
export function formsTotal(result: FormsAnalyticsResult | undefined, column: FormsColumn): number {
    const i = result ? result.columns.indexOf(column) : -1;
    return i < 0 ? 0 : result!.rows.reduce((sum, row) => sum + (Number(row[i]) || 0), 0);
}

/**
 * Funnel steps from `[state, entries]` rows, in the order of `labels`. A state missing from the answer is not a step:
 * a single-page form has no "partially submitted".
 */
export function formsSteps(result: FormsAnalyticsResult | undefined, labels: { state: string; label: string }[]): UauiFunnelStep[] {
    if (!result) return [];
    const rows = formsRows(result);
    return labels.flatMap(({ state, label }) => {
        const row = rows.find((r) => r.state === state);
        return row ? [{ id: state, label, value: Number(row.entries) || 0 }] : [];
    });
}

/**
 * Adds a daily answer's rows up into the group-by's buckets, each dated at its first day, as Forms' own chart does on
 * the client: Forms' API answers days only. Rows that share a bucket and their other (text) columns, such as a page
 * name, are added together. Only for counts: a rate or a distinct count (unique members) doesn't add up, so ask the
 * server for those per bucket. The answer keeps its `date` column and its shape.
 */
export function formsBucketed(result: FormsAnalyticsResult, range: UauiDateSpan, groupBy: UauiGroupBy): FormsAnalyticsResult {
    const at = result.columns.indexOf("date");
    if (at < 0 || groupBy === "day") return result;
    const bucketOf = new Map<string, string>();
    for (const bucket of uauiBucketsFor(range, groupBy)) for (const day of bucket.days) bucketOf.set(day, bucket.start);
    const buckets = new Map<string, FormsAnalyticsResult["rows"][number]>();
    for (const row of result.rows) {
        const start = bucketOf.get(dayOf(row[at]));
        if (!start) continue;
        const key = [start, ...row.filter((value, i) => i !== at && typeof value !== "number")].join("\u0000");
        const bucket = buckets.get(key);
        if (bucket) {
            row.forEach((value, i) => {
                if (typeof value === "number") bucket[i] = Number(bucket[i]) + value;
            });
        } else buckets.set(key, row.map((value, i) => (i === at ? start : value)));
    }
    const rows = [...buckets.values()];
    return { ...result, rows, totalRows: rows.length, toRow: rows.length };
}
// #endregion
