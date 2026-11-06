// T66 — The text and badge numbers of a tile or stat value
import { describe, expect, it } from "vitest";
import { badgeFigures, numericValue, UauiFigureFormatter } from "./figure.js";

describe("Feature: the text shown for a tile or stat value", () => {
    const text = (value: number | string | null | undefined, options?: Intl.NumberFormatOptions) => new UauiFigureFormatter().figure(value, "en-US", options)?.text;

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
        expect(formatter.figure(1.5, "en-US", undefined)?.text).toBe("1.5");
        expect(formatter.figure(1.5, "da-DK", undefined)?.text).toBe("1,5");
        expect(formatter.figure(0.5, "da-DK", { style: "percent" })?.text.replace(/\s/g, " ")).toBe("50 %");
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

// T69 — Auto compact for big numbers
describe("Feature: a big number is shown compact", () => {
    const figure = (value: number | string, options?: Intl.NumberFormatOptions, lang = "en-US") => new UauiFigureFormatter().figure(value, lang, options);
    const EUR: Intl.NumberFormatOptions = { style: "currency", currency: "EUR" };
    const clean = (text: string | undefined) => text?.replace(/\s/g, " ");

    describe("Scenario: the threshold", () => {
        it("keeps 999,999 exact", () => {
            expect(figure(999_999)).toEqual({ text: "999,999" });
        });

        it("keeps 999,999.6 exact: the size is the number, not its rounded text", () => {
            expect(figure(999_999.6, { maximumFractionDigits: 0 })).toEqual({ text: "1,000,000" });
        });

        it("compacts 1,000,000 and keeps the exact amount", () => {
            expect(figure(1_000_000)).toEqual({ text: "1M", exact: "1,000,000" });
        });

        it("compacts a negative number by its size", () => {
            expect(figure(-1_234_567)).toEqual({ text: "-1.23M", exact: "-1,234,567" });
        });

        it("does not compact a negative number below the threshold", () => {
            expect(figure(-999_999)).toEqual({ text: "-999,999" });
        });
    });

    describe("Scenario: languages and styles", () => {
        it("compacts in English", () => {
            expect(figure(1_234_567, EUR)).toEqual({ text: "€1.23M", exact: "€1,234,567.00" });
        });

        it("compacts in Danish", () => {
            const da = figure(1_234_567, undefined, "da-DK");
            expect(clean(da?.text)).toBe("1,23 mio.");
            expect(da?.exact).toBe("1.234.567");
        });

        it("compacts DKK", () => {
            const da = figure(12_345_678, { style: "currency", currency: "DKK" }, "da-DK");
            expect(clean(da?.text)).toBe("12,3 mio. kr.");
            expect(clean(da?.exact)).toBe("12.345.678,00 kr.");
        });

        it("compacts a percent by the number, not the percentage: 12,345 (1,234,500%) stays exact", () => {
            expect(figure(12_345, { style: "percent" })?.text).toBe("1,234,500%");
            expect(figure(12_345_678, { style: "percent", maximumFractionDigits: 1 })?.text).toBe("1.23B%");
        });

        it("compacts a unit", () => {
            expect(figure(2_500_000, { style: "unit", unit: "kilobyte", unitDisplay: "short" })?.text).toBe("2.5M kB");
        });
    });

    describe("Scenario: the product's options", () => {
        it("keeps a number exact with notation standard", () => {
            expect(figure(1_234_567, { ...EUR, notation: "standard" })).toEqual({ text: "€1,234,567.00" });
        });

        it("respects another notation of the product", () => {
            expect(figure(1_234_567, { notation: "scientific" })).toEqual({ text: "1.235E6" });
            expect(figure(1_234_567, { notation: "compact", compactDisplay: "long" })).toEqual({ text: "1.2 million" });
        });

        it("ignores the product's digit options in the compact form, and keeps them in the exact amount", () => {
            const options = { ...EUR, minimumFractionDigits: 2, maximumFractionDigits: 2 };
            expect(figure(1_234_567.891, options)).toEqual({ text: "€1.23M", exact: "€1,234,567.89" });
            expect(figure(1_234_567.891, { minimumSignificantDigits: 5, roundingIncrement: 5, maximumFractionDigits: 0 } as Intl.NumberFormatOptions)?.text).toBe("1.23M");
        });

        it("keeps the other options, such as currencyDisplay", () => {
            expect(figure(1_234_567, { ...EUR, currencyDisplay: "code" })?.text.replace(/\s/g, " ")).toBe("EUR 1.23M");
        });

        it("uses up to 3 significant digits at any size", () => {
            expect([figure(12_345_678)?.text, figure(123_456_789)?.text, figure(1_000_000_000)?.text]).toEqual(["12.3M", "123M", "1B"]);
        });
    });

    it("gives no exact amount when it would equal the text, e.g. after the Intl fallback for a bad currency", () => {
        expect(figure(1_234_567, { style: "currency", currency: "EURO" })).toEqual({ text: "1,234,567" });
    });

    it("never changes a string", () => {
        expect(figure("1234567")).toEqual({ text: "1234567" });
    });
});

// KTD-2 — The compact option shortens a number at any size
describe("Feature: a figure can be forced compact", () => {
    const figure = (value: number, options?: Intl.NumberFormatOptions, compact?: boolean) => new UauiFigureFormatter().figure(value, "en-US", options, compact === undefined ? undefined : { compact });

    describe("Scenario: compact is set", () => {
        it("shortens a number under 1,000,000 and keeps the exact amount", () => {
            expect(figure(412_000, undefined, true)).toEqual({ text: "412K", exact: "412,000" });
        });

        it("gives no exact amount for a small number that is the same short", () => {
            expect(figure(5, undefined, true)).toEqual({ text: "5" });
        });

        it("lets the product's notation win", () => {
            expect(figure(412_000, { notation: "standard" }, true)).toEqual({ text: "412,000" });
        });
    });

    describe("Scenario: compact is not set", () => {
        it("keeps a number under 1,000,000 exact", () => {
            expect(figure(412_000)).toEqual({ text: "412,000" });
        });

        it("keeps a number under 1,000,000 exact when compact is false", () => {
            expect(figure(412_000, undefined, false)).toEqual({ text: "412,000" });
        });

        it("still compacts 1,000,000", () => {
            expect(figure(1_000_000)).toEqual({ text: "1M", exact: "1,000,000" });
        });
    });
});
