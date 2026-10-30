// T27 — tile error state
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import { renderElement, shadow, type UaxTestElement } from "../internal/test/dom.js";
import "./kpi-tile.element.js";

describe("Feature: tile error state", () => {
    describe("Scenario: the tile has an error", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-kpi-tile label="Revenue" value="€ 10" icon="icon-coins" .delta=${5} error></uax-kpi-tile>`,
                "uax-kpi-tile",
            );
        });

        it("keeps the label", () => {
            expect(shadow(el).querySelector(".label")?.textContent).toBe("Revenue");
        });

        it("shows a dash instead of the value", () => {
            expect(shadow(el).querySelector(".value [aria-hidden='true']")?.textContent).toBe("—");
        });

        it("tells assistive tech something went wrong", () => {
            expect(shadow(el).querySelector(".value .visually-hidden")?.textContent).toBe("Something went wrong");
        });

        it("shows no change badge", () => {
            expect(shadow(el).querySelector("uax-delta-badge")).toBe(null);
        });

        it("reflects the attribute", () => {
            expect(el.hasAttribute("error")).toBe(true);
        });
    });

    describe("Scenario: the tile has an error while loading and marked no-data", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-kpi-tile label="Revenue" error loading no-data></uax-kpi-tile>`, "uax-kpi-tile");
        });

        it("shows the error text, not the no-data text", () => {
            expect(shadow(el).querySelector(".value .visually-hidden")?.textContent).toBe("Something went wrong");
        });

        it("shows no skeleton", () => {
            expect(shadow(el).querySelector("uax-skeleton")).toBe(null);
        });

        it("is not busy", () => {
            expect(shadow(el).querySelector(".content")?.getAttribute("aria-busy")).toBe("false");
        });
    });
});
