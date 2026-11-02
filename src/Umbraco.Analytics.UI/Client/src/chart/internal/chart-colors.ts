import { uauiChartColors, type UauiChartColors } from "@umbraco/analytics-ui/external/chart.js";

/**
 * What our chart draws with: the package's chart colours (`uauiChartColors`, the same a product's own chart gets),
 * with the series picked by slot, plus the colours only our chart uses.
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
}

/**
 * Resolves the palette for `host` in its current theme: `uauiChartColors` for the shared part, with `series` in the
 * order of `slots` (1 to 4) rather than slot order, and the rest read back from `probe` (a hidden element in the
 * host's shadow root) as computed `color`s, since a canvas can't read CSS custom properties.
 */
export function resolveChartColors(host: HTMLElement, probe: HTMLElement, slots: number[]): UauiChartDrawColors {
    const shared = uauiChartColors(host);
    const colorOf = (expression: string): string => {
        probe.style.color = "";
        probe.style.color = expression;
        return getComputedStyle(probe).color;
    };
    return {
        ...shared,
        series: slots.map((n) => shared.series[n - 1]),
        gapGood: colorOf("var(--uaui-color-gap-positive)"),
        gapBad: colorOf("var(--uaui-color-gap-negative)"),
        hoverLine: colorOf("color-mix(in srgb, var(--uui-color-text) 35%, transparent)"),
        marker: colorOf("var(--uaui-color-marker)"),
        markerHover: colorOf("var(--uaui-color-marker-hover)"),
        markerLine: colorOf("color-mix(in srgb, var(--uaui-color-marker) 26%, transparent)"),
        markerLineActive: colorOf("color-mix(in srgb, var(--uaui-color-marker-hover) 60%, transparent)"),
    };
}

/** True when the two palettes would draw differently. */
export function colorsDiffer(a: UauiChartDrawColors | undefined, b: UauiChartDrawColors): boolean {
    return !a || JSON.stringify(a) !== JSON.stringify(b);
}
