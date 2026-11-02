import type { UauiCategory, UauiCategoryPoint, UauiCategorySeries } from "../types.js";
import type { UauiChartData } from "./chart-values.js";

// What `uaui-category-chart` plots, in the shape every chart shares (`UauiChartData`): its x values are the categories'
// ids, in the order the product gave them.

/** Each known category's sum of `points`, `null` where it has none. Points in a category not in `index` are dropped. */
function valuesByCategory(points: UauiCategoryPoint[], index: Map<string, number>): (number | null)[] {
    const values: (number | null)[] = Array.from({ length: index.size }, () => null);
    for (const p of points) {
        const at = index.get(p.category);
        if (at === undefined || !Number.isFinite(p.value)) continue;
        values[at] = (values[at] ?? 0) + p.value;
    }
    return values;
}

/**
 * Lines the series up on the categories. A category a series has no point in is `null`; points in the same category add
 * up, and points in a category that isn't in `categories` (or that aren't finite numbers) are dropped. A category id
 * given twice counts once, at its first place.
 *
 * A compare value is matched by series `id` and category id: a compare series counts only when a series has its `id`,
 * so the compare total covers the same series as the bars it stands behind. The bar kinds draw the compare series added
 * up per category as one compare bar (`compareTotal`), as the time-series chart's bar kinds do. Each compare total's
 * label is its category id.
 */
export function buildCategoryData(categories: UauiCategory[], series: UauiCategorySeries[], compareSeries: UauiCategorySeries[] = []): UauiChartData {
    const index = new Map<string, number>();
    for (const c of categories) if (!index.has(c.id)) index.set(c.id, index.size);
    const labels = [...index.keys()];
    const ids = new Set(series.map((s) => s.id));
    const totalValues = valuesByCategory(
        compareSeries.filter((c) => ids.has(c.id)).flatMap((c) => c.points),
        index,
    );
    const compareTotal = totalValues.some((v) => v !== null)
        ? { values: totalValues, labels: totalValues.map((v, i) => (v === null ? null : labels[i])) }
        : undefined;
    return {
        labels,
        compareTotal,
        series: series.map((s) => ({ id: s.id, label: s.label, values: valuesByCategory(s.points, index) })),
    };
}
