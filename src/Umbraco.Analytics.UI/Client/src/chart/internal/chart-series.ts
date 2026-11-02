import type { UauiColorSlot } from "../../theme/types.js";
import type { UauiChartKind, UauiSeries, UauiSeriesKind } from "../types.js";
import type { UauiSeriesColorKey } from "./chart-colors.js";

// How a chart reads a series' own `color` and `kind`, whatever its x-axis is.

/** How many palette slots a series cycles through. */
const SLOT_COUNT = 8;

const COLOR_KEYS: ReadonlySet<unknown> = new Set<UauiSeriesColorKey>([1, 2, 3, 4, 5, 6, 7, 8, "default", "positive", "warning", "danger"]);

/**
 * What a series is coloured by: its `color` when valid (a palette slot 1 to 8 or a status colour), else the slot of its
 * position, cycling through the eight.
 */
export function colorKeyOf(series: Pick<UauiSeries, "color"> | undefined, position: number): UauiSeriesColorKey {
    const color = series?.color;
    return COLOR_KEYS.has(color) ? (color as UauiSeriesColorKey) : (((position % SLOT_COUNT) + 1) as UauiColorSlot);
}

/** How a series is drawn: its own `kind` when valid, else bars in the bar kinds and a line in the others. */
export function seriesKindOf(series: Pick<UauiSeries, "kind">, kind: UauiChartKind): UauiSeriesKind {
    if (series.kind === "line" || series.kind === "bar") return series.kind;
    return kind === "bar" || kind === "stacked-bar" ? "bar" : "line";
}
