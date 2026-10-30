// T27 — chart error state
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import { deepQuery, recordEvents, renderElement, settle, shadow, type UaxTestElement } from "../internal/test/dom.js";
import "./time-series-chart.element.js";

const series = [{ id: "pv", label: "Pageviews", points: [{ date: "2026-06-01", value: 40 }, { date: "2026-06-02", value: 120 }] }];

// uui-button raises its click a tick after `click()`, so a spec waits before it counts events.
const pressed = async (button: HTMLElement) => {
    button.click();
    await new Promise((resolve) => setTimeout(resolve));
};
const errorState = (el: Element) => shadow(el).querySelector("uax-error-state") as UaxTestElement | null;

describe("Feature: chart error state", () => {
    describe("Scenario: the chart has an error", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-time-series-chart .series=${series} error retryable></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
            await settle(el);
        });

        it("shows the error state", () => {
            expect(errorState(el)).not.toBe(null);
        });

        it("hides the plot", () => {
            expect(shadow(el).querySelector(".plot")?.hasAttribute("hidden")).toBe(true);
        });

        it("shows no empty state", () => {
            expect(shadow(el).querySelector("uax-empty-state")).toBe(null);
        });

        it("raises retry on the chart", async () => {
            const events = recordEvents(el, "retry");
            await pressed(deepQuery(shadow(el), "uui-button")!);
            expect(events).toHaveLength(1);
        });

        it("raises retry once", async () => {
            const outer = recordEvents(el.parentElement!, "retry");
            await pressed(deepQuery(shadow(el), "uui-button")!);
            expect(outer).toHaveLength(1);
        });

        it("clears when the error is cleared", async () => {
            el.error = false;
            await settle(el);
            expect(errorState(el)).toBe(null);
        });
    });

    describe("Scenario: the chart has an error while loading", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-time-series-chart .series=${[]} error loading></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
        });

        it("shows the error state", () => {
            expect(errorState(el)).not.toBe(null);
        });

        it("shows no skeleton", () => {
            expect(deepQuery(shadow(el), "uax-skeleton")).toBe(null);
        });

        it("is not busy", () => {
            expect(shadow(el).querySelector(".region")?.getAttribute("aria-busy")).toBe("false");
        });
    });

    describe("Scenario: the chart has an error with the product's text", () => {
        it("passes the headline on", async () => {
            const el = await renderElement(
                html`<uax-time-series-chart .series=${[]} error error-headline="Chart failed"></uax-time-series-chart>`,
                "uax-time-series-chart",
            );
            expect(errorState(el)!.headline).toBe("Chart failed");
        });
    });
});
