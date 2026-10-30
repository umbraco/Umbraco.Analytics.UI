// FND-2 — Built-in text is translated
// Pending until T2 adds src/lang/en.ts and the test localization helper (src/internal/test/localization.ts).
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";

describe("Feature: built-in text is translated", () => {
    describe("Scenario: strings come from localization keys", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-empty-state></uan-empty-state>`, "uan-empty-state");
        });

        it.skip("shows the English translation, not the raw key", () => {
            expect(shadow(el).textContent).not.toContain("uanAnalytics_");
        });
    });

    describe("Scenario: a product overrides a string", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            // Arrange: register a product localization overriding uanAnalytics_emptyHeadline with "Nothing here"
            el = await renderElement(html`<uan-empty-state></uan-empty-state>`, "uan-empty-state");
        });

        it.skip("shows the product's text", () => {
            expect(shadow(el).textContent).toContain("Nothing here");
        });
    });

    describe("Scenario (sad path): aria labels are translated too", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-date-range></uan-date-range>`, "uan-date-range");
        });

        it.skip("gives the icon-only control a translated aria-label", () => {
            expect(shadow(el).querySelector("[aria-label]")?.getAttribute("aria-label")).toMatch(/^(?!uanAnalytics_).+/);
        });
    });
});
