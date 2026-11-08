// SAC-1 AC1–AC5 — standalone core package (docs/plans/standalone-core).
// AC4 runs here; AC1–AC3 and AC5 are pending until the build tasks that own them.
import { describe, expect, it } from "vitest";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { html } from "#platform/lit";
import { renderElement } from "../../internal/test/dom.js";
import "../../kpi-tile/kpi-tile.element.js";

describe("Feature: Products see no change", () => {
    describe("Scenario: The public API report doesn't move", () => {
        // Given the split is built
        // When  npm run check:api runs
        it.skip("api/analytics-ui.api.md has no changes", () => {
            // AC1: one assertion.
        });
    });
    describe("Scenario: The Umbraco output has the same files", () => {
        // Given the split is built
        // When  the wwwroot folder is listed
        it.skip("it holds umbraco-analytics-ui.js, lang/en.js, external/chart.js/index.js and umbraco-package.json, as before", () => {
            // AC2: one assertion.
        });
    });
    describe("Scenario: The import map is the same", () => {
        // Given the split is built
        // When  umbraco-package.json is read
        it.skip("its import map has exactly @umbraco/analytics-ui and @umbraco/analytics-ui/external/chart.js", () => {
            // AC3: one assertion.
        });
    });
    describe("Scenario: Elements are still Umbraco elements", () => {
        // Given the Umbraco build
        // When  a uaui-kpi-tile is created
        it("it is an instance of UmbLitElement", async () => {
            const el = await renderElement(html`<uaui-kpi-tile label="Visitors" value="12"></uaui-kpi-tile>`, "uaui-kpi-tile");
            expect(el).toBeInstanceOf(UmbLitElement);
        });
    });
    describe("Scenario: The Umbraco bundle loads Lit and UUI from the backoffice", () => {
        // Given the Umbraco build's main bundle
        // When  its imports are read
        it.skip("Lit and UUI come only from @umbraco-cms/backoffice/external/*", () => {
            // AC5: one assertion.
        });
    });
});
