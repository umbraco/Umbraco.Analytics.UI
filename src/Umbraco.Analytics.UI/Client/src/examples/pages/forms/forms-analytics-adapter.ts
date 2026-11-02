import type { UauiSeries } from "../../../chart/types.js";
import type { UauiFunnelStep } from "../../../funnel/types.js";
import type { UauiColorSlot, UauiStatusColor } from "../../../theme/types.js";
import type { FormsAnalyticsResult, FormsColumn } from "./forms-fake-data.js";

// #region adapter
// Forms' analytics API answers every query as a table: `columns` names each value, `rows` holds the values in that
// order. These functions turn an answer into what the package's elements take: rows keyed by column for
// `uaui-data-table`, series for `uaui-time-series-chart`, steps for `uaui-funnel`. They read columns by name, never
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

/** The sum of a metric column over every row of an answer. */
export function formsTotal(result: FormsAnalyticsResult | undefined, column: FormsColumn): number {
    const i = result ? result.columns.indexOf(column) : -1;
    return i < 0 ? 0 : result!.rows.reduce((sum, row) => sum + (Number(row[i]) || 0), 0);
}

/** Funnel steps from `[state, entries]` rows, in the order of `labels`. A state missing from the answer counts 0. */
export function formsSteps(result: FormsAnalyticsResult | undefined, labels: { state: string; label: string }[]): UauiFunnelStep[] {
    if (!result) return [];
    const rows = formsRows(result);
    return labels.map(({ state, label }) => ({ id: state, label, value: Number(rows.find((r) => r.state === state)?.entries) || 0 }));
}
// #endregion
