// Adapted from Umbraco UI's vitest.setup.ts so tests read the same across both libraries.
import "@umbraco-ui/uui/themes/light.css";
import { beforeAll, beforeEach } from "vitest";
import { loadUmbracoTestTranslations } from "./src/platform/umbraco/test-localization.js";
import "./vitest.axe.js";

// Every test renders translated text, not keys.
beforeAll(loadUmbracoTestTranslations);

// Each test file runs in an iframe of the test page. Firefox raises no focus or blur events for an element focused
// in a frame that doesn't have focus itself, so a spec's `focus()` could do nothing. Give the frame focus before each
// test, as Vitest itself does before typing (`focusIframe` in @vitest/browser-playwright).
beforeEach(() => {
    window.focus();
});
