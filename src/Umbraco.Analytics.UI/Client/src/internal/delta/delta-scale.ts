import type { UauiDeltaUnit } from "../../delta-badge/delta-badge.element.js";

/**
 * What to multiply two values by before a badge compares them. Points are the difference of two percentages, so
 * values formatted with `style: "percent"` (fractions: 0.05 is 5%) are scaled by 100 first; 0.05 to 0.06 is +1 pp.
 * A percent change is a ratio and needs no scaling, and values in any other format are already in percent units.
 * Shared by the table's compare badge, the KPI tile and the stat. Internal: not exported from the package.
 */
export function deltaScale(unit: UauiDeltaUnit, valueFormat: Intl.NumberFormatOptions | undefined): number {
    return unit === "points" && valueFormat?.style === "percent" ? 100 : 1;
}
