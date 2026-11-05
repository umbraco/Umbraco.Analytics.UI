import { describe, expect, it } from "vitest";
import { buildChartData } from "./chart-data.js";
import { hoursOf25Oct, hoursOf4Nov, hoursOf5Nov, seriesAt, utcHours } from "./hourly-fixtures.js";

/** The 24 local hours of 24 Oct 2026 in Copenhagen (CEST). */
const hoursOf24Oct = utcHours("2026-10-23T22:00:00Z", 24);

describe("buildChartData compare alignment at hour level", () => {
    describe("on a 25-hour current day", () => {
        const data = buildChartData(
            [seriesAt("r", hoursOf25Oct, () => 1)],
            [seriesAt("r", [hoursOf24Oct[2]], () => 7)],
            "hour",
            { from: "2026-10-25", compareFrom: "2026-10-24" },
        );

        it("puts the compare value on the first 2 AM bar", () => {
            expect(data.series[0].compare?.[2]).toBe(7);
        });

        it("leaves the second 2 AM bar without a compare value", () => {
            expect(data.series[0].compare?.[3]).toBeNull();
        });
    });

    it("lines the compare total up by wall-clock hour when points are sparse", () => {
        const data = buildChartData(
            [seriesAt("r", [hoursOf5Nov[9], hoursOf5Nov[14]], () => 1)],
            [seriesAt("r", [hoursOf4Nov[14]], () => 8)],
            "hour",
            { from: "2026-11-05", compareFrom: "2026-11-04" },
        );
        expect(data.compareTotal?.values).toEqual([null, 8]);
    });

    it("lines 3 PM under 3 PM without a range", () => {
        const data = buildChartData(
            [seriesAt("r", [hoursOf5Nov[9], hoursOf5Nov[15]], () => 1)],
            [seriesAt("r", [hoursOf4Nov[9], hoursOf4Nov[15]], (i) => (i === 0 ? 3 : 8))],
            "hour",
        );
        expect(data.series[0].compare).toEqual([3, 8]);
    });
});
