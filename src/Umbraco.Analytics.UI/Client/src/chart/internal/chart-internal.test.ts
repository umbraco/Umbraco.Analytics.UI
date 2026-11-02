import { describe, expect, it } from "vitest";
import { allWhole, buildChartData, maxValue, minPositive, seriesTotals } from "./chart-data.js";
import { logScale } from "./log-scale.js";
import { bucketMarkers } from "./marker-buckets.js";
import { niceScale } from "./nice-scale.js";

describe("logScale", () => {
    it("ticks at 0 and each power of ten from the smallest value's up past the largest", () => {
        expect(logScale(900, 3).ticks).toEqual([0, 1, 10, 100, 1000]);
        expect(logScale(900, 3).top).toBe(1000);
    });

    it("adds the 2s and 5s when there are one or two decades", () => {
        expect(logScale(8, 1).ticks).toEqual([0, 1, 2, 5, 10]);
        expect(logScale(60, 1).ticks).toEqual([0, 1, 2, 5, 10, 20, 50, 100]);
    });

    it("starts below 1 for small values, without rounding errors", () => {
        expect(logScale(0.5, 0.02).ticks).toEqual([0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1]);
    });

    it("starts at 1 when there is no value above 0", () => {
        expect(logScale(0, undefined).ticks).toEqual([0, 1, 2, 5, 10]);
    });

    it("draws 0 and anything below it on the axis line, and keeps a missing value missing", () => {
        const { toAxis } = logScale(100, 1);
        expect([toAxis(0), toAxis(-5), toAxis(null)]).toEqual([0, 0, null]);
    });

    it("gives the unit a height, so the smallest bar shows", () => {
        expect(logScale(100, 1).toAxis(1)).toBeCloseTo(Math.log10(2));
    });

    it("keeps the order of values", () => {
        const { toAxis } = logScale(1000, 1);
        const heights = [0, 1, 2, 9, 10, 99, 100, 1000].map((v) => toAxis(v)!);
        expect([...heights].sort((a, b) => a - b)).toEqual(heights);
    });
});

describe("mixed bars and lines", () => {
    const day = (values: number[], from = "2026-06-0") => values.map((value, i) => ({ date: `${from}${i + 1}`, value }));
    const bars = { id: "b", label: "B", points: day([1, 2]) };
    const line = { id: "l", label: "L", points: day([10, 20]) };
    const previousBars = { id: "b", label: "B", points: day([3, 3], "2026-05-0") };
    const previousLine = { id: "l", label: "L", points: day([30, 30], "2026-05-0") };
    const data = buildChartData([bars, line], [previousBars, previousLine], "day", {}, undefined, [false, true]);

    it("gives only a line series its compare values", () => {
        expect(data.series.map((s) => s.compare)).toEqual([undefined, [30, 30]]);
    });

    it("adds up only the compare series not matched to a line into the compare total", () => {
        expect(data.compareTotal?.values).toEqual([3, 3]);
    });

    it("totals only the bars", () => {
        expect(seriesTotals(data, [true, false])).toEqual([1, 2]);
    });

    it("reaches the line and its compare line on the y-axis", () => {
        expect(maxValue(data, "bar", [true, false])).toBe(30);
        expect(maxValue(data, "stacked-bar", [true, false])).toBe(30);
    });

    it("finds the smallest value above 0 for a log axis", () => {
        expect(minPositive(buildChartData([{ id: "a", label: "A", points: day([0, 0.4, 7]) }]))).toBe(0.4);
        expect(minPositive(buildChartData([{ id: "a", label: "A", points: day([0, 0]) }]))).toBeUndefined();
    });
});

describe("niceScale", () => {
    it("starts at 0 and ends on a round number above the maximum", () => {
        expect(niceScale(280)).toEqual({ max: 300, step: 100 });
    });

    it("uses a step of 1, 2, 2.5, 5 or 10 times a power of ten", () => {
        expect([niceScale(10).step, niceScale(23).step, niceScale(120).step, niceScale(4800).step]).toEqual([2, 5, 25, 1000]);
    });

    it("keeps whole-number steps of at least 1 for whole values", () => {
        expect([niceScale(2, 5, true), niceScale(4, 5, true), niceScale(0, 5, true)]).toEqual([
            { max: 2, step: 1 },
            { max: 4, step: 1 },
            { max: 1, step: 1 },
        ]);
    });

    it("still allows 2.5 steps for whole values once the step is a whole number", () => {
        expect(niceScale(120, 5, true).step).toBe(25);
    });

    it("gives a half step to fractional values", () => {
        expect(niceScale(2).step).toBe(0.5);
    });

    it("still gives a usable axis for an empty or all-zero chart", () => {
        expect(niceScale(0).max).toBeGreaterThan(0);
    });
});

