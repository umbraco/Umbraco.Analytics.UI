// The markers overlay on its own: the buttons over the dots, their tooltip, and the events it raises.
import { beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../../internal/test/a11y.js";
import { deepText, nextEvent, recordEvents, renderElement, shadow, type UauiTestElement } from "../../internal/test/dom.js";
import type { UauiMarker } from "../types.js";
import "./chart-markers.element.js";
import { bucketMarkers } from "./marker-buckets.js";

const dates = ["2026-06-10", "2026-06-11", "2026-06-12"];
const dateFormat = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });
const placements = [
    { index: 0, x: 40, y: 150 },
    { index: 1, x: 160, y: 150 },
    { index: 2, x: 280, y: 150 },
];
const launch = { id: "m1", date: "2026-06-11T09:30:00", title: "Spring product launch", description: "Homepage hero went live." };
const earlier = { id: "m0", date: "2026-06-10", title: "Newsletter" };
const sameDay = { id: "m2", date: "2026-06-11", title: "Paid push" };

const plot = (list: UauiMarker[], placed = placements) => html`<div style="position: relative; width: 320px; height: 170px; background: var(--uui-color-surface)">
    <uaui-chart-markers .buckets=${bucketMarkers(list, dates, "day")} .placements=${placed} .dateFormat=${dateFormat}></uaui-chart-markers>
</div>`;
const markers = (el: Element) => [...shadow(el).querySelectorAll<HTMLElement>(".marker")];
const tooltip = (el: Element) => shadow(el).querySelector<HTMLElement>("uaui-chart-marker-tooltip");
const mount = (list: UauiMarker[]) => renderElement(plot(list), "uaui-chart-markers");

describe("Feature: marker buttons over the plot", () => {
    describe("Scenario: three markers on two dates", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await mount([launch, earlier, sameDay]);
        });

        it("renders one button per dot", () => {
            expect(markers(el)).toHaveLength(2);
        });

        it("puts each button on its dot", () => {
            const style = markers(el).map((b) => b.getAttribute("style"));
            expect(style).toEqual(["left:40px; top:150px", "left:160px; top:150px"]);
        });

        it("names a dot after its markers and their dates", () => {
            expect(markers(el)[1].getAttribute("aria-label")).toBe("Marker: Spring product launch (Jun 11, 2026); Paid push (Jun 11, 2026)");
        });

        it("is a plain button, so Tab reaches it", () => {
            expect(markers(el)[0].getAttribute("type")).toBe("button");
        });
    });

    describe("Scenario (sad path): a dot the renderer has not placed", () => {
        it("renders no button for it", async () => {
            const el = await renderElement(plot([launch], []), "uaui-chart-markers");
            expect(markers(el)).toHaveLength(0);
        });
    });

    describe("Scenario: hovering a button", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await mount([launch]);
            await userEvent.hover(page.elementLocator(markers(el)[0]));
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
        });

        it("shows the date, title and description", () => {
            expect(deepText(tooltip(el)!)).toMatch(/Jun 11, 2026[\s\S]*Spring product launch[\s\S]*Homepage hero went live\./);
        });

        it("describes the button by the tooltip", () => {
            expect(markers(el)[0].getAttribute("aria-describedby")).toBe("marker-tooltip");
        });

        it("hides the tooltip when the pointer leaves", async () => {
            await userEvent.unhover(page.elementLocator(markers(el)[0]));
            await expect.poll(() => tooltip(el)).toBeNull();
        });
    });

    describe("Scenario: focusing a button", () => {
        it("shows the tooltip", async () => {
            const el = await mount([launch]);
            markers(el)[0].focus();
            await expect.poll(() => tooltip(el)).not.toBeNull();
        });

        it("hides the tooltip when focus leaves", async () => {
            const el = await mount([launch]);
            markers(el)[0].focus();
            await expect.poll(() => tooltip(el)).not.toBeNull();
            markers(el)[0].blur();
            await expect.poll(() => tooltip(el)).toBeNull();
        });
    });

    describe("Scenario: pressing Escape on a shown tooltip", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await mount([launch]);
            markers(el)[0].focus();
            await expect.poll(() => tooltip(el)).not.toBeNull();
            await userEvent.keyboard("{Escape}");
        });

        it("hides the tooltip", async () => {
            await expect.poll(() => tooltip(el)).toBeNull();
        });

        it("keeps focus on the button", () => {
            expect(shadow(el).activeElement).toBe(markers(el)[0]);
        });
    });

    describe("Scenario: the tooltip is not a hover target", () => {
        it("lets the pointer through, so moving off the button closes it", async () => {
            const el = await mount([launch]);
            markers(el)[0].focus();
            await expect.poll(() => tooltip(el)).not.toBeNull();
            expect(getComputedStyle(tooltip(el)!).pointerEvents).toBe("none");
        });
    });

    describe("Scenario: a crowded dot", () => {
        it("lists four markers and counts the rest", async () => {
            const crowd = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id, date: "2026-06-11", title: `Event ${id}` }));
            const el = await mount(crowd);
            markers(el)[0].focus();
            await expect.poll(() => tooltip(el)).not.toBeNull();
            await expect.poll(() => deepText(tooltip(el)!)).toMatch(/Event d[\s\S]*2 more/);
        });
    });

    describe("Scenario: clicking a button", () => {
        it("raises marker-click with the earliest marker's id", async () => {
            const el = await mount([launch, sameDay]);
            const event = nextEvent(el, "marker-click");
            markers(el)[0].click();
            expect((await event).detail).toEqual({ id: "m1" });
        });

        it("does not bubble, so only the chart's own event reaches a product", async () => {
            const el = await mount([launch]);
            const event = nextEvent(el, "marker-click");
            markers(el)[0].click();
            const { bubbles, composed } = await event;
            expect([bubbles, composed]).toEqual([false, false]);
        });
    });

    describe("Scenario: the active dot changes", () => {
        let el: UauiTestElement;
        let changes: Event[];
        beforeEach(async () => {
            el = await mount([launch]);
            changes = recordEvents(el, "active-change");
        });

        const indexes = () => changes.map((e) => (e as CustomEvent<{ index?: number }>).detail.index);

        it("raises active-change with the dot's index on hover", async () => {
            await userEvent.hover(page.elementLocator(markers(el)[0]));
            await expect.poll(indexes).toEqual([1]);
        });

        it("raises active-change with the dot's index on focus", async () => {
            markers(el)[0].focus();
            await expect.poll(indexes).toEqual([1]);
        });

        it("raises active-change with no index when the pointer leaves", async () => {
            await userEvent.hover(page.elementLocator(markers(el)[0]));
            await userEvent.unhover(page.elementLocator(markers(el)[0]));
            await expect.poll(indexes).toEqual([1, undefined]);
        });

        it("raises active-change with no index on Escape", async () => {
            markers(el)[0].focus();
            await userEvent.keyboard("{Escape}");
            await expect.poll(indexes).toEqual([1, undefined]);
        });
    });
});

describe("Feature: accessibility of the markers overlay", () => {
    async function audit(css?: string) {
        const theme = css ? document.createElement("style") : undefined;
        if (theme) {
            theme.textContent = css!;
            document.head.appendChild(theme);
        }
        try {
            const host = render(plot([launch, earlier, sameDay])).container.querySelector("div")!;
            await host.querySelector("uaui-chart-markers")!.updateComplete;
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
