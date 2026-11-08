// SAC-12 AC1–AC2 — standalone core package (docs/plans/standalone-core).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import lightCss from "@umbraco-ui/uui/themes/light.css?inline";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import lightUrl from "@umbraco-ui/uui/themes/light.css?url";
import darkUrl from "@umbraco-ui/uui/themes/dark.css?url";
import { html } from "#platform/lit";
import { Chart } from "#platform/chart";
import { renderElement, settle, shadow, type UauiTestElement } from "../../internal/test/dom.js";
import "../../chart/time-series-chart.element.js";

const dates = ["2026-06-09", "2026-06-10", "2026-06-11"];
const series = [{ id: "pv", label: "Pageviews", points: dates.map((date, i) => ({ date, value: [60, 90, 120][i] })) }];

describe("Feature: Light and dark in the core", () => {
    let el: UauiTestElement;
    let themeNode: HTMLElement | undefined;
    const lineColour = () => Chart.getChart(shadow(el).querySelector("canvas")!)!.data.datasets[0].borderColor;
    /** What the theme's `--uaui-color-series-1` resolves to inside the chart, read independently of the chart's own code. */
    const themeSeries1 = () => {
        const probe = document.createElement("span");
        probe.style.color = "var(--uaui-color-series-1)";
        shadow(el).append(probe);
        const colour = getComputedStyle(probe).color;
        probe.remove();
        return colour;
    };

    /** Both colours, so a failure shows them; `theme` is only the dark one once it differs from `light`. */
    const chartAndTheme = () => ({ chart: lineColour(), theme: themeSeries1() });
    const isDark = (light: unknown) => (c: { chart: unknown; theme: unknown }) => c.theme !== light && c.chart === c.theme;

    beforeEach(async () => {
        el = await renderElement(
            html`<uaui-time-series-chart .series=${series} style="width:400px"></uaui-time-series-chart>`,
            "uaui-time-series-chart",
        );
        await settle(el);
    });
    afterEach(() => themeNode?.remove());

    describe("Scenario: Colours come from the UUI theme on the page", () => {
        it("its line colour matches the theme's custom property", () => {
            expect(lineColour()).toBe(themeSeries1());
        });
    });

    describe("Scenario: Switching theme redraws the chart", () => {
        it("the chart's colours change to the dark theme's when a <style> theme is swapped", async () => {
            const style = document.createElement("style");
            style.textContent = lightCss;
            document.head.appendChild(style);
            themeNode = style;
            await settle(el);
            const light = themeSeries1();
            style.textContent = darkCss;
            await expect.poll(chartAndTheme).toSatisfy(isDark(light));
        });

        it("the chart's colours change to the dark theme's when a <link> theme is swapped", async () => {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = lightUrl;
            themeNode = link;
            await new Promise<void>((resolve) => {
                link.addEventListener("load", () => resolve(), { once: true });
                document.head.appendChild(link);
            });
            await settle(el);
            const light = themeSeries1();
            const dark = document.createElement("link");
            dark.rel = "stylesheet";
            dark.href = darkUrl;
            themeNode = dark;
            await new Promise((r) => setTimeout(r, 100)); // let the light sheet's redraw finish
            const loaded = new Promise<void>((resolve) => dark.addEventListener("load", () => resolve(), { once: true }));
            // Fake timers, so the mutation's redraw (before the dark sheet loads) can't stand in for the
            // `load` listener's: only that listener schedules the second redraw.
            vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
            try {
                link.replaceWith(dark);
                await Promise.resolve(); // the MutationObserver callback runs first and schedules its timer
                vi.advanceTimersByTime(30); // the mutation's redraw, before the sheet has loaded
                await loaded;
                vi.advanceTimersByTime(30); // only the load listener scheduled this one
            } finally {
                vi.useRealTimers();
            }
            await expect.poll(chartAndTheme).toSatisfy(isDark(light));
        });
    });
});
