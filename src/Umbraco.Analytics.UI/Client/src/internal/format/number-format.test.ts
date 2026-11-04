// T66 — One cached number formatter per culture and options, that never throws on options Intl rejects
import { describe, expect, it } from "vitest";
import { getNumberFormat } from "./number-format.js";

const plain = (text: string | undefined) => text?.replace(/\s/g, " ");

describe("Feature: a cached number formatter", () => {
    describe("Scenario: valid options", () => {
        it("formats in the given culture", () => {
            expect(plain(getNumberFormat("da-DK", { style: "currency", currency: "DKK" }).format(1234.5))).toBe("1.234,50 kr.");
        });

        it("reuses the formatter for the same culture and options", () => {
            expect(getNumberFormat("en-US", { maximumFractionDigits: 1 })).toBe(getNumberFormat("en-US", { maximumFractionDigits: 1 }));
        });
    });

    describe("Scenario (sad path): options Intl rejects", () => {
        it("falls back to the default format for a bad currency code, without throwing", () => {
            expect(getNumberFormat("en-US", { style: "currency", currency: "EURO" }).format(1234.5)).toBe("1,234.5");
        });

        it("keeps the culture of the fallback", () => {
            expect(getNumberFormat("da-DK", { style: "currency", currency: "nope!" }).format(1234.5)).toBe("1.234,5");
        });

        it("caches the fallback under the bad options", () => {
            const options = { style: "unit", unit: "not-a-unit" } as const;
            expect(getNumberFormat("en-US", options)).toBe(getNumberFormat("en-US", options));
        });
    });
});