describe("buildChartData", () => {
    const a = { id: "a", label: "A", points: [{ date: "2026-06-02", value: 2 }, { date: "2026-06-01", value: 1 }] };
    const b = { id: "b", label: "B", points: [{ date: "2026-06-03", value: 30 }] };

    it("shares one ascending list of dates", () => {
        expect(buildChartData([a, b]).labels).toEqual(["2026-06-01", "2026-06-02", "2026-06-03"]);
    });

    it("leaves a null where a series has no point", () => {
        expect(buildChartData([a, b]).series[1].values).toEqual([null, null, 30]);
    });

    it("finds the largest value", () => {
        expect(maxValue(buildChartData([a, b]))).toBe(30);
    });
});

describe("buildChartData compare alignment", () => {
    const pts = (...items: [string, number][]) => items.map(([date, value]) => ({ date, value }));
    const main = (...items: [string, number][]) => ({ id: "a", label: "A", points: pts(...items) });
    const compare = (...items: [string, number][]) => [main(...items)];

    it("aligns week buckets by offset when the calendar weeks are offset", () => {
        // Main weeks start Mon 1 Jun; compare weeks start Mon 4 May with a gap week (11 May) between.
        const data = buildChartData(
            [main(["2026-06-01", 1], ["2026-06-08", 2], ["2026-06-15", 3])],
            compare(["2026-05-04", 10], ["2026-05-18", 30]),
            "week",
        );
        expect(data.series[0].compare).toEqual([10, null, 30]);
    });

    it("reads a mid-week compare start as the week it falls in", () => {
        const data = buildChartData([main(["2026-06-01", 1], ["2026-06-08", 2])], compare(["2026-05-06", 10], ["2026-05-11", 20]), "week");
        expect(data.series[0].compare).toEqual([10, 20]);
    });

    it("aligns month buckets of different lengths by offset", () => {
        const data = buildChartData(
            [main(["2026-03-01", 1], ["2026-04-01", 2], ["2026-05-01", 3])],
            compare(["2025-12-01", 10], ["2026-01-01", 20], ["2026-02-01", 30]),
            "month",
        );
        expect(data.series[0].compare).toEqual([10, 20, 30]);
    });

    it("leaves the trailing points empty when the compare period is shorter", () => {
        const data = buildChartData([main(["2026-06-01", 1], ["2026-06-02", 2], ["2026-06-03", 3])], compare(["2026-05-01", 10]));
        expect(data.series[0].compare).toEqual([10, null, null]);
    });

    it("drops compare points past the last current date", () => {
        const data = buildChartData([main(["2026-06-01", 1])], compare(["2026-05-01", 10], ["2026-05-02", 20]));
        expect(data.series[0].compare).toEqual([10]);
    });

    it("gives each compare point the date it really has", () => {
        const data = buildChartData([main(["2026-06-01", 1], ["2026-06-08", 2])], compare(["2026-05-04", 10], ["2026-05-11", 20]), "week");
        expect(data.series[0].compareLabels).toEqual(["2026-05-04", "2026-05-11"]);
    });

    it("adds up points on the same date in a series", () => {
        expect(buildChartData([main(["2026-06-01", 1], ["2026-06-01", 4])]).series[0].values).toEqual([5]);
    });

    it("adds up compare points on the same date", () => {
        const data = buildChartData([main(["2026-06-01", 1])], compare(["2026-05-01", 10], ["2026-05-01", 5]));
        expect(data.series[0].compare).toEqual([15]);
    });

    it("adds up the compare total on the same offset", () => {
        const other = { id: "b", label: "B", points: pts(["2026-05-01", 5], ["2026-05-01", 1]) };
        const data = buildChartData([main(["2026-06-01", 1])], [...compare(["2026-05-01", 10]), other]);
        expect(data.compareTotal?.values).toEqual([16]);
    });
});

describe("buildChartData with a week start", () => {
    const main = (...items: [string, number][]) => ({ id: "a", label: "A", points: items.map(([date, value]) => ({ date, value })) });
    const weeks = [main(["2026-05-31", 1], ["2026-06-07", 2])];
    const wedAndSun = [main(["2026-05-06", 10], ["2026-05-10", 20])];

    it("matches compare points to Sunday weeks for a week start of 7", () => {
        expect(buildChartData(weeks, wedAndSun, "week", {}, 7).series[0].compare).toEqual([10, 20]);
    });

    it("puts the Wednesday and the Sunday in one Monday week by default", () => {
        expect(buildChartData(weeks, wedAndSun, "week").series[0].compare).toEqual([30, null]);
    });

    it("reads an out-of-range week start of 0 as Monday, not Sunday", () => {
        expect(buildChartData(weeks, wedAndSun, "week", {}, 0 as never).series[0].compare).toEqual([30, null]);
    });
});

