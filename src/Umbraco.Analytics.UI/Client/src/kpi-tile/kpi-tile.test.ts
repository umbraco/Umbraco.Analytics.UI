// KPI-1 — KPI tile shows a headline number
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { render } from "vitest-browser-lit";
import { renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";

describe("Feature: KPI tile shows a headline number", () => {
    describe("Scenario: label, value and icon", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coins"></uan-kpi-tile>`,
                "uan-kpi-tile",
            );
        });

        it.skip("shows the label", () => {
            expect(shadow(el).textContent).toContain("Revenue");
        });

        it.skip("shows the value exactly as given", () => {
            expect(shadow(el).textContent).toContain("€ 4,837.40");
        });

        it.skip("shows the icon", () => {
            expect(shadow(el).querySelector("uui-icon")?.getAttribute("name")).toBe("icon-coins");
        });
    });

    describe("Scenario: with a delta", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-kpi-tile label="Revenue" value="€ 1" .delta=${18.7}></uan-kpi-tile>`, "uan-kpi-tile");
        });

        it.skip("shows a change badge for the delta", () => {
            expect((shadow(el).querySelector("uan-delta-badge") as UanTestElement | null)?.value).toBe(18.7);
        });
    });

    describe("Scenario: tiles in one row", () => {
        let heights: number[];
        beforeEach(async () => {
            const { container } = render(html`<div style="display:grid;grid-template-columns:repeat(3,160px)">
                <uan-kpi-tile label="Revenue" value="1"></uan-kpi-tile>
                <uan-kpi-tile label="Carts created this period" value="2"></uan-kpi-tile>
                <uan-kpi-tile label="Orders" value="3"></uan-kpi-tile>
            </div>`);
            const tiles = [...container.querySelectorAll("uan-kpi-tile")] as UanTestElement[];
            await Promise.all(tiles.map((t) => t.updateComplete));
            heights = tiles.map((t) => t.getBoundingClientRect().height);
        });

        it.skip("are all the same height", () => {
            expect(new Set(heights).size).toBe(1);
        });
    });

    describe("Scenario: a narrow tile", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<div style="width:140px"><uan-kpi-tile label="Revenue" value="€ 4,837.40" .delta=${18.7}></uan-kpi-tile></div>`,
                "uan-kpi-tile",
            );
        });

        it.skip("puts the badge below the value", () => {
            const value = shadow(el).querySelector("[part~='value']")!.getBoundingClientRect();
            const badge = shadow(el).querySelector("uan-delta-badge")!.getBoundingClientRect();
            expect(badge.top).toBeGreaterThanOrEqual(value.bottom);
        });
    });

    describe("Scenario (sad path): no delta", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-kpi-tile label="Orders" value="26"></uan-kpi-tile>`, "uan-kpi-tile");
        });

        it.skip("shows no badge", () => {
            expect(shadow(el).querySelector("uan-delta-badge")).toBe(null);
        });
    });
});
