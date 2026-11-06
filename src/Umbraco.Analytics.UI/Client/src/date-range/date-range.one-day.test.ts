// HRS-9 — A one-day range reads as one date.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import { uauiFormatDateRange } from "../date-helpers/index.js";
import { deepText, renderElement, shadow } from "../internal/test/dom.js";
import "./date-range.element.js";

// Stands in for a localization controller, as date-helpers.test.ts does.
const localize = {
    date: (date: Date, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", options).format(date),
    term: (key: string, ...args: unknown[]) => (key === "uauiAnalytics_dateRangeRange" ? `${args[0]} to ${args[1]}` : key),
};

describe("Feature: a one-day range reads as one date", () => {
    describe("Scenario: the helper", () => {
        it("returns one date when from and to are the same", () => {
            expect(uauiFormatDateRange(localize, { from: "2026-11-05", to: "2026-11-05" })).toBe("Nov 5, 2026");
        });
    });

    describe("Scenario: the button", () => {
        const previousLanguage = umbLocalizationManager.documentLanguage;
        beforeEach(() => {
            umbLocalizationManager.documentLanguage = "en-US";
        });
        afterEach(() => {
            umbLocalizationManager.documentLanguage = previousLanguage;
        });

        it("shows one date", async () => {
            const el = await renderElement(html`<uaui-date-range .value=${{ from: "2026-11-05", to: "2026-11-05" }}></uaui-date-range>`, "uaui-date-range");
            expect(deepText(shadow(el).querySelector(".range")!)).toBe("Nov 5, 2026");
        });
        it("names the button with one date", async () => {
            const el = await renderElement(html`<uaui-date-range .value=${{ from: "2026-11-05", to: "2026-11-05" }}></uaui-date-range>`, "uaui-date-range");
            expect(shadow(el).querySelector("uui-button")!.getAttribute("label")).toMatch(/^(?!.* to ).*Nov 5, 2026/);
        });
    });

    describe("Scenario: sad path, two days", () => {
        it("still reads as a range", () => {
            expect(uauiFormatDateRange(localize, { from: "2026-11-04", to: "2026-11-05" })).toBe("Nov 4, 2026 to Nov 5, 2026");
        });
    });
});
