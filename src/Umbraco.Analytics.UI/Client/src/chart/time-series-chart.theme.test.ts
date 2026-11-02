// T56 — The chart follows every colour it draws when a stylesheet changes, not only those it shares with products'
// charts (`uauiWatchTheme`): a theme or override that changes only the gap shading or the markers redraws it too.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { Chart } from "@umbraco/analytics-ui/external/chart.js";
import { renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./time-series-chart.element.js";

const dates = ["2026-06-09", "2026-06-10", "2026-06-11"];
const current = { id: "pv", label: "Pageviews", points: dates.map((date, i) => ({ date, value: [60, 90, 120][i] })) };
const previous = { id: "pv", label: "Pageviews", points: dates.map((date, i) => ({ date, value: [80, 70, 100][i] })) };
const markers = [{ id: "m1", date: "2026-06-10", title: "Launch" }];

describe("Feature: the chart redraws for a change of any of its colours", () => {
    let el: UauiTestElement;
    let override: HTMLStyleElement;
    const canvas = () => shadow(el).querySelector("canvas")!;
    beforeEach(async () => {
        el = await renderElement(
            html`<uaui-time-series-chart .series=${[current]} .compareSeries=${[previous]} .markers=${markers}
                style="width:400px"></uaui-time-series-chart>`,
            "uaui-time-series-chart",
        );
        await settle(el);
        override = document.createElement("style");
    });
    afterEach(() => override.remove());

    /** Counts the chart's draws from now on. */
    const countDraws = () => {
        const chart = Chart.getChart(canvas())!;
        const counter = { draws: 0 };
        chart.config.plugins!.push({ id: "testDrawCount", afterDraw: () => void counter.draws++ });
        return counter;
    };

    it("redraws when only the gap colour changes", async () => {
        const before = canvas().toDataURL();
        override.textContent = ":root { --uaui-gap-positive: rgb(255, 0, 0); --uaui-gap-negative: rgb(0, 0, 255); }";
        document.head.appendChild(override);
        await expect.poll(() => canvas().toDataURL()).not.toBe(before);
    });

    it("redraws when only the marker colour changes", async () => {
        const before = canvas().toDataURL();
        override.textContent = ":root { --uaui-marker: rgb(0, 160, 0); }";
        document.head.appendChild(override);
        await expect.poll(() => canvas().toDataURL()).not.toBe(before);
    });

    it("draws once per change", async () => {
        const counter = countDraws();
        override.textContent = ":root { --uaui-marker: rgb(0, 160, 0); }";
        document.head.appendChild(override);
        await expect.poll(() => counter.draws).toBeGreaterThan(0);
        await new Promise((resolve) => setTimeout(resolve, 150));
        expect(counter.draws).toBe(1);
    });
});
