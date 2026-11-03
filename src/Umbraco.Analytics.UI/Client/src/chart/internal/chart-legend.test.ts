// The legend's entries are toggle buttons: aria-pressed, the keyboard, the hidden look, and the events they raise.
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../../internal/test/a11y.js";
import { recordEvents, renderElement, shadow, type UauiTestElement } from "../../internal/test/dom.js";
import "./chart-legend.element.js";
import type { UauiChartLegendEntry } from "./chart-legend.element.js";

const entries: UauiChartLegendEntry[] = [
    { id: "pageviews", label: "Pageviews", color: 1 },
    { id: "sessions", label: "Sessions", color: 2, selected: false },
];
const legend = (items = entries, extra = "") =>
    renderElement(html`<uaui-chart-legend .entries=${items} .compareLabel=${extra || undefined}></uaui-chart-legend>`, "uaui-chart-legend");
const entryButtons = (el: Element) => [...shadow(el).querySelectorAll<HTMLButtonElement>("button.legend-entry")];

describe("Feature: legend entries toggle their series", () => {
    describe("Scenario: the entries", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await legend();
        });

        it("makes each series a button", () => {
            expect(entryButtons(el).map((b) => b.textContent!.trim())).toEqual(["Pageviews", "Sessions"]);
        });

        it("is pressed while the series is drawn, and not once it is hidden", () => {
            expect(entryButtons(el).map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false"]);
        });

        it("strikes a hidden entry through, as well as hollowing its swatch, so colour isn't the only signal", () => {
            const [shown, hidden] = entryButtons(el);
            expect(getComputedStyle(shown).textDecorationLine).toBe("none");
            expect(getComputedStyle(hidden).textDecorationLine).toBe("line-through");
            expect(getComputedStyle(hidden.querySelector(".legend-line")!).borderTopStyle).toBe("dotted");
        });

        it("leaves the layout as it was: the entry's padding is cancelled by its margin", () => {
            const style = getComputedStyle(entryButtons(el)[0]);
            expect(parseFloat(style.paddingLeft)).toBe(-parseFloat(style.marginLeft));
            expect(parseFloat(style.paddingTop)).toBe(-parseFloat(style.marginTop));
        });
    });

    describe("Scenario: pressing an entry", () => {
        it("raises deselected with the series id for a drawn series", async () => {
            const el = await legend();
            const events = recordEvents(el, "deselected");
            entryButtons(el)[0].click();
            expect(events).toHaveLength(1);
            expect((events[0] as CustomEvent).detail).toEqual({ id: "pageviews" });
        });

        it("raises selected for a hidden series", async () => {
            const el = await legend();
            const events = recordEvents(el, "selected");
            entryButtons(el)[1].click();
            expect((events[0] as CustomEvent).detail).toEqual({ id: "sessions" });
        });

        it("doesn't change its own state: its owner does, through selected", async () => {
            const el = await legend();
            entryButtons(el)[0].click();
            await el.updateComplete;
            expect(entryButtons(el)[0].getAttribute("aria-pressed")).toBe("true");
        });

        it("raises events that stay inside the chart (no bubbling)", async () => {
            const el = await legend();
            const outside = recordEvents(el.parentElement!, "deselected");
            entryButtons(el)[0].click();
            expect(outside).toHaveLength(0);
        });

        it("is operable with Tab then Enter and Space", async () => {
            const el = await legend();
            const events = recordEvents(el, "deselected");
            await userEvent.tab();
            expect(shadow(el).activeElement).toBe(entryButtons(el)[0]);
            await userEvent.keyboard("{Enter}");
            await userEvent.keyboard(" ");
            expect(events).toHaveLength(2);
        });

        it("keeps focus on the entry across an update", async () => {
            const el = await legend();
            entryButtons(el)[0].focus();
            el.entries = entries.map((e) => ({ ...e, selected: e.id !== "pageviews" }));
            await el.updateComplete;
            expect(shadow(el).activeElement).toBe(entryButtons(el)[0]);
        });
    });

    describe("Scenario: the compare entry and the fold", () => {
        it("keeps the compare entry a plain item, not a button", async () => {
            const el = await legend(entries, "Last month");
            expect(entryButtons(el)).toHaveLength(2);
            expect(shadow(el).textContent).toContain("Last month");
        });

        it("still folds, and a series past the fold can be toggled once expanded", async () => {
            const many = Array.from({ length: 10 }, (_, i) => ({ id: `s${i}`, label: `Series ${i}`, color: ((i % 8) + 1) as 1 }));
            const el = await legend(many);
            expect(entryButtons(el)).toHaveLength(7);
            shadow(el).querySelector<HTMLButtonElement>(".legend-toggle")!.click();
            await el.updateComplete;
            const events = recordEvents(el, "deselected");
            entryButtons(el)[9].click();
            expect((events[0] as CustomEvent).detail).toEqual({ id: "s9" });
        });
    });

    describe("Scenario: a11y audit", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface)">
                        <uaui-chart-legend .entries=${entries} .bars=${true} compare-label="Last month"></uaui-chart-legend>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector<UauiTestElement>("uaui-chart-legend")!.updateComplete;
                return await axeRun(host);
            } finally {
                theme.remove();
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
