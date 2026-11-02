/**
 * One of the eight palette slots (`--uaui-series-1` to `--uaui-series-8`) that a series or a share bar is coloured by.
 * Slots 1 to 4 are the main colours; 5 to 8 are for charts with many series.
 */
export type UauiColorSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** The color of a `uaui-status-cell`, by the names of `uui-tag`'s `color`. */
export type UauiStatusColor = "default" | "positive" | "warning" | "danger";
