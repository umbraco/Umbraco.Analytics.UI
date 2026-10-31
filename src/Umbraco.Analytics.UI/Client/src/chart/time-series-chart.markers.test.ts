// CHT-4 — Event markers
// The dot and dashed line are canvas; each dot also has an HTML button over it, which the specs drive.
/// <reference types="vite/client" />
import { Chart } from "chart.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepText, nextEvent, renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";
import { screenshotIt } from "../internal/test/screenshot.js";
import type { UauiMarker } from "./types.js";
import "./time-series-chart.element.js";

const series = [{ id: "pv", label: "Pageviews", points: [
    { date: "2026-06-10", value: 120 }, { date: "2026-06-11", value: 280 }, { date: "2026-06-12", value: 140 },
] }];
const weekly = [{ id: "pv", label: "Pageviews", points: [
    { date: "2026-06-01", value: 120 }, { date: "2026-06-08", value: 280 }, { date: "2026-06-15", value: 140 },
] }];
const launch = { id: "m1", date: "2026-06-11", title: "Spring product launch", description: "Homepage hero went live." };
const earlier = { id: "m0", date: "2026-06-10", title: "Newsletter" };
const sameDay = { id: "m2", date: "2026-06-11", title: "Paid push" };
const outside = { id: "m9", date: "2026-07-01", title: "Summer sale" };

const markers = (el: Element) => [...shadow(el).querySelectorAll(".marker")] as HTMLElement[];
const markerTooltip = (el: Element) => shadow(el).querySelector("uaui-chart-marker-tooltip") as HTMLElement | null;
const markerTooltipText = (el: Element) => {
    const tip = markerTooltip(el);
    return tip ? deepText(tip) : undefined;
};
// The pointer stays where the last spec left it, which could be over a dot: put it in the corner before a screenshot.
const parkPointer = (el: Element) => userEvent.hover(page.elementLocator(el), { position: { x: 1, y: 1 } });
// Moves the pointer onto the canvas at the nth date.
const hoverDate = async (el: Element, index: number) => {
    const canvas = shadow(el).querySelector("canvas")!;
    const x = Chart.getChart(canvas)!.getDatasetMeta(0).data[index].x;
    await userEvent.hover(page.elementLocator(canvas), { position: { x, y: canvas.getBoundingClientRect().height / 2 } });
};
const chart = (list: UauiMarker[], kind = "line", data = series, groupBy = "day") =>
    renderElement(
        html`<uaui-time-series-chart kind=${kind} group-by=${groupBy} .series=${data} .markers=${list} style="width:400px"></uaui-time-series-chart>`,
        "uaui-time-series-chart",
    );

