// SAC-2 AC1–AC3 — standalone core package (docs/plans/standalone-core).
// The Umbraco build keeps its localization extensions: the package's English at weight 200, a product's own at the
// default 100 on top, and the backoffice user's culture choosing the dictionary.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { umbLocalizationRegistry } from "@umbraco-cms/backoffice/localization";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import { html } from "#platform/lit";
import { renderElement, shadow, type UauiTestElement } from "../../internal/test/dom.js";
import "../../empty-state/empty-state.element.js";
import { registerUauiLocalization, UAUI_EN_ALIAS } from "./localization-register.js";
import { waitForKey } from "./test-localization.js";

const PRODUCT_ALIAS = "Uaui.Test.Product";
const DANISH_ALIAS = "Uaui.Test.Danish";

const headline = (el: UauiTestElement) => shadow(el).querySelector(".headline")?.textContent;

describe("Feature: Umbraco translations still win", () => {
    const previousLanguage = umbLocalizationManager.documentLanguage;
    afterEach(() => {
        umbExtensionsRegistry.unregister(PRODUCT_ALIAS);
        umbExtensionsRegistry.unregister(DANISH_ALIAS);
        umbLocalizationManager.documentLanguage = previousLanguage;
    });

    describe("Scenario: Our English text shows", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            registerUauiLocalization();
            el = await renderElement(html`<uaui-empty-state></uaui-empty-state>`, "uaui-empty-state");
        });

        it("it shows the package's English headline", () => {
            expect(headline(el)).toBe("No data yet");
        });
    });

    describe("Scenario: A product's override wins", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            // The product registers before the package re-registers, so only the package's weight (200 against the
            // product's 100) can make the product's text win.
            umbExtensionsRegistry.unregister(UAUI_EN_ALIAS);
            umbExtensionsRegistry.register({
                type: "localization",
                alias: PRODUCT_ALIAS,
                name: "Product override (test)",
                weight: 100,
                meta: { culture: "en", localizations: { uauiAnalytics: { emptyHeadline: "Nothing yet" } } },
            });
            registerUauiLocalization();
            await waitForKey("uauiAnalytics_emptyHeadline", "Nothing yet");
            el = await renderElement(html`<uaui-empty-state></uaui-empty-state>`, "uaui-empty-state");
        });
        afterEach(async () => {
            umbExtensionsRegistry.unregister(PRODUCT_ALIAS);
            umbExtensionsRegistry.unregister(UAUI_EN_ALIAS);
            registerUauiLocalization();
            await waitForKey("uauiAnalytics_emptyHeadline", "No data yet");
        });

        it('it shows "Nothing yet"', () => {
            expect(headline(el)).toBe("Nothing yet");
        });
    });

    describe("Scenario: The user's culture sets the language", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            umbExtensionsRegistry.register({
                type: "localization",
                alias: DANISH_ALIAS,
                name: "Danish (test)",
                meta: { culture: "da-dk", localizations: { uauiAnalytics: { emptyHeadline: "Ingen data endnu" } } },
            });
            await umbLocalizationRegistry.loadLanguage("da-dk");
            umbLocalizationManager.documentLanguage = "da-DK";
            el = await renderElement(html`<uaui-empty-state></uaui-empty-state>`, "uaui-empty-state");
        });

        it("it shows the Danish text", () => {
            expect(headline(el)).toBe("Ingen data endnu");
        });
    });
});
