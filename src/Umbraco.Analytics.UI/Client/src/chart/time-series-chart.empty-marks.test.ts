// EMP-5 — Marks on empty periods.
// Markers are read from their HTML buttons, "now" and the unfinished part from the hidden table's row headers, and
// compare points from the Chart.js compare line's data.
import { Chart } from "@umbraco/analytics-ui/external/chart.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import { deepQuery, deepQueryAll, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import type { UauiCompare, UauiDateRange } from "../date-range/types.js";
import type { UauiMarker, UauiSeries } from "./types.js";
import "./time-series-chart.element.js";

const range: UauiDateRange = { from: "2026-10-24", to: "2026-10-30" };
const compare: UauiCompare = { mode: "custom", from: "2026-10-17", to: "2026-10-23" };
const seriesOn = (dates: string[], value = 90): UauiSeries => ({ id: "rate", label: "Success rate", points: dates.map((date) => ({ date, value })) });
// Every day of the range but the 26th.
const allBut26 = seriesOn(["2026-10-24", "2026-10-25", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]);

type Options = { series: UauiSeries[]; compareSeries?: UauiSeries[]; compare?: UauiCompare; markers?: UauiMarker[]; now?: string; incompleteFrom?: string };
const chart = async ({ series, compareSeries = [], compare, markers = [], now, incompleteFrom }: Options) => {
    const el = await renderElement(
        html`<uaui-time-series-chart kind="line" .series=${series} .compareSeries=${compareSeries} .range=${range} .compare=${compare}
            .markers=${markers} .now=${now} .incompleteFrom=${incompleteFrom} style="width:800px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );
    await settle(el);
    return el;
};

const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
/** The x of the middle of a slot, on the canvas, by its x-axis label ("Oct 26"). */
const slotX = (el: Element, label: string) => chartOf(el).scales["x"].getPixelForValue(chartOf(el).data.labels!.indexOf(label));
// The buttons over the marker dots live in the shadow root of the chart's `uaui-chart-markers`.
const markers = (el: Element) => deepQueryAll<HTMLElement>(shadow(el), ".marker");
const markerX = (el: Element, i: number) => {
    const box = markers(el)[i].getBoundingClientRect();
    return box.left + box.width / 2 - shadow(el).querySelector("canvas")!.getBoundingClientRect().left;
};
const rowHeaders = (el: Element) => [...deepQuery<HTMLTableElement>(shadow(el), "table")!.querySelectorAll("tbody th")].map((th) => th.textContent!.trim());

describe("Feature: marks on empty periods", () => {
    const previousLanguage = umbLocalizationManager.documentLanguage;
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
    });
    afterEach(() => {
        umbLocalizationManager.documentLanguage = previousLanguage;
    });

    describe("Scenario: a marker on an empty day", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [allBut26], markers: [{ id: "m1", date: "2026-10-26", title: "Deploy" }] });
        });

        it("shows the marker in the slot of 2026-10-26", () => {
            expect(markerX(el, 0)).toBeCloseTo(slotX(el, "Oct 26"), 0);
        });
    });

    describe("Scenario: now on an empty day", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [seriesOn(["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"])], now: "2026-10-30T10:00" });
        });

        it("puts the now line in the slot of 2026-10-30", () => {
            expect(rowHeaders(el).findIndex((r) => r.includes("(today)"))).toBe(6);
        });
    });

    describe("Scenario: unfinished from an empty day", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({
                series: [seriesOn(["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-30"])],
                incompleteFrom: "2026-10-29",
            });
        });

        it("starts the unfinished part at the slot of 2026-10-29", () => {
            expect(rowHeaders(el).map((r) => r.endsWith("(incomplete)"))).toEqual([false, false, false, false, false, true, true]);
        });
    });

    describe("Scenario: a compare point on an empty day", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [allBut26], compareSeries: [seriesOn(["2026-10-19"], 77)], compare });
        });

        it("puts the compare value in the slot of 2026-10-26", () => {
            // The series' line is dataset 0, its compare line dataset 1; the 26th is slot 2.
            expect(chartOf(el).data.datasets[1].data[2]).toBe(77);
        });
    });

    describe("Sad path", () => {
        describe("Scenario: a marker outside every slot", () => {
            let el: UauiTestElement;
            beforeEach(async () => {
                el = await chart({ series: [allBut26], markers: [{ id: "m9", date: "2026-11-02", title: "Too late" }] });
            });

            it("shows no marker", () => {
                expect(markers(el)).toHaveLength(0);
            });
        });

        describe("Scenario: a compare point past the range", () => {
            let el: UauiTestElement;
            beforeEach(async () => {
                // The 25th is 8 days into the compare period, which lines up with 1 Nov: past the range.
                el = await chart({ series: [allBut26], compareSeries: [{ ...allBut26, points: [{ date: "2026-10-17", value: 60 }, { date: "2026-10-25", value: 77 }] }], compare });
            });

            it("doesn't draw that compare point", () => {
                expect(chartOf(el).data.datasets[1].data).not.toContain(77);
            });
        });
    });
});
