import type { UauiDeltaUnit } from "../../delta-badge/delta-badge.element.js";

/**
 * The change a delta shows, shared by the badge and by the elements that decide whether to draw one. `value` wins
 * when set (even if it is not finite). Otherwise it is worked out from `current` and `previous`: the difference
 * for "points", the percent change for "percent" (unknown when `previous` is 0). Undefined when unknown.
 * Internal: not exported from the package.
 */
export function deltaChange(
    value: number | undefined,
    current: number | undefined,
    previous: number | undefined,
    unit: UauiDeltaUnit,
): number | undefined {
    if (value !== undefined) return value;
    if (current === undefined || previous === undefined) return undefined;
    if (!Number.isFinite(current) || !Number.isFinite(previous)) return undefined;
    if (unit === "points") return current - previous;
    return previous === 0 ? undefined : ((current - previous) / Math.abs(previous)) * 100;
}
