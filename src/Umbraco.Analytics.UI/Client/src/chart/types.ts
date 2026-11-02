import type { UauiColorSlot, UauiStatusColor } from "../theme/types.js";

/** One value on one day. Two points of a series on the same date are added, so aggregate rates and averages before passing them. */
export type UauiPoint = {
    /** ISO date, e.g. "2026-06-11". A date-time such as "2026-06-11T00:00:00Z" is read as the day it starts with, with no timezone shift. */
    date: string;
    value: number;
};

/** A named line (or set of bars) on a chart. */
export type UauiSeries = {
    /** Identifies the series. A comparison series is matched to its current series by `id`. */
    id: string;
    /** Shown in the legend, the tooltip and the screen reader table. */
    label: string;
    /**
     * The series' colour (line, fill and bar): a palette slot (1 to 8), or a status colour (`"default"`, `"positive"`,
     * `"warning"` or `"danger"`, as the status cell's) for a series that carries a meaning, such as errors in `"danger"`.
     * Defaults to the slot of the series' position, as does any other value. Say the meaning in the label too: the
     * colour only repeats it.
     */
    color?: UauiColorSlot | UauiStatusColor;
    /**
     * Draws this series as bars or as a line, whatever the chart's `kind`, so bars and a line can share one chart (daily
     * counts as bars with a running total as a line). Leave it out to draw the series as the chart's `kind` says. A line
     * is filled when the chart's `kind` is `"area"`; bars stack when it is `"stacked-bar"`, and a line never stacks.
     * Any other value is ignored. All series share one y-axis.
     */
    kind?: UauiSeriesKind;
    /**
     * The chart does not aggregate: points on the same date are added, which is wrong for rates and averages, so
     * aggregate those first. With `group-by` week or month pass one point per bucket, not daily data.
     */
    points: UauiPoint[];
};

/** An event shown on the chart's timeline, such as a campaign launch. */
export type UauiMarker = {
    id: string;
    /** ISO date, e.g. "2026-06-11". A date-time is read as the day it starts with, with no timezone shift. */
    date: string;
    title: string;
    description?: string;
};

/** The detail of the `marker-click` event: the id of the marker that was opened. */
export type UauiMarkerClickDetail = { id: string };

/** How a chart draws its series. */
export type UauiChartKind = "line" | "area" | "bar" | "stacked-bar";

/**
 * How `uaui-time-series-chart` stacks its series. `"normal"` draws the values as the chart's `kind` says. `"percent"` is
 * a 100% share view: each date's series as its share of that date's total, stacked to 100% (with `kind` `"stacked-bar"`
 * or `"area"`).
 */
export type UauiChartStack = "normal" | "percent";

/** How one series is drawn, overriding the chart's `kind`: as a line or as bars. */
export type UauiSeriesKind = "line" | "bar";

/**
 * How a chart's y-axis spaces its values. `"linear"` is even steps from 0. `"log"` gives each power of ten the same
 * height, for values that span widely (a few errors beside hundreds of approvals).
 */
export type UauiChartScale = "linear" | "log";

/** One x-axis value of `uaui-category-chart`, such as an hour of the day. */
export type UauiCategory = {
    /** Identifies the category: a series' points name it in `category`. */
    id: string;
    /** Shown on the x-axis, as the tooltip's heading and in the screen reader table. Pass it already localized. */
    label: string;
};

/**
 * One value in one category. Two points of a series in the same category are added, so aggregate rates and averages
 * before passing them. A value below 0 is drawn at 0, as on the time-series chart; the tooltip and hidden table show it
 * as it is.
 */
export type UauiCategoryPoint = {
    /** The `id` of the category the value is in. A point in a category the chart wasn't given is not drawn. */
    category: string;
    value: number;
};

/** A named set of bars on `uaui-category-chart`. */
export type UauiCategorySeries = {
    /** Identifies the series. A comparison series is matched to its current series by `id`. */
    id: string;
    /** Shown in the legend, the tooltip and the screen reader table. */
    label: string;
    /** The series' colour, as `UauiSeries.color`: a palette slot (1 to 8) or a status colour. Defaults to the slot of the series' position, as does any other value. */
    color?: UauiColorSlot | UauiStatusColor;
    /** Its values, by category. A category with no point has no bar. */
    points: UauiCategoryPoint[];
};

/** How `uaui-category-chart` draws its series: side by side, or stacked in one bar per category. */
export type UauiCategoryChartKind = "bar" | "stacked-bar";
