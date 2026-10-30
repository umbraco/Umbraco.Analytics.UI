/** A y-axis with round tick values: ticks at 0, `step`, 2 x `step` ... `max`. */
export interface UaxNiceScale {
    max: number;
    step: number;
}

/**
 * Picks a round step (1, 2, 2.5, 5, 10 times a power of ten) so that the axis from 0 to the
 * largest value has about `target` ticks and ends on a tick. With `whole` (every plotted value is an integer)
 * the step is a whole number of at least 1, so counts never get a tick at 0.5.
 */
export function niceScale(maxValue: number, target = 5, whole = false): UaxNiceScale {
    const top = Math.max(Number.isFinite(maxValue) ? maxValue : 1, whole ? 1 : 1e-9);
    const raw = top / target;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const steps = [1, 2, 2.5, 5, 10].map((m) => m * (whole ? Math.max(magnitude, 1) : magnitude)).filter((v) => !whole || Number.isInteger(v));
    const step = steps.find((v) => v >= raw) ?? 10 * magnitude;
    return { max: Math.ceil(top / step - 1e-9) * step, step };
}
