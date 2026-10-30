// FND-3 — Empty and loading states (empty state: AC1, AC2)
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";

describe("Feature: empty state", () => {
    describe("Scenario: the product's text", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-empty-state headline="No pageviews yet"></uan-empty-state>`, "uan-empty-state");
        });

        it.skip("shows the headline", () => {
            expect(shadow(el).textContent).toContain("No pageviews yet");
        });
    });

    describe("Scenario: a data element with no data and no text set", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-time-series-chart kind="line" .series=${[]}></uan-time-series-chart>`,
                "uan-time-series-chart",
            );
        });

        it.skip("shows uan-empty-state with the default text", () => {
            expect(shadow(el).querySelector("uan-empty-state")?.shadowRoot?.textContent).toContain("No data yet");
        });
    });
});
