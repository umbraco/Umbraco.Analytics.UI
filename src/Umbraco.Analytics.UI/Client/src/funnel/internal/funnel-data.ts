import type { UauiFunnelStep } from "../types.js";

/** One step as the funnel draws it. Internal: not exported. */
export interface UauiFunnelRow {
    id: string;
    label: string;
    value: number;
    /** The matched compare step's value. Undefined when the step has no match. */
    compare?: number;
    /** Bar width, 0 to 100 (% of the largest value in both periods). */
    width: number;
    /** Compare bracket width, 0 to 100. Undefined when the step has no match. */
    compareWidth?: number;
    /** This step over the first step, 0 to 1 or more. Null when the first step is 0. */
    ofFirst: number | null;
    /** This step over the previous step. Null for the first step, or when the previous step is 0. */
    rate: number | null;
    /** The same rate for the compare period. Null when either compare step is missing or the previous one is 0. */
    compareRate: number | null;
}

/** A value the funnel can draw: negative and non-finite numbers count as 0. */
export const cleanValue = (value: number | undefined): number => (typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0);

const ratio = (top: number | undefined, bottom: number | undefined): number | null =>
    top === undefined || bottom === undefined || bottom === 0 ? null : top / bottom;

/**
 * Works out what the funnel draws for each step: bar and bracket widths on one scale shared by both periods (the
 * largest value of either), the share of the first step, and the share that moved on from the previous step.
 */
export function buildFunnel(steps: readonly UauiFunnelStep[], compareSteps: readonly UauiFunnelStep[] = []): UauiFunnelRow[] {
    const compareById = new Map(compareSteps.map((s) => [s.id, cleanValue(s.value)]));
    const values = steps.map((s) => cleanValue(s.value));
    const compares = steps.map((s) => compareById.get(s.id));
    const max = Math.max(0, ...values, ...compares.map((c) => c ?? 0));
    const widthOf = (value: number) => (max === 0 ? 0 : (value / max) * 100);
    const first = values[0];

    return steps.map((step, i) => {
        const value = values[i];
        const compare = compares[i];
        return {
            id: step.id,
            label: step.label,
            value,
            compare,
            width: widthOf(value),
            compareWidth: compare === undefined ? undefined : widthOf(compare),
            ofFirst: ratio(value, first),
            rate: i === 0 ? null : ratio(value, values[i - 1]),
            compareRate: i === 0 ? null : ratio(compare, compares[i - 1]),
        };
    });
}

/** The CSS `clip-path` of the link between two bars: a trapezoid from the upper bar's width to the lower one's, centred. */
export function linkClipPath(upper: number, lower: number): string {
    const edge = (n: number) => `${(Math.round(n * 100) / 100).toString()}%`;
    return `polygon(${edge(50 - upper / 2)} 0, ${edge(50 + upper / 2)} 0, ${edge(50 + lower / 2)} 100%, ${edge(50 - lower / 2)} 100%)`;
}
