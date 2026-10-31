// T27 — chart error state
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import { deepQuery, pressed, recordEvents, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./time-series-chart.element.js";

const series = [{ id: "pv", label: "Pageviews", points: [{ date: "2026-06-01", value: 40 }, { date: "2026-06-02", value: 120 }] }];

const errorState = (el: Element) => shadow(el).querySelector("uaui-error-state") as UauiTestElement | null;

describe("Feature: chart error state", () => {
    describe("Scenario: the chart has an error", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-time-series-chart .series=${series} error retryable></uaui-time-series-chart>`,
                "uaui-time-series-chart",
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
            expect(shadow(el).querySelector("uaui-empty-state")).toBe(null);
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
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-time-series-chart .series=${[]} error loading></uaui-time-series-chart>`,
                "uaui-time-series-chart",
            );
        });

        it("shows the error state", () => {
            expect(errorState(el)).not.toBe(null);
        });

        it("shows no skeleton", () => {
            expect(deepQuery(shadow(el), "uaui-skeleton")).toBe(null);
        });

        it("is not busy", () => {
            expect(shadow(el).querySelector(".region")?.getAttribute("aria-busy")).toBe("false");
        });
    });

    describe("Scenario: the chart has an error with the product's text", () => {
        it("passes the headline on", async () => {
            const el = await renderElement(
                html`<uaui-time-series-chart .series=${[]} error error-headline="Chart failed"></uaui-time-series-chart>`,
                "uaui-time-series-chart",
            );
            expect(errorState(el)!.headline).toBe("Chart failed");
        });
    });
});
