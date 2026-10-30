// CHT-4 — Event markers
import { beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { nextEvent, renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";

const series = [{ id: "pv", label: "Pageviews", points: [
    { date: "2026-06-10", value: 120 }, { date: "2026-06-11", value: 280 }, { date: "2026-06-12", value: 140 },
] }];
const launch = { id: "m1", date: "2026-06-11", title: "Spring product launch", description: "Homepage hero went live." };
const earlier = { id: "m0", date: "2026-06-10", title: "Newsletter" };
const outside = { id: "m9", date: "2026-07-01", title: "Summer sale" };

const markers = (el: Element) => [...shadow(el).querySelectorAll("[part~='marker']")] as HTMLElement[];
const chart = (list: unknown[]) =>
    renderElement(
        html`<uax-time-series-chart kind="line" .series=${series} .markers=${list} style="width:600px"></uax-time-series-chart>`,
        "uax-time-series-chart",
    );

describe("Feature: event markers", () => {
    describe("Scenario: a marker within the range", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await chart([launch]);
        });

        it.skip("draws a dot on the x-axis for it", () => {
            expect(markers(el)).toHaveLength(1);
        });
    });

    describe("Scenario: hovering a marker", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await chart([launch]);
            await userEvent.hover(page.elementLocator(markers(el)[0]));
        });

        it.skip("shows the date, title and description", () => {
            expect(shadow(el).querySelector("[part~='tooltip']")?.textContent).toMatch(/11[\s\S]*Spring product launch[\s\S]*Homepage hero/);
        });
    });

    describe("Scenario: clicking a marker", () => {
        let detail: unknown;
        beforeEach(async () => {
            const el = await chart([launch]);
            const event = nextEvent(el, "marker-click");
            markers(el)[0].click();
            detail = (await event).detail;
        });

        it.skip("raises marker-click with its id", () => {
            expect(detail).toEqual({ id: "m1" });
        });
    });

    describe("Scenario: tabbing through markers", () => {
        let focusedTitles: string[];
        beforeEach(async () => {
            const el = await chart([launch, earlier]);
            focusedTitles = [];
            for (let i = 0; i < 2; i++) {
                await userEvent.tab();
                focusedTitles.push(shadow(el).activeElement?.getAttribute("aria-label") ?? "");
            }
        });

        it.skip("moves through the markers in date order", () => {
            expect(focusedTitles.map((t) => t.includes("Newsletter") ? 0 : 1)).toEqual([0, 1]);
        });
    });

    describe("Scenario (sad path): a marker outside the range", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await chart([outside]);
        });

        it.skip("draws no dot", () => {
            expect(markers(el)).toHaveLength(0);
        });
    });
});
