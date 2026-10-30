/** One value on one day. */
export type UaxPoint = {
    /** ISO date, e.g. "2026-06-11". */
    date: string;
    value: number;
};

/** A named line (or set of bars) on a chart. */
export type UaxSeries = {
    /** Identifies the series. A comparison series is matched to its current series by `id`. */
    id: string;
    /** Shown in the legend, the tooltip and the screen reader table. */
    label: string;
    /** Palette slot (series/bar/fill colour). Defaults to the series' position. */
    color?: 1 | 2 | 3 | 4;
    points: UaxPoint[];
};

/** An event shown on the chart's timeline, such as a campaign launch. */
export type UaxMarker = {
    id: string;
    /** ISO date, e.g. "2026-06-11". */
    date: string;
    title: string;
    description?: string;
};

/** How a chart draws its series. */
export type UaxChartKind = "line" | "area" | "bar" | "stacked-bar";

/** A chosen date range. `preset` names the preset it came from, when it did. */
export type UaxDateRange = {
    /** ISO date, e.g. "2026-05-25". */
    from: string;
    /** ISO date, e.g. "2026-06-23". */
    to: string;
    preset?: string;
};

/** A chosen comparison range. */
export type UaxCompare = {
    mode: "previous-period" | "previous-year" | "custom";
    /** ISO date. */
    from: string;
    /** ISO date. */
    to: string;
};
