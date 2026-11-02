/**
 * A log y-axis that still has 0 at its foot, for `y-scale="log"`.
 *
 * A pure log axis can't show 0, and the counts it is for (errors per day) are often 0. So values are drawn at
 * `log10(1 + value / unit)`: 0 sits on the axis line, `unit` (the power of ten at or below the smallest value above
 * 0) a third of a decade up, and from there each power of ten has the same height, as on a log axis. The ticks are
 * placed at their true heights on that curve, so the axis reads honestly, and a bar of the smallest value still has
 * height. Values below 0 are drawn at 0, as the linear axis starts at 0 too.
 */
export interface UauiLogScale {
    /** The power of ten the bottom stretch runs up to: the first tick above 0. */
    unit: number;
    /** The tick values (real values, not axis heights), from 0 up to `top`. */
    ticks: number[];
    /** The highest tick: the first power of ten times `unit` at or above the largest value. */
    top: number;
    /** The axis height of a value, `null` for none. */
    toAxis: (value: number | null) => number | null;
}

/** `mantissa` times ten to the `exponent`, without the rounding error of `m * 10 ** e` (0.1 * 3 and the like). */
const power = (mantissa: number, exponent: number) => Number(`${mantissa}e${exponent}`);

/** Up to this many decades, the 2 and 5 of each decade get a tick too, so a short axis isn't bare. */
const MAX_DECADES_WITH_STEPS = 2;

export function logScale(max: number, minPositive?: number): UauiLogScale {
    const low = minPositive !== undefined && Number.isFinite(minPositive) && minPositive > 0 ? minPositive : 1;
    const unitExponent = Math.floor(Math.log10(low));
    const unit = power(1, unitExponent);
    const high = Number.isFinite(max) ? max : 0;
    let decades = 1;
    while (power(1, unitExponent + decades) < high) decades++;
    const ticks = [0];
    for (let j = 0; j <= decades; j++) {
        ticks.push(power(1, unitExponent + j));
        if (j < decades && decades <= MAX_DECADES_WITH_STEPS) ticks.push(power(2, unitExponent + j), power(5, unitExponent + j));
    }
    const top = power(1, unitExponent + decades);
    return {
        unit,
        ticks,
        top,
        toAxis: (value) => (value === null ? null : Math.log10(1 + Math.max(value, 0) / unit)),
    };
}
