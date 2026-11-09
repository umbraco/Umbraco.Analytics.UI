// FND-2 — Built-in text is translated
// The Umbraco build's own override rules (extension weights) are in src/platform/umbraco/localization.test.ts.
// The override spec renders a tiny test element; the aria-label spec renders uaui-date-range.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { customElement, html } from "#platform/lit";
import { UauiLitElement } from "#platform/base-element";
import { renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "../empty-state/empty-state.element.js";
import "../date-range/date-range.element.js";
import { registerUauiTranslationOverride } from "../internal/test/localization.js";

@customElement("uaui-test-localized")
export class UauiTestLocalizedElement extends UauiLitElement {
    override render() {
        return html`
            <h2>${this.localize.term("uauiAnalytics_emptyHeadline")}</h2>
        `;
    }
}

describe("Feature: built-in text is translated", () => {
    describe("Scenario: strings come from localization keys", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-empty-state></uaui-empty-state>`, "uaui-empty-state");
        });

        it("shows the English translation, not the raw key", () => {
            expect(shadow(el).querySelector(".headline")?.textContent).toBe("No data yet");
        });
    });

    describe("Scenario: a product overrides a string", () => {
        let el: UauiTestElement;
        let restore: () => void;
        beforeEach(async () => {
            restore = registerUauiTranslationOverride("emptyHeadline", "Nothing here");
            el = await renderElement(html`<uaui-test-localized></uaui-test-localized>`, "uaui-test-localized");
        });
        afterEach(() => restore());

        it("shows the product's text", () => {
            expect(shadow(el).querySelector("h2")?.textContent).toBe("Nothing here");
        });
    });

    describe("Scenario (sad path): aria labels are translated too", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-date-range></uaui-date-range>`, "uaui-date-range");
        });

        it("gives the icon-led control a translated aria-label", () => {
            expect(shadow(el).querySelector("uui-button")?.getAttribute("label")).toContain("Choose date range");
        });
    });
});
