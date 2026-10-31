// KPI-1 — KPI tile shows a headline number
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import "./kpi-tile.element.js";
import type { UauiDeltaBadgeElement } from "../delta-badge/delta-badge.element.js";
import type { UauiKpiTileElement } from "./kpi-tile.element.js";
import { recordEvents, renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";

describe("Feature: KPI tile shows a headline number", () => {
    describe("Scenario: label, value and icon", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coins"></uaui-kpi-tile>`,
                "uaui-kpi-tile",
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
        it("reflects lower-is-better to the attribute, like uaui-delta-badge", async () => {
            const el = await renderElement(html`<uaui-kpi-tile label="Refunds" value="1" .lowerIsBetter=${true}></uaui-kpi-tile>`, "uaui-kpi-tile");
            expect(el.hasAttribute("lower-is-better")).toBe(true);
        });
    });

    describe("Scenario: with a delta", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-kpi-tile label="Revenue" value="€ 1" .delta=${18.7}></uaui-kpi-tile>`, "uaui-kpi-tile");
        });

        it("shows a change badge for the delta", () => {
            expect((shadow(el).querySelector("uaui-delta-badge") as UauiTestElement | null)?.value).toBe(18.7);
        });
    });

    describe("Scenario: no change", () => {
        let badge: UauiDeltaBadgeElement;
        beforeEach(async () => {
            const el = await renderElement(
                html`<uaui-kpi-tile label="Success rate" value="98%" .delta=${0} delta-unit="points"></uaui-kpi-tile>`,
                "uaui-kpi-tile",
            );
            badge = shadow(el).querySelector("uaui-delta-badge") as UauiDeltaBadgeElement;
            await badge.updateComplete;
        });

        it("still shows a badge for a delta of 0", () => {
            expect(badge).not.toBe(null);
        });

        it("shows it as neutral", () => {
            expect(badge.sentiment).toBe("neutral");
        });

        it("reads it as no change", () => {
            expect(badge.shadowRoot!.querySelector(".visually-hidden")!.textContent).toContain("no change");
        });
    });

    describe("Scenario (sad path): unknown change", () => {
        it("shows no badge when the delta is not a number", async () => {
            const el = await renderElement(html`<uaui-kpi-tile label="Orders" value="26" .delta=${Number.NaN}></uaui-kpi-tile>`, "uaui-kpi-tile");
            expect(shadow(el).querySelector("uaui-delta-badge")).toBe(null);
        });

        it("shows no badge when the delta is infinite (compared with zero)", async () => {
            const el = await renderElement(
                html`<uaui-kpi-tile label="Orders" value="26" .delta=${Number.POSITIVE_INFINITY}></uaui-kpi-tile>`,
                "uaui-kpi-tile",
            );
            expect(shadow(el).querySelector("uaui-delta-badge")).toBe(null);
        });
    });

    describe("Scenario: no data", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-kpi-tile label="Revenue" value="€ 0" icon="icon-coins" .delta=${5} no-data></uaui-kpi-tile>`,
                "uaui-kpi-tile",
            );
        });

        it("shows a dash in place of the value", () => {
            expect(shadow(el).querySelector(".value [aria-hidden='true']")?.textContent).toBe("—");
        });

        it("does not show the value", () => {
            expect(shadow(el).textContent).not.toContain("€ 0");
        });

        it("tells assistive tech there is no data", () => {
            expect(shadow(el).querySelector(".value .visually-hidden")?.textContent).toBe("No data yet");
        });

        it("shows no change badge", () => {
            expect(shadow(el).querySelector("uaui-delta-badge")).toBe(null);
        });

        it("keeps the label", () => {
            expect(shadow(el).textContent).toContain("Revenue");
        });

        it("is as tall as a tile with a value, so the row does not jump", async () => {
            const loaded = await renderElement(html`<uaui-kpi-tile label="Revenue" value="1" icon="icon-coins"></uaui-kpi-tile>`, "uaui-kpi-tile");
            expect(el.getBoundingClientRect().height).toBe(loaded.getBoundingClientRect().height);
        });

        it("stays selectable", async () => {
            const selectable = await renderElement(html`<uaui-kpi-tile label="Revenue" no-data selectable></uaui-kpi-tile>`, "uaui-kpi-tile");
            const events = recordEvents(selectable, "selected");
            (shadow(selectable).querySelector("button") as HTMLElement).click();
            expect(events).toHaveLength(1);
        });
    });

    describe("Scenario: no data while loading", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-kpi-tile label="Revenue" no-data loading></uaui-kpi-tile>`, "uaui-kpi-tile");
        });

        it("keeps the dash instead of a skeleton", () => {
            expect(shadow(el).querySelector(".value [aria-hidden='true']")?.textContent).toBe("—");
        });

        it("marks its content busy", () => {
            expect(shadow(el).querySelector(".content")?.getAttribute("aria-busy")).toBe("true");
        });
    });

    describe("Scenario: tiles in one row", () => {
        let tiles: UauiKpiTileElement[];
        beforeEach(async () => {
            const { container } = render(html`<div style="display:grid;grid-template-columns:repeat(3,160px)">
                <uaui-kpi-tile label="Revenue" value="1"></uaui-kpi-tile>
                <uaui-kpi-tile label="Carts created this period" value="2"></uaui-kpi-tile>
                <uaui-kpi-tile label="Orders" value="3"></uaui-kpi-tile>
            </div>`);
            tiles = [...container.querySelectorAll("uaui-kpi-tile")];
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
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<div style="width:140px"><uaui-kpi-tile label="Revenue" value="€ 4,837.40" .delta=${18.7}></uaui-kpi-tile></div>`,
                "uaui-kpi-tile",
            );
        });

        it("puts the badge below the value", () => {
            const value = shadow(el).querySelector(".value")!.getBoundingClientRect();
            const badge = shadow(el).querySelector("uaui-delta-badge")!.getBoundingClientRect();
            expect(badge.top).toBeGreaterThanOrEqual(value.bottom);
        });
    });

    describe("Scenario (sad path): no delta", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-kpi-tile label="Orders" value="26"></uaui-kpi-tile>`, "uaui-kpi-tile");
        });

        it("shows no badge", () => {
            expect(shadow(el).querySelector("uaui-delta-badge")).toBe(null);
        });
    });

    describe("Scenario: loading", () => {
        it("shows a skeleton and no value while loading with no value", async () => {
            const el = await renderElement(html`<uaui-kpi-tile label="Revenue" loading></uaui-kpi-tile>`, "uaui-kpi-tile");
            expect(shadow(el).querySelector("uaui-skeleton")).not.toBe(null);
        });

        it("keeps the value, with no skeleton, while reloading", async () => {
            const el = await renderElement(
                html`<uaui-kpi-tile label="Revenue" value="€ 1" loading></uaui-kpi-tile>`,
                "uaui-kpi-tile",
            );
            expect(shadow(el).querySelector("uaui-skeleton")).toBe(null);
            expect(shadow(el).textContent).toContain("€ 1");
        });

        it("marks its content busy while loading", async () => {
            const el = await renderElement(html`<uaui-kpi-tile label="Revenue" loading></uaui-kpi-tile>`, "uaui-kpi-tile");
            expect(shadow(el).querySelector(".content")?.getAttribute("aria-busy")).toBe("true");
        });

        it("is as tall as a loaded tile, so the page does not jump", async () => {
            const loaded = await renderElement(html`<uaui-kpi-tile label="Revenue" value="1"></uaui-kpi-tile>`, "uaui-kpi-tile");
            const loading = await renderElement(html`<uaui-kpi-tile label="Revenue" loading></uaui-kpi-tile>`, "uaui-kpi-tile");
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
                        <uaui-kpi-tile label="Revenue" value="€ 4,837.40" icon="icon-coins" .delta=${-3}></uaui-kpi-tile>
                        <uaui-kpi-tile label="Orders" icon="icon-inbox" no-data></uaui-kpi-tile>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uaui-kpi-tile")!.updateComplete;
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
            const el = await renderElement(html`<uaui-kpi-tile label="A" value="1" icon="icon-coins"></uaui-kpi-tile>`, "uaui-kpi-tile");
            expect(shadow(el).querySelector(".icon")?.getAttribute("aria-hidden")).toBe("true");
        });
    });
});
