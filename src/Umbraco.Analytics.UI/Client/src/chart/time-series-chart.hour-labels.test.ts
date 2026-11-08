// HRS-6 — Hour labels.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { deepText, settle, shadow } from "../internal/test/dom.js";
import { screenshotIt } from "../internal/test/screenshot.js";
import { chartOf, hourlyChart, hoursOf25Oct, hoursOf29Mar, hoursOf4Nov, hoursOf5Nov, rowHeaders, seriesAt, xTickLabels } from "./internal/hourly-fixtures.js";

const hoverHeading = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const x = chartOf(el).getDatasetMeta(0).data[index].x;
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
    await expect.poll(() => (shadow(el).querySelector("uaui-chart-tooltip") as HTMLElement).style.visibility).toBe("visible");
    return deepText(shadow(el).querySelector("uaui-chart-tooltip")!);
};

describe("Feature: hour labels", () => {
    const englishBefore = document.documentElement.lang;
    beforeEach(() => {
        document.documentElement.lang = "en-US";
    });
    afterEach(() => {
        document.documentElement.lang = englishBefore;
    });

    describe("Scenario: one day", () => {
        it("labels every 3 hours", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)] });
            expect(xTickLabels(el)).toEqual(["Thu, Nov 5", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM"]);
        });

        it("shows date and hour in the tooltip", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov)] });
            expect(await hoverHeading(el, 13)).toContain("Nov 5, 2026, 1 PM");
        });
    });

    describe("Scenario: two days", () => {
        it("labels every 6 hours", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", [...hoursOf4Nov, ...hoursOf5Nov])] });
            expect(xTickLabels(el)).toHaveLength(8);
        });

        it("shows the date on each day's first hour", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", [...hoursOf4Nov, ...hoursOf5Nov])] });
            expect([xTickLabels(el)[0], xTickLabels(el)[4]]).toEqual(["Wed, Nov 4", "Thu, Nov 5"]);
        });
    });

    describe("Scenario: the axis as drawn", () => {
        // The test page is about 400px wide, as the other chart screenshots are.
        const narrow = async (el: HTMLElement) => {
            el.style.width = "400px";
            await settle(el);
            await expect.poll(() => xTickLabels(el).length).toBeLessThan(8);
            return el;
        };

        screenshotIt("draws one day at 400px", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf5Nov, (i) => 20 + ((i * 7) % 13))] });
            await expect.element(page.elementLocator(await narrow(el))).toMatchScreenshot("chart-hour-labels-one-day");
        });

        screenshotIt("draws two days at 400px", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", [...hoursOf4Nov, ...hoursOf5Nov], (i) => 20 + ((i * 7) % 13))] });
            await expect.element(page.elementLocator(await narrow(el))).toMatchScreenshot("chart-hour-labels-two-days");
        });
    });

    describe("Scenario: a narrow chart", () => {
        const at400 = async (dates: string[]) => {
            const el = await hourlyChart({ series: [seriesAt("requests", dates)] });
            el.style.width = "400px";
            await settle(el);
            return el;
        };

        it("widens one day to a label every 6 hours", async () => {
            const el = await at400(hoursOf5Nov);
            await expect.poll(() => xTickLabels(el)).toEqual(["Thu, Nov 5", "6 AM", "12 PM", "6 PM"]);
        });

        it("widens two days to a label every 12 hours", async () => {
            const el = await at400([...hoursOf4Nov, ...hoursOf5Nov]);
            await expect.poll(() => xTickLabels(el)).toEqual(["Wed, Nov 4", "12 PM", "Thu, Nov 5", "12 PM"]);
        });
    });

    describe("Scenario: the day clocks go back", () => {
        it("labels every 3 hours on the 25-hour day", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf25Oct)] });
            expect(xTickLabels(el)).toEqual(["Sun, Oct 25", "3 AM", "6 AM", "9 AM", "12 PM", "3 PM", "6 PM", "9 PM"]);
        });

        it("names no zone in the tooltip of the hour before the repeated pair", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf25Oct)] });
            expect(await hoverHeading(el, 1)).not.toMatch(/GMT/);
        });

        it("names no zone in the tooltip of the hour after the repeated pair", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf25Oct)] });
            expect(await hoverHeading(el, 4)).not.toMatch(/GMT/);
        });
    });

    describe("Scenario: the day clocks go forward", () => {
        it("labels 3 AM", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf29Mar)] });
            expect(xTickLabels(el)).toContain("3 AM");
        });

        it("has no 2 AM label", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf29Mar)] });
            expect(xTickLabels(el)).not.toContain("2 AM");
        });
    });

    describe("Scenario: in the editor's culture", () => {
        const previousLanguage = document.documentElement.lang;
        beforeEach(() => {
            document.documentElement.lang = "da-DK";
        });
        afterEach(() => {
            document.documentElement.lang = previousLanguage;
        });

        it("shows 2 PM as 14", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", [hoursOf5Nov[14]])] });
            expect(rowHeaders(el)[0]).toMatch(/\b14\b/);
        });
    });

    describe("Scenario: sad path, the day clocks go back", () => {
        it("lists 2 AM twice", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf25Oct)] });
            expect(rowHeaders(el).filter((r) => /\b2 AM\b/.test(r))).toHaveLength(2);
        });

        it("names the zone in the repeated hours' tooltips", async () => {
            const el = await hourlyChart({ series: [seriesAt("requests", hoursOf25Oct)] });
            expect([await hoverHeading(el, 2), await hoverHeading(el, 3)].map((t) => /2 AM GMT\+\d/.exec(t)?.[0])).toEqual(["2 AM GMT+2", "2 AM GMT+1"]);
        });
    });
});
