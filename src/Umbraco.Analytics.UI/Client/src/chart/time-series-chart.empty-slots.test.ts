// EMP-1 — Every period gets a slot.
// The slots are the chart's x-axis dates, read from the Chart.js chart's labels (formatted for en-US: "Oct 24" by day
// and week, "Jan 2026" by month).
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { chartOf, useEnglishDates } from "../internal/test/chart.js";
import { renderElement, settle, type UauiTestElement } from "../internal/test/dom.js";
import type { UauiDateRange } from "../date-range/types.js";
import type { UauiSeries } from "./types.js";
import "./time-series-chart.element.js";

const seriesOn = (dates: string[]): UauiSeries => ({ id: "rate", label: "Success rate", points: dates.map((date, i) => ({ date, value: 90 + i })) });

type Options = { series: UauiSeries[]; range?: UauiDateRange; groupBy?: string; weekStart?: number };
const chart = async ({ series, range, groupBy = "day", weekStart = 1 }: Options) => {
    const el = await renderElement(
        html`<uaui-time-series-chart kind="line" group-by=${groupBy} week-start=${weekStart} .series=${series} .range=${range}
            style="width:800px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );
    await settle(el);
    return el;
};

const slots = (el: Element) => chartOf(el).data.labels;

describe("Feature: every period gets a slot", () => {
    useEnglishDates();

    describe("Scenario: every day of the range", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [seriesOn(["2026-10-25", "2026-10-28"])], range: { from: "2026-10-24", to: "2026-10-30" } });
        });

        it("has one slot per day, 2026-10-24 to 2026-10-30", () => {
            expect(slots(el)).toEqual(["Oct 24", "Oct 25", "Oct 26", "Oct 27", "Oct 28", "Oct 29", "Oct 30"]);
        });
    });

    describe("Scenario: every week of the range", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [seriesOn(["2026-10-12"])], range: { from: "2026-10-01", to: "2026-10-31" }, groupBy: "week", weekStart: 1 });
        });

        it("has one slot per Monday week the range touches", () => {
            expect(slots(el)).toEqual(["Sep 28", "Oct 5", "Oct 12", "Oct 19", "Oct 26"]);
        });
    });

    describe("Scenario: every month of the range", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [seriesOn(["2026-02-01"])], range: { from: "2026-01-15", to: "2026-04-10" }, groupBy: "month" });
        });

        it("has one slot per month the range touches", () => {
            expect(slots(el)).toEqual(["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026"]);
        });
    });

    describe("Scenario: every hour of the range", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [seriesOn(["2026-11-05T09:00", "2026-11-05T14:00"])], range: { from: "2026-11-05", to: "2026-11-05" }, groupBy: "hour" });
        });

        it("has 24 slots", () => {
            expect(slots(el)).toHaveLength(24);
        });
    });

    describe("Scenario: no range keeps today's axis", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [seriesOn(["2026-10-25", "2026-10-28"])] });
        });

        it("has a slot for each point's date only", () => {
            expect(slots(el)).toEqual(["Oct 25", "Oct 28"]);
        });
    });

    describe("Sad path", () => {
        describe("Scenario: a point outside the range keeps its slot", () => {
            let el: UauiTestElement;
            beforeEach(async () => {
                el = await chart({ series: [seriesOn(["2026-10-25", "2026-10-29"])], range: { from: "2026-10-24", to: "2026-10-26" } });
            });

            it("has the range's days and the outside point's day, in date order", () => {
                expect(slots(el)).toEqual(["Oct 24", "Oct 25", "Oct 26", "Oct 29"]);
            });
        });

        describe("Scenario: the day clocks go forward", () => {
            let el: UauiTestElement;
            beforeEach(async () => {
                el = await chart({ series: [seriesOn(["2026-03-29T12:00"])], range: { from: "2026-03-29", to: "2026-03-29" }, groupBy: "hour" });
            });

            it("has 23 slots", () => {
                expect(slots(el)).toHaveLength(23);
            });
        });

        describe("Scenario: the day clocks go back", () => {
            let el: UauiTestElement;
            beforeEach(async () => {
                el = await chart({ series: [seriesOn(["2026-10-25T12:00"])], range: { from: "2026-10-25", to: "2026-10-25" }, groupBy: "hour" });
            });

            it("has 25 slots", () => {
                expect(slots(el)).toHaveLength(25);
            });
        });
    });
});
