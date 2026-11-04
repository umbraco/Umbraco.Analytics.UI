// T69 — The number text of a tile or stat: compact for the eye, exact for screen readers and hover
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { axeRun } from "../test/a11y.js";
import { renderElement, shadow } from "../test/dom.js";
import "./figure-value.element.js";

const draw = (figure?: { text: string; exact?: string }) => renderElement(html`<uaui-figure-value .figure=${figure}></uaui-figure-value>`, "uaui-figure-value");

describe("Feature: the number text of a tile or stat", () => {
    describe("Scenario: a figure with no exact amount", () => {
        it("shows the text as it is, with no title and no hidden text", async () => {
            const el = await draw({ text: "€999,999.00" });
            expect(shadow(el).textContent?.trim()).toBe("€999,999.00");
            expect(shadow(el).querySelector("[title], .visually-hidden, [aria-hidden]")).toBeNull();
        });

        it("draws nothing without a figure", async () => {
            const el = await draw(undefined);
            expect(shadow(el).textContent?.trim()).toBe("");
        });
    });

    describe("Scenario: a compact figure", () => {
        it("shows the compact text, hidden from assistive tech", async () => {
            const el = await draw({ text: "€1.23M", exact: "€1,234,567.00" });
            expect(shadow(el).querySelector("[aria-hidden=true]")?.textContent).toBe("€1.23M");
        });

        it("gives assistive tech the exact amount once: the title sits on the hidden compact text", async () => {
            const el = await draw({ text: "€1.23M", exact: "€1,234,567.00" });
            const titled = [...shadow(el).querySelectorAll("[title]")];
            expect(titled).toHaveLength(1);
            expect(titled[0]?.getAttribute("aria-hidden")).toBe("true");
            expect(titled[0]?.getAttribute("title")).toBe("€1,234,567.00");
            expect(shadow(el).querySelector(".visually-hidden")?.textContent).toBe("€1,234,567.00");
            expect(el.hasAttribute("title")).toBe(false);
        });

        it("keeps the hidden exact amount out of a selection", async () => {
            const el = await draw({ text: "€1.23M", exact: "€1,234,567.00" });
            expect(getComputedStyle(shadow(el).querySelector(".visually-hidden")!).userSelect).toBe("none");
        });

        it("passes the a11y audit", async () => {
            const el = await draw({ text: "€1.23M", exact: "€1,234,567.00" });
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });
});
