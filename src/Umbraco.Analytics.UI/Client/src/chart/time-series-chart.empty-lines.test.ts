// EMP-2 — Lines break at empty periods.
// Read from the Chart.js datasets the chart built (spanGaps) and the radius Chart.js resolved for each point, not from pixels.
import { Chart } from "@umbraco/analytics-ui/external/chart.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import { renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import type { UauiCompare, UauiDateRange } from "../date-range/types.js";
import type { UauiSeries } from "./types.js";
import "./time-series-chart.element.js";

const week: UauiDateRange = { from: "2026-10-24", to: "2026-10-26" };
const seriesOn = (dates: string[], value = 90): UauiSeries => ({ id: "rate", label: "Success rate", points: dates.map((date) => ({ date, value })) });
/** 60 days, 1 Sep to 30 Oct 2026: over the 45 slots a line draws dots for. */
const sixtyDays: UauiDateRange = { from: "2026-09-01", to: "2026-10-30" };
const sixtyDayDates = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2026, 8, 1 + i)).toISOString().slice(0, 10));

type Options = { kind?: string; series: UauiSeries[]; compareSeries?: UauiSeries[]; compare?: UauiCompare; range?: UauiDateRange };
const chart = async ({ kind = "line", series, compareSeries = [], compare, range = week }: Options) => {
    const el = await renderElement(
        html`<uaui-time-series-chart kind=${kind} .series=${series} .compareSeries=${compareSeries} .range=${range} .compare=${compare}
            style="width:800px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );
    await settle(el);
    return el;
};

const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
type LineDataset = { spanGaps?: boolean | number; data: (number | null)[] };
const datasetOf = (el: Element, i: number) => chartOf(el).data.datasets[i] as unknown as LineDataset;
/** The dot radius Chart.js resolved for the series' point in a slot, by its x-axis label ("Oct 1"). */
const radiusOn = (el: Element, label: string) => {
    const index = chartOf(el).data.labels!.indexOf(label);
    return (chartOf(el).getDatasetMeta(0).data[index].options as { radius: number }).radius;
};

describe("Feature: lines break at empty periods", () => {
    const previousLanguage = umbLocalizationManager.documentLanguage;
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
    });
    afterEach(() => {
        umbLocalizationManager.documentLanguage = previousLanguage;
    });

    describe("Scenario: a series line breaks", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [seriesOn(["2026-10-24", "2026-10-26"])] });
        });

        it.skip("doesn't join 2026-10-24 to 2026-10-26", () => {
            expect(datasetOf(el, 0).spanGaps).toBe(false);
        });
    });

    describe("Scenario: a compare line breaks", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            // The compare point for the 25th (the 18th) is missing.
            el = await chart({
                series: [seriesOn(["2026-10-24", "2026-10-25", "2026-10-26"])],
                compareSeries: [seriesOn(["2026-10-17", "2026-10-19"], 80)],
                compare: { mode: "custom", from: "2026-10-17", to: "2026-10-19" },
            });
        });

        it.skip("doesn't join the compare line across the slot of 2026-10-25", () => {
            // The series' line is dataset 0, its compare line dataset 1.
            expect(datasetOf(el, 1).spanGaps).toBe(false);
        });
    });

    describe("Scenario: an area leaves the period unfilled", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ kind: "area", series: [seriesOn(["2026-10-24", "2026-10-26"])] });
        });

        it.skip("has no value in the slot of 2026-10-25 and doesn't bridge it", () => {
            const { spanGaps, data } = datasetOf(el, 0);
            expect({ spanGaps, value: data[1] }).toEqual({ spanGaps: false, value: null });
        });
    });

    describe("Scenario: a lone value shows as a dot", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            // Every day of the 60 but 30 Sep and 2 Oct: 1 Oct stands alone.
            el = await chart({ range: sixtyDays, series: [seriesOn(sixtyDayDates.filter((d) => d !== "2026-09-30" && d !== "2026-10-02"))] });
        });

        it.skip("draws that value as a dot", () => {
            expect(radiusOn(el, "Oct 1")).toBeGreaterThan(0);
        });
    });

    describe("Sad path", () => {
        describe("Scenario: a value with a neighbour stays dotless", () => {
            let el: UauiTestElement;
            beforeEach(async () => {
                el = await chart({ range: sixtyDays, series: [seriesOn(["2026-10-01", "2026-10-02"])] });
            });

            it.skip("draws neither value as a dot", () => {
                expect([radiusOn(el, "Oct 1"), radiusOn(el, "Oct 2")]).toEqual([0, 0]);
            });
        });
    });
});
