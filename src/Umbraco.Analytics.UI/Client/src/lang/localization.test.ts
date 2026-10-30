// FND-2 — Built-in text is translated
// The override and aria-label specs render a tiny test element until uan-date-range (T13) exists, then should be pointed at it.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { customElement, html } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import "../empty-state/empty-state.element.js";
import { registerUanLocalization, UAN_EN_ALIAS } from "../internal/localization/register.js";
import { registerUanTranslationOverride } from "../internal/test/localization.js";

@customElement("uan-test-localized")
export class UanTestLocalizedElement extends UmbLitElement {
    override render() {
        return html`
            <h2>${this.localize.term("uanAnalytics_emptyHeadline")}</h2>
            <button aria-label=${this.localize.term("uanAnalytics_dateRangeButtonLabel")}></button>
        `;
    }
}

describe("Feature: built-in text is translated", () => {
    describe("Scenario: strings come from localization keys", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-empty-state></uan-empty-state>`, "uan-empty-state");
        });

        it("shows the English translation, not the raw key", () => {
            expect(shadow(el).querySelector(".headline")?.textContent).toBe("No data yet");
        });
    });

    describe("Scenario: a product overrides a string", () => {
        let el: UanTestElement;
        let restore: () => Promise<void>;
        beforeEach(async () => {
            // The product registers first and the package second, so only the package's weight
            // (200 against the product's default) can make the product's text win.
            umbExtensionsRegistry.unregister(UAN_EN_ALIAS);
            restore = await registerUanTranslationOverride("emptyHeadline", "Nothing here");
            registerUanLocalization();
            await new Promise((resolve) => setTimeout(resolve, 300));
            el = await renderElement(html`<uan-test-localized></uan-test-localized>`, "uan-test-localized");
        });
        afterEach(() => restore());

        it("shows the product's text", () => {
            expect(shadow(el).querySelector("h2")?.textContent).toBe("Nothing here");
        });
    });

    describe("Scenario (sad path): aria labels are translated too", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-test-localized></uan-test-localized>`, "uan-test-localized");
        });

        it("gives the icon-only control a translated aria-label", () => {
            expect(shadow(el).querySelector("[aria-label]")?.getAttribute("aria-label")).toBe("Choose date range");
        });
    });
});