describe("buildChartData with the periods' ranges", () => {
    const pts = (...items: [string, number][]) => items.map(([date, value]) => ({ date, value }));
    const main = (...items: [string, number][]) => [{ id: "a", label: "A", points: pts(...items) }];
    // Current period: weeks of 1, 8 and 15 Jun, with the first week missing from the data.
    const sparseMain = main(["2026-06-08", 2], ["2026-06-15", 3]);
    const fullMain = main(["2026-06-01", 1], ["2026-06-08", 2], ["2026-06-15", 3]);
    const compare = main(["2026-05-04", 10], ["2026-05-11", 20], ["2026-05-18", 30]);

    it("misaligns when the current data misses its first week and no range is given", () => {
        expect(buildChartData(sparseMain, compare, "week").series[0].compare).toEqual([10, 20]);
    });

    it("aligns current data that misses its first week when the range is given", () => {
        const data = buildChartData(sparseMain, compare, "week", { from: "2026-06-01", compareFrom: "2026-05-04" });
        expect(data.series[0].compare).toEqual([20, 30]);
    });

    it("aligns compare data that starts late when the compare range is given", () => {
        const lateCompare = main(["2026-05-11", 20], ["2026-05-18", 30]);
        const data = buildChartData(fullMain, lateCompare, "week", { from: "2026-06-01", compareFrom: "2026-05-04" });
        expect(data.series[0].compare).toEqual([null, 20, 30]);
    });

    it("starts each side at its first date without a range", () => {
        const data = buildChartData(fullMain, compare, "week");
        expect(data.series[0].compare).toEqual([10, 20, 30]);
    });

    it("reads a mid-week range start as the week it falls in", () => {
        const data = buildChartData(fullMain, compare, "week", { from: "2026-06-03", compareFrom: "2026-05-06" });
        expect(data.series[0].compare).toEqual([10, 20, 30]);
    });
});

describe("seriesTotals and allWhole", () => {
    const a = { id: "a", label: "A", points: [{ date: "2026-06-01", value: 1 }] };
    const b = { id: "b", label: "B", points: [{ date: "2026-06-01", value: 2 }, { date: "2026-06-02", value: 0.5 }] };

    it("adds the series of each date", () => {
        expect(seriesTotals(buildChartData([a, b]))[0]).toBe(3);
    });

    it("is whole when every value is an integer", () => {
        expect(allWhole(buildChartData([a]))).toBe(true);
    });

    it("is not whole when a compare value has a fraction", () => {
        expect(allWhole(buildChartData([a], [{ ...a, points: [{ date: "2026-05-01", value: 1.5 }] }]))).toBe(false);
    });
});

describe("bucketMarkers", () => {
    const days = ["2026-06-10", "2026-06-11", "2026-06-12"];
    const weeks = ["2026-06-01", "2026-06-08", "2026-06-15"];
    const months = ["2026-04-01", "2026-05-01", "2026-06-01"];
    const marker = (id: string, date: string) => ({ id, date, title: id });
    const indexes = (buckets: ReturnType<typeof bucketMarkers>) => buckets.map((b) => [b.index, b.markers.map((m) => m.id)]);

    it("puts a daily marker on its own date", () => {
        expect(indexes(bucketMarkers([marker("a", "2026-06-11")], days, "day"))).toEqual([[1, ["a"]]]);
    });

    it("drops a daily marker on a date with no point", () => {
        expect(bucketMarkers([marker("a", "2026-06-13"), marker("b", "2026-06-09")], days, "day")).toEqual([]);
    });

    it("puts a weekly marker in the week that contains it, up to the week's last day", () => {
        expect(indexes(bucketMarkers([marker("a", "2026-06-08"), marker("b", "2026-06-14")], weeks, "week"))).toEqual([[1, ["a", "b"]]]);
    });

    it("drops a weekly marker past the last week", () => {
        expect(bucketMarkers([marker("a", "2026-06-22")], weeks, "week")).toEqual([]);
    });

    it("puts a monthly marker in its month, including the last day", () => {
        expect(indexes(bucketMarkers([marker("a", "2026-05-31")], months, "month"))).toEqual([[1, ["a"]]]);
    });

    it("drops a monthly marker in the month after the last", () => {
        expect(bucketMarkers([marker("a", "2026-07-01")], months, "month")).toEqual([]);
    });

    it("lists a bucket's markers earliest first, keeping the given order for the same date", () => {
        const list = [marker("late", "2026-06-12"), marker("x", "2026-06-09"), marker("y", "2026-06-09")];
        expect(indexes(bucketMarkers(list, weeks, "week"))).toEqual([[1, ["x", "y", "late"]]]);
    });

    it("reads the date of a timestamp", () => {
        expect(indexes(bucketMarkers([marker("a", "2026-06-11T09:30:00")], days, "day"))).toEqual([[1, ["a"]]]);
    });
});
