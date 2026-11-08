import { uauiChartColors, type UauiChartColors } from "#platform/chart";
import type { UauiColorSlot, UauiStatusColor } from "../../theme/types.js";

/** What a series is coloured by: a palette slot or a status colour. Both name the tokens (`--uaui-color-series-<key>`). */
export type UauiSeriesColorKey = UauiColorSlot | UauiStatusColor;

/**
 * What our chart draws with: the package's chart colours (`uauiChartColors`, the same a product's own chart gets),
 * with the series picked by slot or status, plus the colours only our chart uses.
 */
export interface UauiChartDrawColors extends UauiChartColors {
    /** The gap between a series and its compare line where the series is doing better / worse than it. */
    gapGood: string;
    gapBad: string;
    hoverLine: string;
    /** Marker dot, its hovered or focused shade, and the dashed line at rest and when active. */
    marker: string;
    markerHover: string;
    markerLine: string;
    markerLineActive: string;
    /** The hatch over the incomplete part of a time series chart. */
    incompleteHatch: string;
    /** Per series, in the same order as `series`: the colours of its incomplete part (see-through, hollow-point border). */
    incompleteSeries: { line: string; fill: string; bar: string; point: string }[];
}

/** How much of a series' colour its incomplete part keeps: lines, their area, bars, and the border of a hollow point. */
const INCOMPLETE_LINE = 40;
const INCOMPLETE_FILL = 40;
const INCOMPLETE_BAR = 35;
const INCOMPLETE_POINT = 60;

/**
 * Resolves the palette for `host` in its current theme: `uauiChartColors` for the shared part, with `series` in the
 * order of `keys` (a slot 1 to 8 or a status colour each) rather than slot order, and the rest read back from `probe` (a hidden element in the
 * host's shadow root) as computed `color`s, since a canvas can't read CSS custom properties.
 */
export function resolveChartColors(host: HTMLElement, probe: HTMLElement, keys: UauiSeriesColorKey[]): UauiChartDrawColors {
    const shared = uauiChartColors(host);
    const colorOf = (expression: string): string => {
        probe.style.color = "";
        probe.style.color = expression;
        return getComputedStyle(probe).color;
    };
    const series = keys.map((key) => (typeof key === "number" ? shared.series[key - 1] : shared.status[key]));
    const faded = (color: string, percent: number) => colorOf(`color-mix(in srgb, ${color} ${percent}%, transparent)`);
    return {
        ...shared,
        series,
        gapGood: colorOf("var(--uaui-color-gap-positive)"),
        gapBad: colorOf("var(--uaui-color-gap-negative)"),
        hoverLine: colorOf("color-mix(in srgb, var(--uui-color-text) 35%, transparent)"),
        marker: colorOf("var(--uaui-color-marker)"),
        markerHover: colorOf("var(--uaui-color-marker-hover)"),
        markerLine: colorOf("color-mix(in srgb, var(--uaui-color-marker) 26%, transparent)"),
        markerLineActive: colorOf("color-mix(in srgb, var(--uaui-color-marker-hover) 60%, transparent)"),
        incompleteHatch: colorOf("color-mix(in srgb, var(--uui-color-text) 10%, transparent)"),
        incompleteSeries: series.map((s) => ({
            line: faded(s.line, INCOMPLETE_LINE),
            fill: faded(s.fill, INCOMPLETE_FILL),
            bar: faded(s.bar, INCOMPLETE_BAR),
            point: faded(s.line, INCOMPLETE_POINT),
        })),
    };
}

/**
 * The status and slot pairs that a chart uses together and that draw alike in the current theme (the same line or bar
 * colour), such as `"danger"` with slot 2. `keys` and `series` are in series order, as `resolveChartColors` takes and
 * gives them.
 */
export function clashingColors(keys: UauiSeriesColorKey[], series: UauiChartDrawColors["series"]): [UauiStatusColor, UauiColorSlot][] {
    const clashes: [UauiStatusColor, UauiColorSlot][] = [];
    keys.forEach((status, i) => {
        if (typeof status === "number") return;
        keys.forEach((slot, j) => {
            if (typeof slot !== "number" || clashes.some(([s, n]) => s === status && n === slot)) return;
            if (series[i].line === series[j].line || series[i].bar === series[j].bar) clashes.push([status, slot]);
        });
    });
    return clashes;
}

/** True when the two palettes would draw differently. */
export function colorsDiffer(a: UauiChartDrawColors | undefined, b: UauiChartDrawColors): boolean {
    return !a || JSON.stringify(a) !== JSON.stringify(b);
}
