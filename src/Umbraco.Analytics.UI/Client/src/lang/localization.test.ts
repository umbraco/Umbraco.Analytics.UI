// FND-2 — Built-in text is translated
// The override spec renders a tiny test element; the aria-label spec renders uax-date-range.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { customElement, html } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { renderElement, shadow, type UaxTestElement } from "../internal/test/dom.js";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import "../empty-state/empty-state.element.js";
import "../date-range/date-range.element.js";
import { renderWithModals } from "../internal/test/modal-host.js";
import { registerUaxLocalization, UAX_EN_ALIAS } from "../internal/localization/register.js";
import { registerUaxTranslationOverride } from "../internal/test/localization.js";

@customElement("uax-test-localized")
export class UaxTestLocalizedElement extends UmbLitElement {
    override render() {
        return html`
            <h2>${this.localize.term("uaxAnalytics_emptyHeadline")}</h2>
        `;
    }
}

describe("Feature: built-in text is translated", () => {
    describe("Scenario: strings come from localization keys", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-empty-state></uax-empty-state>`, "uax-empty-state");
        });

        it("shows the English translation, not the raw key", () => {
            expect(shadow(el).querySelector(".headline")?.textContent).toBe("No data yet");
        });
    });

    describe("Scenario: a product overrides a string", () => {
        let el: UaxTestElement;
        let restore: () => Promise<void>;
        beforeEach(async () => {
            // The product registers first and the package second, so only the package's weight
            // (200 against the product's default) can make the product's text win.
            umbExtensionsRegistry.unregister(UAX_EN_ALIAS);
            restore = await registerUaxTranslationOverride("emptyHeadline", "Nothing here");
            registerUaxLocalization();
            await new Promise((resolve) => setTimeout(resolve, 300));
            el = await renderElement(html`<uax-test-localized></uax-test-localized>`, "uax-test-localized");
        });
        afterEach(() => restore());

        it("shows the product's text", () => {
            expect(shadow(el).querySelector("h2")?.textContent).toBe("Nothing here");
        });
    });

    describe("Scenario (sad path): aria labels are translated too", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderWithModals(html`<uax-date-range></uax-date-range>`, "uax-date-range");
        });

        it("gives the icon-led control a translated aria-label", () => {
            expect(shadow(el).querySelector("uui-button")?.getAttribute("label")).toContain("Choose date range");
        });
    });
});
