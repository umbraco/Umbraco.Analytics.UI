// T42 — funnel maths
import { describe, expect, it } from "vitest";
import { buildFunnel, cleanValue, linkClipPath } from "./funnel-data.js";
import { cartSteps, cartStepsPrevious } from "./funnel-fixtures.js";

describe("Feature: funnel maths", () => {
    describe("Scenario: steps with no comparison", () => {
        const rows = buildFunnel(cartSteps);

        it("makes the largest step full width", () => {
            expect(rows[0].width).toBe(100);
        });

        it("sizes the other bars by their value", () => {
            expect(rows[2].width).toBeCloseTo((318 / 1240) * 100);
        });

        it("gives each step its share of the first", () => {
            expect(rows[1].ofFirst).toBeCloseTo(532 / 1240);
        });

        it("gives each step after the first its share of the previous one", () => {
            expect(rows[2].rate).toBeCloseTo(318 / 532);
        });

        it("gives the first step no rate", () => {
            expect(rows[0].rate).toBe(null);
        });

        it("draws no brackets", () => {
            expect(rows.every((r) => r.compareWidth === undefined)).toBe(true);
        });
    });

    describe("Scenario: a comparison", () => {
        it("puts both periods on one scale, the largest value of either", () => {
            const rows = buildFunnel([{ id: "a", label: "A", value: 50 }], [{ id: "a", label: "A", value: 100 }]);
            expect([rows[0].width, rows[0].compareWidth]).toEqual([50, 100]);
        });

        it("matches compare steps by id, not position", () => {
            const rows = buildFunnel(cartSteps, [...cartStepsPrevious].reverse());
            expect(rows[0].compare).toBe(1105);
        });

        it("works out the compare rate", () => {
            expect(buildFunnel(cartSteps, cartStepsPrevious)[1].compareRate).toBeCloseTo(498 / 1105);
        });

        it("gives a step with no match no compare value", () => {
            expect(buildFunnel(cartSteps, cartStepsPrevious.slice(0, 2))[2].compare).toBe(undefined);
        });

        it("gives the step after a missing match no compare rate", () => {
            const rows = buildFunnel(cartSteps, [cartStepsPrevious[0], cartStepsPrevious[2]]);
            expect(rows[2].compareRate).toBe(null);
        });
    });

    describe("Scenario (sad path): zeros and bad values", () => {
        it("gives the step after a 0 no rate", () => {
            const rows = buildFunnel([
                { id: "a", label: "A", value: 10 },
                { id: "b", label: "B", value: 0 },
                { id: "c", label: "C", value: 0 },
            ]);
            expect(rows[2].rate).toBe(null);
        });

        it("counts a negative value as 0", () => {
            expect(cleanValue(-4)).toBe(0);
        });

        it("counts NaN as 0", () => {
            expect(cleanValue(Number.NaN)).toBe(0);
        });

        it("draws every bar at 0 when every value is 0", () => {
            expect(buildFunnel([{ id: "a", label: "A", value: 0 }])[0].width).toBe(0);
        });

        it("gives no share of the first when the first is 0", () => {
            expect(buildFunnel([{ id: "a", label: "A", value: 0 }])[0].ofFirst).toBe(null);
        });
    });

    describe("Scenario: the link between two bars", () => {
        it("runs from the upper bar's width to the lower one's, centred", () => {
            expect(linkClipPath(100, 50)).toBe("polygon(0% 0, 100% 0, 75% 100%, 25% 100%)");
        });
    });
});
