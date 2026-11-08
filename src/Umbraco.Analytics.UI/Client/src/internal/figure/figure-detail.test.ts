// KTD-1 (AC1, AC5, AC7, AC9–AC12) — The line under a tile's value: a pattern with the formatted number in each {0}
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { html } from "#platform/lit";
import { axeRun } from "../test/a11y.js";
import { deepQuery, renderElement, shadow } from "../test/dom.js";
import type { UauiFigureText } from "../format/figure.js";

import "./figure-detail.element.js";

const draw = (pattern?: string, figure?: UauiFigureText) =>
    renderElement(html`<uaui-figure-detail .pattern=${pattern} .figure=${figure}></uaui-figure-detail>`, "uaui-figure-detail");

/** The text a sighted reader sees: the shadow DOM's text, leaving out a figure's visually hidden exact amount. */
function seen(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    const element = node as Element;
    if (element.classList?.contains("visually-hidden")) return "";
    const parts: string[] = [];
    if (element.shadowRoot) parts.push(...[...element.shadowRoot.childNodes].map(seen));
    parts.push(...[...node.childNodes].map(seen));
    return parts.join("");
}
const reads = (el: Element) => seen(el).replace(/\s+/g, " ").trim();

describe("Feature: the line under a tile's value", () => {
    describe("Scenario: a pattern with {0} and a figure", () => {
        it("fills {0} with the figure's text", async () => {
            const el = await draw("{0} cached", { text: "114,300" });
            expect(reads(el)).toBe("114,300 cached");
        });

        it("keeps the pattern's word order", async () => {
            const el = await draw("Cached: {0}", { text: "114,300" });
            expect(reads(el)).toBe("Cached: 114,300");
        });

        it("draws the figure with uaui-figure-value", async () => {
            const el = await draw("{0} cached", { text: "114K", exact: "114,300" });
            expect(shadow(el).querySelector("uaui-figure-value")).not.toBeNull();
        });
    });

    describe("Scenario: a pattern with no {0}", () => {
        it("shows the pattern as a plain note", async () => {
            const el = await draw("Estimated");
            expect(reads(el)).toBe("Estimated");
        });
    });

    describe("Scenario: the hover title", () => {
        it("holds the full shown text of a pattern with {0}", async () => {
            const el = await draw("{0} cached", { text: "114K", exact: "114,300" });
            expect(shadow(el).querySelector(".line")?.getAttribute("title")).toBe("114K cached");
        });

        it("holds the pattern when it has no {0}", async () => {
            const el = await draw("Estimated");
            expect(shadow(el).querySelector(".line")?.getAttribute("title")).toBe("Estimated");
        });
    });

    describe("Scenario: the text style is on the element", () => {
        it("has a font size of 13px", async () => {
            const el = await draw("Estimated");
            expect(getComputedStyle(el).fontSize).toBe("13px");
        });

        it("has a font weight of 400", async () => {
            const el = await draw("Estimated");
            expect(getComputedStyle(el).fontWeight).toBe("400");
        });

        it("has the alternate text colour", async () => {
            const el = await draw("Estimated");
            const probe = document.createElement("span");
            probe.style.color = "var(--uui-color-text-alt)";
            el.parentElement!.appendChild(probe);
            const expected = getComputedStyle(probe).color;
            probe.remove();
            expect(getComputedStyle(el).color).toBe(expected);
        });
    });

    describe("Scenario: a line that is too long", () => {
        const drawLong = async () => {
            const wrapper = await renderElement(
                html`<div style="width: 200px"><uaui-figure-detail .pattern=${"{0} cached across every region, including the ones added last month"} .figure=${{ text: "114,300" }}></uaui-figure-detail></div>`,
                "div",
            );
            const detail = wrapper.querySelector("uaui-figure-detail")!;
            await detail.updateComplete;
            return detail;
        };

        it("is not wider than its parent", async () => {
            const el = await drawLong();
            expect(el.getBoundingClientRect().width).toBeLessThanOrEqual(200);
        });

        it("is cut", async () => {
            const el = await drawLong();
            const line = shadow(el).querySelector(".line")!;
            expect(line.scrollWidth).toBeGreaterThan(line.clientWidth);
        });
    });

    describe("Scenario: accessibility", () => {
        it("passes the a11y audit", async () => {
            const el = await draw("{0} cached", { text: "114K", exact: "114,300" });
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario (sad path): placeholders other than {0}", () => {
        it("fills every {0} and leaves {1} as typed", async () => {
            const el = await draw("{0} of {1} ({0})", { text: "5" });
            expect(reads(el)).toBe("5 of {1} (5)");
        });

        it("leaves %0% as typed", async () => {
            const el = await draw("%0% cached", { text: "5" });
            expect(reads(el)).toBe("%0% cached");
        });
    });

    describe("Scenario (sad path): markup in the pattern", () => {
        it("shows the markup as text", async () => {
            const el = await draw("<b>{0}</b> cached", { text: "5" });
            expect(reads(el)).toBe("<b>5</b> cached");
        });

        it("adds no elements from the markup", async () => {
            const el = await draw("<b>{0}</b> cached", { text: "5" });
            expect(deepQuery(shadow(el), "b")).toBeNull();
        });
    });

    describe("Scenario (sad path): nothing to show", () => {
        it("draws nothing for a {0} pattern with no figure", async () => {
            const el = await draw("{0} cached");
            expect(reads(el)).toBe("");
        });

        it("draws nothing for an empty pattern", async () => {
            const el = await draw("", { text: "114,300" });
            expect(reads(el)).toBe("");
        });
    });
});
