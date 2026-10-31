/// <reference types="vite/client" />
// TBL-4 — the search box itself: how it is built and what it raises. The table side is in data-table.search.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { recordEvents, renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./search-field.element.js";
import type { UauiSearchFieldElement } from "./search-field.element.js";

const input = (el: Element) => shadow(el).querySelector("uui-input") as HTMLElement & { value: string };
/** Sets the text the way typing does: the value changes, then `input` is raised from the uui-input. */
const type = (el: Element, text: string) => {
    const field = input(el);
    field.value = text;
    field.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
};

describe("Feature: search field", () => {
    describe("Scenario: how it is built", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-search-field></uaui-search-field>`, "uaui-search-field");
        });

        it("puts the search icon in the input's prepend slot", () => {
            expect(input(el).querySelector("[slot='prepend'] uui-icon")?.getAttribute("name")).toBe("icon-search");
        });

        it("labels the input with the translated word Search", () => {
            expect(input(el).getAttribute("label")).toBe("Search");
        });

        it("has no clear button while the box is empty", () => {
            expect(input(el).querySelector("[slot='append']")).toBe(null);
        });
    });

    describe("Scenario: typing quickly", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderElement(html`<uaui-search-field></uaui-search-field>`, "uaui-search-field");
            events = recordEvents(el, "search");
            // Only the timers are faked, after render, so the debounce is driven by the test and not by the machine's speed.
            vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
            type(el, "con");
            vi.advanceTimersByTime(100);
            type(el, "contact");
            vi.advanceTimersByTime(450);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("raises search once, with the whole text", () => {
            expect(events.map((e) => (e as CustomEvent).detail)).toEqual([{ query: "contact" }]);
        });
    });

    describe("Scenario: clearing the box", () => {
        let el: UauiTestElement;
        let events: Event[];
        beforeEach(async () => {
            el = await renderElement(html`<uaui-search-field value="contact"></uaui-search-field>`, "uaui-search-field");
            events = recordEvents(el, "search");
            (input(el).querySelector("[slot='append']") as HTMLElement).click();
            await el.updateComplete;
        });

        it("raises search at once with an empty query", () => {
            expect(events.map((e) => (e as CustomEvent).detail)).toEqual([{ query: "" }]);
        });

        it("empties the input", () => {
            expect(input(el).value).toBe("");
        });
    });

    describe("Scenario: accessibility", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); padding: 8px">
                        <uaui-search-field value="contact"></uaui-search-field>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector<UauiSearchFieldElement>("uaui-search-field")!.updateComplete;
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        it("has no axe violations in the light theme", async () => {
            expect(await audit()).toHaveNoViolations();
        });

        it("has no axe violations in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });

        it("has no axe violations in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });
    });
});
