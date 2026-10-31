import type { UauiColorSlot } from "../theme/types.js";

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
    /** Palette slot (series/bar/fill colour). Defaults to the series' position. */
    color?: UauiColorSlot;
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
