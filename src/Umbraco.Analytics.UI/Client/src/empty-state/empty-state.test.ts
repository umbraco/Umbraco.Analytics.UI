// FND-3 — Empty and loading states (empty state: AC1, AC2)
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";
import "./empty-state.element.js";

describe("Feature: empty state", () => {
    describe("Scenario: the product's text", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-empty-state headline="No pageviews yet" description="Views appear here."></uan-empty-state>`,
                "uan-empty-state",
            );
        });

        it("shows the headline", () => {
            expect(shadow(el).textContent).toContain("No pageviews yet");
        });

        it("shows the description", () => {
            expect(shadow(el).querySelector("p")?.textContent).toBe("Views appear here.");
        });

        it("renders no heading element", () => {
            expect(shadow(el).querySelector("h1, h2, h3, h4, h5, h6, [role='heading']")).toBe(null);
        });
    });

    describe("Scenario: no text set", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-empty-state></uan-empty-state>`, "uan-empty-state");
        });

        it("shows the default headline", () => {
            expect(shadow(el).querySelector(".headline")?.textContent).toBe("No data yet");
        });

        it("shows the default description", () => {
            expect(shadow(el).querySelector("p")?.textContent).toBe("Try a wider date range.");
        });

        it("shows the search icon", () => {
            expect(shadow(el).querySelector("uui-icon")?.getAttribute("name")).toBe("icon-search");
        });
    });

    describe("Scenario: a line is set to an empty string", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-empty-state description=""></uan-empty-state>`, "uan-empty-state");
        });

        it("leaves the description out", () => {
            expect(shadow(el).querySelector("p")).toBe(null);
        });
    });

    describe("Scenario: a custom icon", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-empty-state icon="icon-chart"></uan-empty-state>`, "uan-empty-state");
        });

        it("shows that icon", () => {
            expect(shadow(el).querySelector("uui-icon")?.getAttribute("name")).toBe("icon-chart");
        });
    });

    describe("Scenario: a11y audit", () => {
        // Renders the element on the surface, optionally under a real UUI theme stylesheet, and audits it.
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface)">
                        <uan-empty-state></uan-empty-state>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uan-empty-state")!.updateComplete;
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

    describe("Scenario: a data element with no data and no text set", () => {
        // T9 adds uan-time-series-chart and turns this on. The default text itself is covered above.
        it.skip("shows uan-empty-state with the default text", async () => {
            const el = await renderElement(
                html`<uan-time-series-chart kind="line" .series=${[]}></uan-time-series-chart>`,
                "uan-time-series-chart",
            );
            expect(shadow(el).querySelector("uan-empty-state")?.shadowRoot?.textContent).toContain("No data yet");
        });
    });
});
