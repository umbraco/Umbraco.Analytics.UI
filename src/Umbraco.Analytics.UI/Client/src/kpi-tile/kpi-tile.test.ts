// KPI-1 — KPI tile shows a headline number
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import "./kpi-tile.element.js";
import type { UaxKpiTileElement } from "./kpi-tile.element.js";
import { renderElement, shadow, type UaxTestElement } from "../internal/test/dom.js";

describe("Feature: KPI tile shows a headline number", () => {
    describe("Scenario: label, value and icon", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coins"></uax-kpi-tile>`,
                "uax-kpi-tile",
            );
        });

        it("shows the label", () => {
            expect(shadow(el).textContent).toContain("Revenue");
        });

        it("shows the value exactly as given", () => {
            expect(shadow(el).textContent).toContain("€ 4,837.40");
        });

        it("shows the icon", () => {
            expect(shadow(el).querySelector("uui-icon")?.getAttribute("name")).toBe("icon-coins");
        });
    });

    describe("Scenario: lower is better", () => {
        it("reflects lower-is-better to the attribute, like uax-delta-badge", async () => {
            const el = await renderElement(html`<uax-kpi-tile label="Refunds" value="1" .lowerIsBetter=${true}></uax-kpi-tile>`, "uax-kpi-tile");
            expect(el.hasAttribute("lower-is-better")).toBe(true);
        });
    });

    describe("Scenario: with a delta", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-kpi-tile label="Revenue" value="€ 1" .delta=${18.7}></uax-kpi-tile>`, "uax-kpi-tile");
        });

        it("shows a change badge for the delta", () => {
            expect((shadow(el).querySelector("uax-delta-badge") as UaxTestElement | null)?.value).toBe(18.7);
        });
    });

    describe("Scenario: tiles in one row", () => {
        let tiles: UaxKpiTileElement[];
        beforeEach(async () => {
            const { container } = render(html`<div style="display:grid;grid-template-columns:repeat(3,160px)">
                <uax-kpi-tile label="Revenue" value="1"></uax-kpi-tile>
                <uax-kpi-tile label="Carts created this period" value="2"></uax-kpi-tile>
                <uax-kpi-tile label="Orders" value="3"></uax-kpi-tile>
            </div>`);
            tiles = [...container.querySelectorAll("uax-kpi-tile")];
            await Promise.all(tiles.map((t) => t.updateComplete));
        });

        // The visible card, not the host: a grid stretches the host whatever the card does.
        const card = (t: Element) => t.shadowRoot!.querySelector(".tile")!.getBoundingClientRect().height;
        const labelHeight = (t: Element) => t.shadowRoot!.querySelector(".label")!.getBoundingClientRect().height;

        it("have a long label that wraps onto more lines than a short one", () => {
            expect(labelHeight(tiles[1]!)).toBeGreaterThan(labelHeight(tiles[0]!));
        });

        it("are all the same height", () => {
            expect(new Set(tiles.map(card)).size).toBe(1);
        });
    });

    describe("Scenario: a narrow tile", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<div style="width:140px"><uax-kpi-tile label="Revenue" value="€ 4,837.40" .delta=${18.7}></uax-kpi-tile></div>`,
                "uax-kpi-tile",
            );
        });

        it("puts the badge below the value", () => {
            const value = shadow(el).querySelector(".value")!.getBoundingClientRect();
            const badge = shadow(el).querySelector("uax-delta-badge")!.getBoundingClientRect();
            expect(badge.top).toBeGreaterThanOrEqual(value.bottom);
        });
    });

    describe("Scenario (sad path): no delta", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-kpi-tile label="Orders" value="26"></uax-kpi-tile>`, "uax-kpi-tile");
        });

        it("shows no badge", () => {
            expect(shadow(el).querySelector("uax-delta-badge")).toBe(null);
        });
    });

    describe("Scenario: loading", () => {
        it("shows a skeleton and no value while loading with no value", async () => {
            const el = await renderElement(html`<uax-kpi-tile label="Revenue" loading></uax-kpi-tile>`, "uax-kpi-tile");
            expect(shadow(el).querySelector("uax-skeleton")).not.toBe(null);
        });

        it("keeps the value, with no skeleton, while reloading", async () => {
            const el = await renderElement(
                html`<uax-kpi-tile label="Revenue" value="€ 1" loading></uax-kpi-tile>`,
                "uax-kpi-tile",
            );
            expect(shadow(el).querySelector("uax-skeleton")).toBe(null);
            expect(shadow(el).textContent).toContain("€ 1");
        });

        it("marks its content busy while loading", async () => {
            const el = await renderElement(html`<uax-kpi-tile label="Revenue" loading></uax-kpi-tile>`, "uax-kpi-tile");
            expect(shadow(el).querySelector(".content")?.getAttribute("aria-busy")).toBe("true");
        });

        it("is as tall as a loaded tile, so the page does not jump", async () => {
            const loaded = await renderElement(html`<uax-kpi-tile label="Revenue" value="1"></uax-kpi-tile>`, "uax-kpi-tile");
            const loading = await renderElement(html`<uax-kpi-tile label="Revenue" loading></uax-kpi-tile>`, "uax-kpi-tile");
            expect(loading.getBoundingClientRect().height).toBe(loaded.getBoundingClientRect().height);
        });
    });

    describe("Scenario: accessibility", () => {
        // Renders a tile with every part on the surface, optionally under a real UUI theme, and audits it.
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-background); padding: 8px; width: 320px">
                        <uax-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coins" .delta=${-3}></uax-kpi-tile>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uax-kpi-tile")!.updateComplete;
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        it("passes the a11y audit in the light theme", async () => {
            expect(await audit()).toHaveNoViolations();
        });

        it("passes the a11y audit in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });

        it("passes the a11y audit in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });

        it("hides the icon from assistive tech", async () => {
            const el = await renderElement(html`<uax-kpi-tile label="A" value="1" icon="icon-coins"></uax-kpi-tile>`, "uax-kpi-tile");
            expect(shadow(el).querySelector(".icon")?.getAttribute("aria-hidden")).toBe("true");
        });
    });
});
