// EMP-3 — The tooltip says no data. EMP-4 — The hidden table says no data.
// An empty slot is hovered by its x position on the x scale: it has no drawn point to hover.
/// <reference types="vite/client" />
import { Chart } from "@umbraco/analytics-ui/external/chart.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import { axeRun } from "../internal/test/a11y.js";
import { withTheme } from "../internal/test/page-example.js";
import { deepQuery, deepQueryAll, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import type { UauiCompare, UauiDateRange } from "../date-range/types.js";
import type { UauiSeries } from "./types.js";
import "./time-series-chart.element.js";

/** 24 to 28 Oct 2026: the 26th is slot 2. */
const range: UauiDateRange = { from: "2026-10-24", to: "2026-10-28" };
const compare: UauiCompare = { mode: "custom", from: "2026-10-17", to: "2026-10-21" };
const allBut26 = ["2026-10-24", "2026-10-25", "2026-10-27", "2026-10-28"];
const everyDay = ["2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28"];
const seriesOf = (id: string, label: string, values: Record<string, number>): UauiSeries => ({
    id,
    label,
    points: Object.entries(values).map(([date, value]) => ({ date, value })),
});
const on = (dates: string[], value: number) => Object.fromEntries(dates.map((date) => [date, value]));
const successRate = seriesOf("rate", "Success rate", on(allBut26, 96.5));
/** The compare period, 17 to 21 Oct, with 95.2 on the 19th: under the 26th. */
const previousRate = seriesOf("rate", "Success rate", { ...on(["2026-10-17", "2026-10-18", "2026-10-20", "2026-10-21"], 94), "2026-10-19": 95.2 });

type Options = { kind?: string; series: UauiSeries[]; compareSeries?: UauiSeries[]; compare?: UauiCompare };
const chart = async ({ kind = "line", series, compareSeries = [], compare }: Options) => {
    const el = await renderElement(
        html`<uaui-time-series-chart kind=${kind} .series=${series} .compareSeries=${compareSeries} .range=${range} .compare=${compare}
            style="width:800px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );
    await settle(el);
    return el;
};

const chartOf = (el: Element) => Chart.getChart(shadow(el).querySelector("canvas")!)!;
const tooltip = (el: Element) => shadow(el).querySelector("uaui-chart-tooltip") as HTMLElement;
/** Hovers a slot, by its x-axis label ("Oct 26"), at its x on the x scale, halfway up the canvas, and waits for the tooltip. */
const hoverSlot = async (el: Element, label: string) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const x = chartOf(el).scales["x"].getPixelForValue(chartOf(el).data.labels!.indexOf(label));
    // The pointer may already be where the last spec left it, which raises no move: start from outside the canvas.
    await userEvent.hover(page.elementLocator(document.body), { position: { x: 1, y: 1 } });
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
    await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
};
const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, " ").trim();
/** Each series row of the tooltip as [label, what it reads]: the row's text without its label. */
const tooltipRows = (el: Element) =>
    deepQueryAll<HTMLElement>(tooltip(el).shadowRoot!, ".tooltip-series").map((row) => {
        const label = text(row.querySelector(".tooltip-label")) ?? "";
        return [label, text(row)!.replace(label, "").trim()];
    });
const hiddenTable = (el: Element) => deepQuery<HTMLTableElement>(shadow(el), "table")!;
const bodyRows = (el: Element) => [...hiddenTable(el).tBodies[0].rows].map((row) => [...row.cells].map((cell) => cell.textContent!.trim()));

describe("Feature: the tooltip says no data", () => {
    const previousLanguage = umbLocalizationManager.documentLanguage;
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
    });
    afterEach(() => {
        umbLocalizationManager.documentLanguage = previousLanguage;
    });

    describe("Scenario: an empty period can be hovered", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [successRate] });
            await hoverSlot(el, "Oct 26");
        });

        it('shows the tooltip with the heading "Oct 26, 2026"', () => {
            expect(text(deepQuery(tooltip(el).shadowRoot!, ".tooltip-date"))).toBe("Oct 26, 2026");
        });
    });

    describe("Scenario: an empty series reads No data", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [successRate] });
            await hoverSlot(el, "Oct 26");
        });

        it('reads "No data" in the Success rate row', () => {
            // One series: its row has no label.
            expect(tooltipRows(el)).toEqual([["", "No data"]]);
        });
    });

    describe("Scenario: the chart updates under a hovered empty slot", () => {
        it("moves the tooltip to the new value's height without the pointer moving", async () => {
            const el = (await chart({ series: [successRate] })) as UauiTestElement & { series: UauiSeries[] };
            await hoverSlot(el, "Oct 26");
            const emptyTop = tooltip(el).style.top;
            el.series = [seriesOf("rate", "Success rate", { ...on(allBut26, 96.5), "2026-10-26": 42 })];
            await expect.poll(() => tooltip(el).style.top).not.toBe(emptyTop);
        });
    });

    describe("Scenario: the compare value still shows", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [successRate], compareSeries: [previousRate], compare });
            await hoverSlot(el, "Oct 26");
        });

        it("shows the compare value 95.2", () => {
            expect(text(deepQuery(tooltip(el).shadowRoot!, ".tooltip-compare .tooltip-value"))).toBe("95.2");
        });
    });

    describe("Scenario: the hover dot follows the slot", () => {
        const activeIndexes = (el: Element) => chartOf(el).getActiveElements().map((active) => active.index);
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [successRate] });
        });

        it("has no hover dot on an empty slot", async () => {
            await hoverSlot(el, "Oct 26");
            expect(activeIndexes(el)).toEqual([]);
        });

        it("has the hover dot on the slot beside an empty one", async () => {
            await hoverSlot(el, "Oct 25");
            expect(activeIndexes(el)).toEqual([1]);
        });
    });

    describe("Scenario: each series gets a row", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({
                series: [seriesOf("succeeded", "Succeeded", { ...on(allBut26, 30), "2026-10-26": 40 }), seriesOf("failed", "Failed", on(allBut26, 2))],
            });
            await hoverSlot(el, "Oct 26");
        });

        it('has a Succeeded row reading 40 and a Failed row reading "No data"', () => {
            expect(tooltipRows(el)).toEqual([
                ["Succeeded", "40"],
                ["Failed", "No data"],
            ]);
        });
    });

    describe("Sad path", () => {
        describe("Scenario: no change badge on No data", () => {
            let el: UauiTestElement;
            beforeEach(async () => {
                el = await chart({ series: [successRate], compareSeries: [previousRate], compare });
                await hoverSlot(el, "Oct 26");
            });

            it("has no change badge in the series row", () => {
                expect(deepQuery(tooltip(el).shadowRoot!, "uaui-delta-badge")).toBeNull();
            });
        });

        describe("Scenario: no total for an empty period", () => {
            let el: UauiTestElement;
            beforeEach(async () => {
                // With a compare total the bars show a total on every other day.
                el = await chart({
                    kind: "bar",
                    series: [seriesOf("succeeded", "Succeeded", on(allBut26, 30)), seriesOf("failed", "Failed", on(allBut26, 2))],
                    compareSeries: [previousRate],
                    compare,
                });
                await hoverSlot(el, "Oct 26");
            });

            it("has no total row", () => {
                expect(deepQuery(tooltip(el).shadowRoot!, ".tooltip-total")).toBeNull();
            });
        });
    });
});

describe("Feature: the hidden table says no data", () => {
    const previousLanguage = umbLocalizationManager.documentLanguage;
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
    });
    afterEach(() => {
        umbLocalizationManager.documentLanguage = previousLanguage;
    });

    describe("Scenario: an empty value cell", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart({ series: [successRate] });
        });

        it('reads "No data" in the series\' cell for 2026-10-26', () => {
            expect(bodyRows(el)[2].slice(1)).toEqual(["No data"]);
        });
    });

    describe("Scenario: an empty compare cell", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            // The compare period has no point on the 19th, under the 26th.
            el = await chart({
                series: [seriesOf("rate", "Success rate", on(everyDay, 96.5))],
                compareSeries: [seriesOf("rate", "Success rate", on(["2026-10-17", "2026-10-18", "2026-10-20", "2026-10-21"], 94))],
                compare,
            });
        });

        it('reads "No data" in the compare cell for 2026-10-26', () => {
            expect(bodyRows(el)[2].slice(1)).toEqual(["96.5", "No data"]);
        });
    });

    describe("Sad path", () => {
        describe("Scenario: accessible in both themes", () => {
            const audit = (themeCss?: string) => withTheme(themeCss, async () => axeRun(await chart({ series: [successRate], compareSeries: [previousRate], compare })));

            it("has no axe violations in the light theme", async () => {
                expect(await audit()).toHaveNoViolations();
            });

            it("has no axe violations in the dark theme", async () => {
                expect(await audit(darkCss)).toHaveNoViolations();
            });
        });
    });
});
