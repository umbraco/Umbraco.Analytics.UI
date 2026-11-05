// HRS-6 — Hour labels. Pending until T9 (AC1–AC3, AC6, AC7) (docs/plans/hourly-buckets/PLAN.md).
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import { deepText, shadow } from "../internal/test/dom.js";
import { chartOf, hourlyChart, hoursOf25Oct, hoursOf4Nov, hoursOf5Nov, rowHeaders, seriesAt, xTickLabels } from "./internal/hourly-fixtures.js";

const hoverHeading = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const x = chartOf(el).getDatasetMeta(0).data[index].x;
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
    await expect.poll(() => (shadow(el).querySelector("uaui-chart-tooltip") as HTMLElement).style.visibility).toBe("visible");
    return deepText(shadow(el).querySelector("uaui-chart-tooltip")!);
};

describe("Feature: hour labels", () => {
    const englishBefore = umbLocalizationManager.documentLanguage;
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
    });
    afterEach(() => {
        umbLocalizationManager.documentLanguage = englishBefore;
    });

    describe("Scenario: one day", () => {
        it.skip("labels every 3 hours", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)] });
            expect(xTickLabels(el)).toEqual(["Thu, Nov 5", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM"]);
        });

        it("shows date and hour in the tooltip", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)] });
            expect(await hoverHeading(el, 13)).toContain("Nov 5, 2026, 1 PM");
        });
    });

    describe("Scenario: two days", () => {
        it.skip("labels every 6 hours", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", [...hoursOf4Nov, ...hoursOf5Nov])] });
            expect(xTickLabels(el)).toHaveLength(8);
        });

        it.skip("shows the date on each day's first hour", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", [...hoursOf4Nov, ...hoursOf5Nov])] });
            expect([xTickLabels(el)[0], xTickLabels(el)[4]]).toEqual(["Wed, Nov 4", "Thu, Nov 5"]);
        });
    });

    describe("Scenario: in the editor's culture", () => {
        const previousLanguage = umbLocalizationManager.documentLanguage;
        beforeEach(() => {
            umbLocalizationManager.documentLanguage = "da-DK";
        });
        afterEach(() => {
            umbLocalizationManager.documentLanguage = previousLanguage;
        });

        it("shows 2 PM as 14", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", [hoursOf5Nov[14]])] });
            expect(rowHeaders(el)[0]).toMatch(/\b14\b/);
        });
    });

    describe("Scenario: sad path, the day clocks go back", () => {
        it.skip("lists 2 AM twice", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf25Oct)] });
            expect(rowHeaders(el).filter((r) => /\b2 AM\b/.test(r))).toHaveLength(2);
        });

        it.skip("names the zone in the repeated hours' tooltips", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf25Oct)] });
            expect([await hoverHeading(el, 2), await hoverHeading(el, 3)].map((t) => /2 AM GMT\+\d/.exec(t)?.[0])).toEqual(["2 AM GMT+2", "2 AM GMT+1"]);
        });
    });
});
