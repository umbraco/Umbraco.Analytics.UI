/// <reference types="vite/client" />
// KPI-2 — KPI tiles switch the chart's metric
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { userEvent } from "vitest/browser";
import { render } from "vitest-browser-lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import lightCss from "@umbraco-ui/uui/themes/light.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { axeRun } from "../internal/test/a11y.js";
import "./kpi-tile.element.js";
import { recordEvents, renderElement, shadow, type UaxTestElement } from "../internal/test/dom.js";

describe("Feature: KPI tiles switch the chart's metric", () => {
    const button = (el: Element) => shadow(el).querySelector("button") as HTMLElement;

    describe("Scenario: clicking a selectable tile", () => {
        let el: UaxTestElement;
        let events: Event[];
        beforeEach(async () => {
            el = await renderElement(html`<uax-kpi-tile label="Orders" value="26" selectable></uax-kpi-tile>`, "uax-kpi-tile");
            events = recordEvents(el, "selected");
            button(el).click();
        });

        it("raises selected", () => {
            expect(events).toHaveLength(1);
        });

        it("sets selected", () => {
            expect(el.selected).toBe(true);
        });
    });

    describe("Scenario: pressing Enter on a selectable tile", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderElement(html`<uax-kpi-tile label="Orders" value="26" selectable></uax-kpi-tile>`, "uax-kpi-tile");
            events = recordEvents(el, "selected");
            button(el).focus();
            await userEvent.keyboard("{Enter}");
        });

        it("raises selected", () => {
            expect(events).toHaveLength(1);
        });
    });

    describe("Scenario: a selected tile", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-kpi-tile label="Orders" value="26" selectable selected></uax-kpi-tile>`, "uax-kpi-tile");
        });

        it("reports aria-pressed true", () => {
            expect(button(el).getAttribute("aria-pressed")).toBe("true");
        });
    });

    describe("Scenario: clicking a selected tile", () => {
        let el: UaxTestElement;
        let events: Event[];
        beforeEach(async () => {
            el = await renderElement(html`<uax-kpi-tile label="Orders" value="26" selectable selected></uax-kpi-tile>`, "uax-kpi-tile");
            events = recordEvents(el, "deselected");
            button(el).click();
        });

        it("raises deselected", () => {
            expect(events).toHaveLength(1);
        });

        it("clears selected", () => {
            expect(el.selected).toBe(false);
        });
    });

    describe("Scenario (sad path): a tile that isn't selectable", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderElement(html`<uax-kpi-tile label="Orders" value="26"></uax-kpi-tile>`, "uax-kpi-tile");
            events = recordEvents(el, "selected");
            el.click();
        });

        it("raises no selected event", () => {
            expect(events).toHaveLength(0);
        });
    });

    describe("Scenario (sad path): the product cancels selected", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-kpi-tile label="Orders" value="26" selectable></uax-kpi-tile>`, "uax-kpi-tile");
            el.addEventListener("selected", (e) => e.preventDefault());
            button(el).click();
        });

        it("keeps selected false", () => {
            expect(el.selected).toBe(false);
        });
    });

    describe("Scenario (sad path): a tile that isn't deselectable", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-kpi-tile label="Orders" value="26" selectable selected .deselectable=${false}></uax-kpi-tile>`,
                "uax-kpi-tile",
            );
            button(el).click();
        });

        it("keeps selected true", () => {
            expect(el.selected).toBe(true);
        });
    });

    describe("Scenario: selection border in the dark theme", () => {
        it("is malibu light, which reaches 3:1 on the dark surface", async () => {
            const theme = document.createElement("style");
            theme.textContent = darkCss;
            document.head.appendChild(theme);
            try {
                const { container } = render(
                    html`<div style="background: var(--uui-color-surface)"><uax-kpi-tile label="Orders" value="26" selectable selected></uax-kpi-tile></div>`,
                );
                const el = container.querySelector("uax-kpi-tile")!;
                await el.updateComplete;
                const probe = (css: string) => {
                    const span = document.createElement("span");
                    span.style.color = css;
                    container.appendChild(span);
                    const resolved = getComputedStyle(span).color;
                    span.remove();
                    return resolved;
                };
                const border = el.shadowRoot!.querySelector(".select-border")!;
                const actual = getComputedStyle(border, "::after").borderTopColor;
                expect(actual).toBe(probe("var(--uui-palette-malibu-light)"));
            } finally {
                theme.remove();
            }
        });
    });

    describe("Scenario: tile height as a button", () => {
        it("fills the row like a plain tile", async () => {
            const { container } = render(html`<div style="display:grid;grid-template-columns:repeat(2,160px)">
                <uax-kpi-tile label="Carts created this period" value="1"></uax-kpi-tile>
                <uax-kpi-tile label="Orders" value="2" selectable></uax-kpi-tile>
            </div>`);
            const tiles = [...container.querySelectorAll("uax-kpi-tile")];
            await Promise.all(tiles.map((t) => t.updateComplete));
            const card = (t: Element) => t.shadowRoot!.querySelector(".tile")!.getBoundingClientRect();
            expect(card(tiles[1]!).height).toBe(card(tiles[0]!).height);
            expect(card(tiles[1]!).width).toBe(card(tiles[0]!).width);
        });
    });

    describe("Scenario: accessibility", () => {
        async function audit(selected: boolean, themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-background); padding: 8px; width: 320px">
                        <uax-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coins" .delta=${-3} selectable ?selected=${selected}></uax-kpi-tile>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uax-kpi-tile")!.updateComplete;
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        for (const selected of [false, true]) {
            const state = selected ? "selected" : "unselected";
            it(`passes the a11y audit in light (${state})`, async () => {
                expect(await audit(selected, lightCss)).toHaveNoViolations();
            });
            it(`passes the a11y audit in dark (${state})`, async () => {
                expect(await audit(selected, darkCss)).toHaveNoViolations();
            });
            it(`passes the a11y audit in high contrast (${state})`, async () => {
                expect(await audit(selected, highContrastCss)).toHaveNoViolations();
            });
        }
    });
});
