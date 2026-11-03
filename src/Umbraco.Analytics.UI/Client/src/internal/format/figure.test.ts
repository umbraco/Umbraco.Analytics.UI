// T66 — The text and badge numbers of a tile or stat value
import { describe, expect, it } from "vitest";
import { badgeFigures, numericValue, UauiFigureFormatter } from "./figure.js";

describe("Feature: the text shown for a tile or stat value", () => {
    const text = (value: number | string | null | undefined, options?: Intl.NumberFormatOptions) => new UauiFigureFormatter().text(value, "en-US", options);

    it("shows a string exactly as given", () => {
        expect(text("€ 4,837.40", { style: "currency", currency: "USD" })).toBe("€ 4,837.40");
    });

    it("formats a number", () => {
        expect(text(4837.4)).toBe("4,837.4");
    });

    it("shows 0", () => {
        expect(text(0)).toBe("0");
    });

    it.each<[string, number | string | null | undefined]>([
        ["an empty string", ""],
        ["NaN", Number.NaN],
        ["Infinity", Number.POSITIVE_INFINITY],
        ["undefined", undefined],
        ["null", null],
    ])("treats %s as no value", (_, value) => {
        expect(text(value)).toBeUndefined();
    });

    it("follows a change of language and options", () => {
        const formatter = new UauiFigureFormatter();
        expect(formatter.text(1.5, "en-US", undefined)).toBe("1.5");
        expect(formatter.text(1.5, "da-DK", undefined)).toBe("1,5");
        expect(formatter.text(0.5, "da-DK", { style: "percent" })?.replace(/\s/g, " ")).toBe("50 %");
    });

    it("uses only a finite number for the badge", () => {
        expect([numericValue(5), numericValue(0), numericValue("5"), numericValue(Number.NaN), numericValue(undefined)]).toEqual([5, 0, undefined, undefined, undefined]);
    });
});

describe("Feature: the numbers a tile or stat badge compares", () => {
    const PERCENT: Intl.NumberFormatOptions = { style: "percent" };

    it("uses a set current and previous as given, even for points with a percent format", () => {
        expect(badgeFigures(0.256, 25.6, 24, "points", PERCENT)).toEqual({ current: 25.6, previous: 24 });
    });

    it("scales a number value and previous by 100 for points with a percent format", () => {
        const { current, previous } = badgeFigures(0.256, undefined, 0.24, "points", PERCENT);
        expect([current, previous].map((n) => Math.round(n! * 100) / 100)).toEqual([25.6, 24]);
    });

    it("doesn't scale a percent change", () => {
        expect(badgeFigures(0.256, undefined, 0.24, "percent", PERCENT)).toEqual({ current: 0.256, previous: 0.24 });
    });

    it("doesn't scale points in any other format", () => {
        expect(badgeFigures(62, undefined, 60, "points", { style: "unit", unit: "percent" })).toEqual({ current: 62, previous: 60 });
    });

    it("has no current for a string value", () => {
        expect(badgeFigures("25.6%", undefined, 0.24, "points", PERCENT)).toEqual({ current: undefined, previous: 0.24 });
    });

    it("keeps a missing previous missing", () => {
        expect(badgeFigures(0.256, undefined, undefined, "points", PERCENT)).toEqual({ current: 25.6, previous: undefined });
    });
});
