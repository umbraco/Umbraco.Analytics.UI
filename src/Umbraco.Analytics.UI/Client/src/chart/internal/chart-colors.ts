export interface UaxChartColors {
    /** One entry per series, cycling through the four series tokens. */
    series: { line: string; fill: string; bar: string }[];
    /** The compare line. */
    compare: string;
    /** The compare bar: the compare colour at reduced opacity, drawn behind the current bars. */
    compareBar: string;
    /** The gap between a series and its compare line where the series is above / below it. */
    gapAbove: string;
    gapBelow: string;
    grid: string;
    tick: string;
    surface: string;
    hoverLine: string;
    fontFamily: string;
}

/**
 * Chart.js draws to a canvas, which can't read CSS custom properties. The series tokens are also
 * `light-dark(...)` strings, not colours. So each colour is applied to a probe element in the
 * chart's shadow root and read back as a computed `color`, which is a real colour in the
 * element's current theme. The fill is a base colour at low alpha (`--_uax-fill-N`, declared by the
 * element): the livelier design colour by default, the product's colour when it overrides a series token. Bars use
 * `--_uax-bar-N`, opaque.
 */
export function resolveChartColors(probe: HTMLElement, slots: number[]): UaxChartColors {
    const colorOf = (expression: string): string => {
        probe.style.color = "";
        probe.style.color = expression;
        return getComputedStyle(probe).color;
    };
    const series = slots.map((n) => {
        return {
            line: colorOf(`var(--_uax-series-${n})`),
            fill: colorOf(`color-mix(in srgb, var(--_uax-fill-${n}) 12%, transparent)`),
            bar: colorOf(`var(--_uax-bar-${n})`),
        };
    });
    return {
        series,
        compare: colorOf("var(--_uax-compare)"),
        compareBar: colorOf("var(--_uax-compare-bar)"),
        gapAbove: colorOf("var(--_uax-gap-positive)"),
        gapBelow: colorOf("var(--_uax-gap-negative)"),
        grid: colorOf("var(--uui-color-divider-standalone)"),
        tick: colorOf("var(--uui-color-text-alt)"),
        surface: colorOf("var(--uui-color-surface)"),
        hoverLine: colorOf("color-mix(in srgb, var(--uui-color-text) 35%, transparent)"),
        fontFamily: getComputedStyle(probe).fontFamily,
    };
}

/** True when the two palettes would draw differently. */
export function colorsDiffer(a: UaxChartColors | undefined, b: UaxChartColors): boolean {
    return !a || JSON.stringify(a) !== JSON.stringify(b);
}
