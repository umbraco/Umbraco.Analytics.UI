export interface UauiChartColors {
    /** One entry per series, cycling through the four series tokens. */
    series: { line: string; fill: string; bar: string }[];
    /** The compare line. */
    compare: string;
    /** The compare bar: the compare colour at reduced opacity, drawn behind the current bars. */
    compareBar: string;
    /** The gap between a series and its compare line where the series is doing better / worse than it. */
    gapGood: string;
    gapBad: string;
    grid: string;
    tick: string;
    surface: string;
    hoverLine: string;
    /** Marker dot, its hovered or focused shade, and the dashed line at rest and when active. */
    marker: string;
    markerHover: string;
    markerLine: string;
    markerLineActive: string;
    fontFamily: string;
}

/**
 * Chart.js draws to a canvas, which can't read CSS custom properties. The series tokens are also
 * `light-dark(...)` strings, not colours. So each colour is applied to a probe element in the
 * chart's shadow root and read back as a computed `color`, which is a real colour in the
 * element's current theme. The fill is a base colour at low alpha (`--uaui-color-fill-N`, declared by the
 * element): the livelier design colour by default, the product's colour when it overrides a series token. Bars use
 * `--uaui-color-bar-N`, opaque.
 */
export function resolveChartColors(probe: HTMLElement, slots: number[]): UauiChartColors {
    const colorOf = (expression: string): string => {
        probe.style.color = "";
        probe.style.color = expression;
        return getComputedStyle(probe).color;
    };
    const series = slots.map((n) => {
        return {
            line: colorOf(`var(--uaui-color-series-${n})`),
            fill: colorOf(`color-mix(in srgb, var(--uaui-color-fill-${n}) 12%, transparent)`),
            bar: colorOf(`var(--uaui-color-bar-${n})`),
        };
    });
    return {
        series,
        compare: colorOf("var(--uaui-color-compare)"),
        compareBar: colorOf("var(--uaui-color-compare-bar)"),
        gapGood: colorOf("var(--uaui-color-gap-positive)"),
        gapBad: colorOf("var(--uaui-color-gap-negative)"),
        grid: colorOf("var(--uui-color-divider-standalone)"),
        tick: colorOf("var(--uui-color-text-alt)"),
        surface: colorOf("var(--uui-color-surface)"),
        hoverLine: colorOf("color-mix(in srgb, var(--uui-color-text) 35%, transparent)"),
        marker: colorOf("var(--uaui-color-marker)"),
        markerHover: colorOf("var(--uaui-color-marker-hover)"),
        markerLine: colorOf("color-mix(in srgb, var(--uaui-color-marker) 26%, transparent)"),
        markerLineActive: colorOf("color-mix(in srgb, var(--uaui-color-marker-hover) 60%, transparent)"),
        fontFamily: getComputedStyle(probe).fontFamily,
    };
}

/** True when the two palettes would draw differently. */
export function colorsDiffer(a: UauiChartColors | undefined, b: UauiChartColors): boolean {
    return !a || JSON.stringify(a) !== JSON.stringify(b);
}
