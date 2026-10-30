import { describe, expect, it } from "vitest";
import { buildChartData, maxValue, parseIsoDate } from "./chart-data.js";
import { niceScale } from "./nice-scale.js";

describe("niceScale", () => {
    it("starts at 0 and ends on a round number above the maximum", () => {
        expect(niceScale(280)).toEqual({ max: 300, step: 100 });
    });

    it("uses a step of 1, 2, 2.5, 5 or 10 times a power of ten", () => {
        expect([niceScale(10).step, niceScale(23).step, niceScale(120).step, niceScale(4800).step]).toEqual([2, 5, 25, 1000]);
    });

    it("still gives a usable axis for an empty or all-zero chart", () => {
        expect(niceScale(0).max).toBeGreaterThan(0);
    });
});

describe("buildChartData", () => {
    const a = { id: "a", label: "A", points: [{ date: "2026-06-02", value: 2 }, { date: "2026-06-01", value: 1 }] };
    const b = { id: "b", label: "B", points: [{ date: "2026-06-03", value: 30 }] };

    it("shares one ascending list of dates", () => {
        expect(buildChartData([a, b]).dates).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
    });

    it("leaves a null where a series has no point", () => {
        expect(buildChartData([a, b]).series[1].values).toEqual([null, null, 30]);
    });

    it("finds the largest value", () => {
        expect(maxValue(buildChartData([a, b]))).toBe(30);
    });
});

describe("parseIsoDate", () => {
    it("keeps the calendar day in the local time zone", () => {
        expect(parseIsoDate("2026-06-11").getDate()).toBe(11);
    });
});
