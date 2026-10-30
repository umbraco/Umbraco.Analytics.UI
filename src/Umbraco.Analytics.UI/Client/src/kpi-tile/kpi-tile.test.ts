// KPI-1 — KPI tile shows a headline number
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import "./kpi-tile.element.js";
import type { UanKpiTileElement } from "./kpi-tile.element.js";
import { renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";

describe("Feature: KPI tile shows a headline number", () => {
    describe("Scenario: label, value and icon", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coins"></uan-kpi-tile>`,
                "uan-kpi-tile",
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

    describe("Scenario: with a delta", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-kpi-tile label="Revenue" value="€ 1" .delta=${18.7}></uan-kpi-tile>`, "uan-kpi-tile");
        });

        it("shows a change badge for the delta", () => {
            expect((shadow(el).querySelector("uan-delta-badge") as UanTestElement | null)?.value).toBe(18.7);
        });
    });

    describe("Scenario: tiles in one row", () => {
        let tiles: UanKpiTileElement[];
        beforeEach(async () => {
            const { container } = render(html`<div style="display:grid;grid-template-columns:repeat(3,160px)">
                <uan-kpi-tile label="Revenue" value="1"></uan-kpi-tile>
                <uan-kpi-tile label="Carts created this period" value="2"></uan-kpi-tile>
                <uan-kpi-tile label="Orders" value="3"></uan-kpi-tile>
            </div>`);
            tiles = [...container.querySelectorAll("uan-kpi-tile")];
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
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<div style="width:140px"><uan-kpi-tile label="Revenue" value="€ 4,837.40" .delta=${18.7}></uan-kpi-tile></div>`,
                "uan-kpi-tile",
            );
        });

        it("puts the badge below the value", () => {
            const value = shadow(el).querySelector(".value")!.getBoundingClientRect();
            const badge = shadow(el).querySelector("uan-delta-badge")!.getBoundingClientRect();
            expect(badge.top).toBeGreaterThanOrEqual(value.bottom);
        });
    });

    describe("Scenario (sad path): no delta", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-kpi-tile label="Orders" value="26"></uan-kpi-tile>`, "uan-kpi-tile");
        });

        it("shows no badge", () => {
            expect(shadow(el).querySelector("uan-delta-badge")).toBe(null);
        });
    });

    describe("Scenario: loading", () => {
        it("shows a skeleton and no value while loading with no value", async () => {
            const el = await renderElement(html`<uan-kpi-tile label="Revenue" loading></uan-kpi-tile>`, "uan-kpi-tile");
            expect(shadow(el).querySelector("uan-skeleton")).not.toBe(null);
        });

        it("keeps the value, with no skeleton, while reloading", async () => {
            const el = await renderElement(
                html`<uan-kpi-tile label="Revenue" value="€ 1" loading></uan-kpi-tile>`,
                "uan-kpi-tile",
            );
            expect(shadow(el).querySelector("uan-skeleton")).toBe(null);
            expect(shadow(el).textContent).toContain("€ 1");
        });

        it("marks its content busy while loading", async () => {
            const el = await renderElement(html`<uan-kpi-tile label="Revenue" loading></uan-kpi-tile>`, "uan-kpi-tile");
            expect(shadow(el).querySelector(".content")?.getAttribute("aria-busy")).toBe("true");
        });

        it("is as tall as a loaded tile, so the page does not jump", async () => {
            const loaded = await renderElement(html`<uan-kpi-tile label="Revenue" value="1"></uan-kpi-tile>`, "uan-kpi-tile");
            const loading = await renderElement(html`<uan-kpi-tile label="Revenue" loading></uan-kpi-tile>`, "uan-kpi-tile");
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
                        <uan-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coins" .delta=${-3}></uan-kpi-tile>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uan-kpi-tile")!.updateComplete;
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
            const el = await renderElement(html`<uan-kpi-tile label="A" value="1" icon="icon-coins"></uan-kpi-tile>`, "uan-kpi-tile");
            expect(shadow(el).querySelector(".icon")?.getAttribute("aria-hidden")).toBe("true");
        });
    });
});