describe("Feature: event markers", () => {
    describe("Scenario: a marker within the range", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart([launch]);
            await parkPointer(el);
        });

        it("draws a dot on the x-axis for it", () => {
            expect(markers(el)).toHaveLength(1);
        });

        it("puts the dot on the marker's date", () => {
            const canvas = shadow(el).querySelector("canvas")!;
            const x = Chart.getChart(canvas)!.getDatasetMeta(0).data[1].x;
            const box = markers(el)[0].getBoundingClientRect();
            expect(box.left + box.width / 2 - canvas.getBoundingClientRect().left).toBeCloseTo(x, 0);
        });

        it("names the marker for screen readers", () => {
            expect(markers(el)[0].getAttribute("aria-label")).toMatch(/^Marker: Spring product launch/);
        });

        screenshotIt("draws a dashed line up from the dot", async () => {
            await expect.element(page.elementLocator(el)).toMatchScreenshot("chart-marker-line-dot");
        });
    });

    describe("Scenario: hovering a marker", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart([launch]);
            await userEvent.hover(page.elementLocator(markers(el)[0]));
            await expect.poll(() => markerTooltip(el)?.style.visibility).toBe("visible");
        });

        it("shows the date, title and description", () => {
            expect(markerTooltipText(el)).toMatch(/11[\s\S]*Spring product launch[\s\S]*Homepage hero/);
        });

        it("hides the tooltip again when the pointer leaves", async () => {
            await userEvent.unhover(page.elementLocator(markers(el)[0]));
            await expect.poll(() => markerTooltip(el)).toBeNull();
        });
    });

    describe("Scenario: focusing a marker", () => {
        it("shows the same tooltip as hovering", async () => {
            const el = await chart([launch]);
            markers(el)[0].focus();
            await expect.poll(() => markerTooltipText(el)).toMatch(/Spring product launch/);
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

        it("raises marker-click with its id", () => {
            expect(detail).toEqual({ id: "m1" });
        });
    });

    describe("Scenario: the marker-click event's options", () => {
        it("bubbles but is not composed, like every other event", async () => {
            const el = await chart([launch]);
            const event = nextEvent(el, "marker-click");
            markers(el)[0].click();
            const { bubbles, composed } = await event;
            expect([bubbles, composed]).toEqual([true, false]);
        });
    });

    describe("Scenario: pressing Enter on a focused marker", () => {
        it("raises marker-click", async () => {
            const el = await chart([launch]);
            const event = nextEvent(el, "marker-click");
            markers(el)[0].focus();
            await userEvent.keyboard("{Enter}");
            expect((await event).detail).toEqual({ id: "m1" });
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

        it("moves through the markers in date order", () => {
            expect(focusedTitles.map((t) => t.includes("Newsletter") ? 0 : 1)).toEqual([0, 1]);
        });
    });

    describe("Scenario (sad path): a marker outside the range", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart([outside]);
        });

        it("draws no dot", () => {
            expect(markers(el)).toHaveLength(0);
        });
    });

    describe("Scenario: two markers on the same day", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart([launch, sameDay]);
        });

        it("shares one dot", () => {
            expect(markers(el)).toHaveLength(1);
        });

        it("lists both in the tooltip", async () => {
            await userEvent.hover(page.elementLocator(markers(el)[0]));
            await expect.poll(() => markerTooltipText(el)).toMatch(/Spring product launch[\s\S]*Paid push/);
        });

        it("names the dot after both markers", () => {
            expect(markers(el)[0].getAttribute("aria-label")).toMatch(/Spring product launch.*Paid push/);
        });
    });

    describe("Scenario: grouped by week", () => {
        it("puts a marker on the dot of the week it falls in", async () => {
            const el = await chart([{ id: "w", date: "2026-06-11", title: "Mid-week" }], "line", weekly, "week");
            const canvas = shadow(el).querySelector("canvas")!;
            const x = Chart.getChart(canvas)!.getDatasetMeta(0).data[1].x;
            const box = markers(el)[0].getBoundingClientRect();
            expect(box.left + box.width / 2 - canvas.getBoundingClientRect().left).toBeCloseTo(x, 0);
        });

        it("shares one dot between two markers in the same week", async () => {
            const el = await chart([launch, { id: "w", date: "2026-06-09", title: "Mid-week" }], "line", weekly, "week");
            expect(markers(el)).toHaveLength(1);
        });

        it("draws nothing for a date after the last week ends", async () => {
            const el = await chart([{ id: "w", date: "2026-06-22", title: "Next week" }], "line", weekly, "week");
            expect(markers(el)).toHaveLength(0);
        });
    });

    describe("Scenario: grouped by week starting on Sunday", () => {
        const sundayWeeks = [{ id: "pv", label: "Pageviews", points: [
            { date: "2026-05-31", value: 120 }, { date: "2026-06-07", value: 280 }, { date: "2026-06-14", value: 140 },
        ] }];
        const sundayChart = (list: UauiMarker[]) =>
            renderElement(
                html`<uaui-time-series-chart group-by="week" week-start="7" .series=${sundayWeeks} .markers=${list} style="width:400px"></uaui-time-series-chart>`,
                "uaui-time-series-chart",
            );

        it("puts a Saturday marker on the dot of the Sunday week it ends", async () => {
            const el = await sundayChart([{ id: "w", date: "2026-06-13", title: "Saturday" }]);
            const canvas = shadow(el).querySelector("canvas")!;
            const x = Chart.getChart(canvas)!.getDatasetMeta(0).data[1].x;
            const box = markers(el)[0].getBoundingClientRect();
            expect(box.left + box.width / 2 - canvas.getBoundingClientRect().left).toBeCloseTo(x, 0);
        });

        it("puts the Sunday that starts the next week on that week's dot", async () => {
            const el = await sundayChart([{ id: "w", date: "2026-06-14", title: "Sunday" }]);
            const canvas = shadow(el).querySelector("canvas")!;
            const x = Chart.getChart(canvas)!.getDatasetMeta(0).data[2].x;
            const box = markers(el)[0].getBoundingClientRect();
            expect(box.left + box.width / 2 - canvas.getBoundingClientRect().left).toBeCloseTo(x, 0);
        });
    });

    describe("Scenario: a stacked bar chart", () => {
        it("draws a dot for the marker", async () => {
            const el = await chart([launch], "stacked-bar", [series[0], { ...series[0], id: "b", label: "Sessions" }]);
            expect(markers(el)).toHaveLength(1);
        });
    });

    describe("Scenario: markers change", () => {
        it("drops the dot of a removed marker", async () => {
            const el = await chart([launch, earlier]);
            el.markers = [launch];
            await el.updateComplete;
            await expect.poll(() => markers(el)).toHaveLength(1);
        });
    });

    describe("Scenario: markers change while one is hovered", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await chart([launch]);
            await userEvent.hover(page.elementLocator(markers(el)[0]));
            await expect.poll(() => markerTooltip(el)).not.toBeNull();
            el.markers = [];
            await el.updateComplete;
            await hoverDate(el, 0);
        });

        it("shows the date tooltip again", async () => {
            await expect.poll(() => shadow(el).querySelector<HTMLElement>("uaui-chart-tooltip")?.style.visibility).toBe("visible");
        });

        it("doesn't open a tooltip for a new marker on the same date", async () => {
            el.markers = [launch];
            await el.updateComplete;
            await expect.poll(() => markers(el)).toHaveLength(1);
            expect(markerTooltip(el)).toBeNull();
        });
    });

    describe("Scenario: pressing Escape", () => {
        it("hides a marker tooltip opened by hover", async () => {
            const el = await chart([launch]);
            await userEvent.hover(page.elementLocator(markers(el)[0]));
            await expect.poll(() => markerTooltip(el)).not.toBeNull();
            await userEvent.keyboard("{Escape}");
            await expect.poll(() => markerTooltip(el)).toBeNull();
        });

        it("hides a marker tooltip opened by focus", async () => {
            const el = await chart([launch]);
            await parkPointer(el);
            markers(el)[0].focus();
            await expect.poll(() => markerTooltip(el)).not.toBeNull();
            await userEvent.keyboard("{Escape}");
            await expect.poll(() => markerTooltip(el)).toBeNull();
        });

        it("hides the date tooltip", async () => {
            const el = await chart([]);
            await hoverDate(el, 1);
            await expect.poll(() => shadow(el).querySelector<HTMLElement>("uaui-chart-tooltip")?.style.visibility).toBe("visible");
            await userEvent.keyboard("{Escape}");
            await expect.poll(() => shadow(el).querySelector("uaui-chart-tooltip")).toBeNull();
        });
    });

    describe("Scenario: markers on a chart that also compares", () => {
        it("still draws the dot", async () => {
            const el = await renderElement(
                html`<uaui-time-series-chart .series=${series} .compareSeries=${[{ ...series[0], points: series[0].points.map((p) => ({ ...p, date: p.date.replace("-06-", "-05-") })) }]}
                    .markers=${[launch]} style="width:400px"></uaui-time-series-chart>`,
                "uaui-time-series-chart",
            );
            expect(markers(el)).toHaveLength(1);
        });
    });

    describe("Scenario: the dark theme", () => {
        let theme: HTMLStyleElement;
        let host: HTMLElement;
        beforeEach(async () => {
            theme = document.createElement("style");
            theme.textContent = darkCss;
            document.head.appendChild(theme);
            host = render(
                html`<div style="background: var(--uui-color-surface); width: 400px">
                    <uaui-time-series-chart .series=${series} .markers=${[launch]}></uaui-time-series-chart>
                </div>`,
            ).container.querySelector("div")!;
            await host.querySelector("uaui-time-series-chart")!.updateComplete;
            await parkPointer(host);
        });
        afterEach(() => theme.remove());

        screenshotIt("draws the dot and line in a colour that reads on the dark surface", async () => {
            await expect.element(page.elementLocator(host)).toMatchScreenshot("chart-marker-dark");
        });
    });

    describe("Scenario: accessibility with markers", () => {
        async function audit(css?: string) {
            const theme = css ? document.createElement("style") : undefined;
            if (theme) {
                theme.textContent = css!;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); width: 400px">
                        <uaui-time-series-chart .series=${series} .markers=${[launch, sameDay, earlier]}></uaui-time-series-chart>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uaui-time-series-chart")!.updateComplete;
                return await axeRun(host);
            } finally {
                theme?.remove();
            }
        }

        it("passes in the light theme", async () => {
            expect(await audit()).toHaveNoViolations();
        });

        it("passes in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });

        it("passes in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });
    });
});
