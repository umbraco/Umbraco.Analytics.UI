// T27 — the error state element itself (the data elements' specs are in their own folders)
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { pressed, recordEvents, renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./error-state.element.js";

const retryButton = (el: Element) => shadow(el).querySelector("uui-button") as HTMLElement | null;

describe("Feature: error state", () => {
    describe("Scenario: no text set", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-error-state></uaui-error-state>`, "uaui-error-state");
        });

        it("shows the default headline", () => {
            expect(shadow(el).querySelector(".headline")?.textContent).toBe("Something went wrong");
        });

        it("shows the default description", () => {
            expect(shadow(el).querySelector("p")?.textContent).toBe("The data could not be loaded.");
        });

        it("shows the alert icon", () => {
            expect(shadow(el).querySelector("uui-icon")?.getAttribute("name")).toBe("icon-alert");
        });

        it("is announced as an alert", () => {
            expect(shadow(el).querySelector("[role='alert']")).not.toBe(null);
        });

        it("shows no Retry button", () => {
            expect(retryButton(el)).toBe(null);
        });
    });

    describe("Scenario: the product's text", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-error-state headline="Pageviews failed" description="Check your connection." icon="icon-wrong"></uaui-error-state>`,
                "uaui-error-state",
            );
        });

        it("shows the headline", () => {
            expect(shadow(el).querySelector(".headline")?.textContent).toBe("Pageviews failed");
        });

        it("shows the description", () => {
            expect(shadow(el).querySelector("p")?.textContent).toBe("Check your connection.");
        });

        it("shows that icon", () => {
            expect(shadow(el).querySelector("uui-icon")?.getAttribute("name")).toBe("icon-wrong");
        });
    });

    describe("Scenario: a line is set to an empty string", () => {
        it("leaves the description out", async () => {
            const el = await renderElement(html`<uaui-error-state description=""></uaui-error-state>`, "uaui-error-state");
            expect(shadow(el).querySelector("p")).toBe(null);
        });
    });

    describe("Scenario: retryable", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-error-state retryable></uaui-error-state>`, "uaui-error-state");
        });

        it("shows a Retry button", () => {
            expect(retryButton(el)?.getAttribute("label")).toBe("Retry");
        });

        it("raises retry when the button is pressed", async () => {
            const events = recordEvents(el, "retry");
            await pressed(retryButton(el)!);
            expect(events).toHaveLength(1);
        });

        it("raises retry bubbling", async () => {
            const events = recordEvents(el, "retry");
            await pressed(retryButton(el)!);
            expect(events[0].bubbles).toBe(true);
        });

        it("raises retry not composed", async () => {
            const events = recordEvents(el, "retry");
            await pressed(retryButton(el)!);
            expect(events[0].composed).toBe(false);
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
                    html`<div style="background: var(--uui-color-surface)"><uaui-error-state retryable></uaui-error-state></div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uaui-error-state")!.updateComplete;
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
