// KPI-2 — KPI tiles switch the chart's metric
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { userEvent } from "vitest/browser";
import { recordEvents, renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";

describe("Feature: KPI tiles switch the chart's metric", () => {
    describe("Scenario: clicking a selectable tile", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderElement(html`<uan-kpi-tile label="Orders" value="26" selectable></uan-kpi-tile>`, "uan-kpi-tile");
            events = recordEvents(el, "select");
            (shadow(el).querySelector("button") as HTMLElement).click();
        });

        it.skip("raises select", () => {
            expect(events).toHaveLength(1);
        });
    });

    describe("Scenario: pressing Enter on a selectable tile", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderElement(html`<uan-kpi-tile label="Orders" value="26" selectable></uan-kpi-tile>`, "uan-kpi-tile");
            events = recordEvents(el, "select");
            (shadow(el).querySelector("button") as HTMLElement).focus();
            await userEvent.keyboard("{Enter}");
        });

        it.skip("raises select", () => {
            expect(events).toHaveLength(1);
        });
    });

    describe("Scenario: a selected tile", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-kpi-tile label="Orders" value="26" selectable selected></uan-kpi-tile>`, "uan-kpi-tile");
        });

        it.skip("reports aria-pressed true", () => {
            expect(shadow(el).querySelector("button")?.getAttribute("aria-pressed")).toBe("true");
        });
    });

    describe("Scenario (sad path): a tile that isn't selectable", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderElement(html`<uan-kpi-tile label="Orders" value="26"></uan-kpi-tile>`, "uan-kpi-tile");
            events = recordEvents(el, "select");
            el.click();
        });

        it.skip("raises no select event", () => {
            expect(events).toHaveLength(0);
        });
    });
});
