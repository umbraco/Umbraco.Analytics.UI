/** A y-axis with round tick values: ticks at 0, `step`, 2 x `step` ... `max`. */
export interface UaxNiceScale {
    max: number;
    step: number;
}

/**
 * Picks a round step (1, 2, 2.5, 5, 10 times a power of ten) so that the axis from 0 to the
 * largest value has about `target` ticks and ends on a tick.
 */
export function niceScale(maxValue: number, target = 5): UaxNiceScale {
    const top = Math.max(Number.isFinite(maxValue) ? maxValue : 1, 1e-9);
    const raw = top / target;
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((v) => v >= raw) ?? 10 * magnitude;
    return { max: Math.ceil(top / step - 1e-9) * step, step };
}
