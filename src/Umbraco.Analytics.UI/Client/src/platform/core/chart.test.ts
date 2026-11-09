import { describe, expect, it } from "vitest";
import { Chart, uauiChartColors } from "#platform/chart";

describe("#platform/chart in the core build", () => {
    it("exports Chart.js", () => {
        expect(typeof Chart).toBe("function");
    });

    it("exports the look helpers", () => {
        expect(typeof uauiChartColors).toBe("function");
    });
});
