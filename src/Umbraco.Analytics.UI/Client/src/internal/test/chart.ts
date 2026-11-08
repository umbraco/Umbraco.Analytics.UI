// What the time-series chart specs for empty periods share: the Chart.js chart behind an element, a one-series
// builder, and the en-US labels those specs read. Tests only; never imported by shipped code.
import { Chart } from "#platform/chart";
import { afterEach, beforeEach } from "vitest";
import type { UauiSeries } from "../../chart/types.js";
import { shadow } from "./dom.js";

/** The Chart.js chart a chart element drew on its canvas. */
export const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;

/** A "Success rate" series with `value` on each of `dates`. */
export const seriesOn = (dates: string[], value = 90): UauiSeries => ({ id: "rate", label: "Success rate", points: dates.map((date) => ({ date, value })) });

/** Call inside a `describe`: sets the document language to en-US for each spec (labels such as "Oct 24") and restores it after. */
export function useEnglishDates(): void {
    const previousLanguage = document.documentElement.lang;
    beforeEach(() => {
        document.documentElement.lang = "en-US";
    });
    afterEach(() => {
        document.documentElement.lang = previousLanguage;
    });
}
