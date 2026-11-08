// HRS-5 — Incomplete hours.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { hourlyChart, hoursOf5Nov, rowHeaders, seriesAt } from "./internal/hourly-fixtures.js";

const firstIncomplete = (el: Element) => rowHeaders(el).find((r) => r.includes("incomplete)"));

describe("Feature: incomplete hours", () => {
    const previousLanguage = document.documentElement.lang;
    beforeEach(() => {
        document.documentElement.lang = "en-US";
    });
    afterEach(() => {
        document.documentElement.lang = previousLanguage;
    });

    describe("Scenario: incomplete from a time", () => {
        it("starts at the hour that contains it", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)], incompleteFrom: "2026-11-05T14:23" });
            expect(firstIncomplete(el)).toBe("Nov 5, 2026, 2 PM (incomplete)");
        });

        it("names an hour that is now and incomplete", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)], now: "2026-11-05T14:23", incompleteFrom: "2026-11-05T14:23" });
            expect(firstIncomplete(el)).toBe("Nov 5, 2026, 2 PM (now, incomplete)");
        });
    });

    describe("Scenario: sad path, a plain date", () => {
        it("starts at midnight", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)], incompleteFrom: "2026-11-05" });
            expect(firstIncomplete(el)).toBe("Nov 5, 2026, 12 AM (incomplete)");
        });
    });
});
