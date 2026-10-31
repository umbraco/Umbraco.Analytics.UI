/// <reference types="vite/client" />
// GRP-1 — Day / Week / Month switch
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { userEvent } from "vitest/browser";
import "./group-by.element.js";
import type { UauiGroupByElement } from "./group-by.element.js";
import { deepQueryAll, nextEvent, renderElement, type UauiTestElement } from "../internal/test/dom.js";

const option = (el: Element, label: string) =>
    deepQueryAll(el.shadowRoot!, "[role='radio']").find((o) => o.textContent?.trim() === label) as HTMLElement;

describe("Feature: Day / Week / Month switch", () => {
    describe("Scenario: showing the current value", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-group-by value="week"></uaui-group-by>`, "uaui-group-by");
        });

        it("checks Week", () => {
            expect(option(el, "Week").getAttribute("aria-checked")).toBe("true");
        });
    });

    describe("Scenario: clicking an option", () => {
        let detail: unknown;
        beforeEach(async () => {
            const el = await renderElement(html`<uaui-group-by value="day"></uaui-group-by>`, "uaui-group-by");
            const event = nextEvent(el, "change");
            option(el, "Month").click();
            detail = (await event).detail;
        });

        it("raises change with the new value", () => {
            expect(detail).toEqual({ value: "month" });
        });
    });

    describe("Scenario: using the arrow keys", () => {
        let detail: unknown;
        beforeEach(async () => {
            const el = await renderElement(html`<uaui-group-by value="day"></uaui-group-by>`, "uaui-group-by");
            const event = nextEvent(el, "change");
            option(el, "Day").focus();
            await userEvent.keyboard("{ArrowRight}");
            detail = (await event).detail;
        });

        it("raises change with the next value", () => {
            expect(detail).toEqual({ value: "week" });
        });
    });

    describe("Scenario: picking an option", () => {
        it("raises exactly one change on the host", async () => {
            const el = await renderElement(html`<uaui-group-by value="day"></uaui-group-by>`, "uaui-group-by");
            let count = 0;
            el.addEventListener("change", () => count++);
            option(el, "Month").click();
            await el.updateComplete;
            expect(count).toBe(1);
        });
    });

    describe("Scenario: limited options", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-group-by value="day" .options=${["day", "week"]}></uaui-group-by>`, "uaui-group-by");
        });

        it("shows only Day and Week", () => {
            expect(deepQueryAll(el.shadowRoot!, "[role='radio']").map((o) => o.textContent?.trim())).toEqual(["Day", "Week"]);
        });
    });

    describe("Scenario: accessibility", () => {
        // Audits the control on the theme's surface with a selected and an unselected option, under a real UUI theme stylesheet.
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); padding: 8px">
                        <uaui-group-by value="week"></uaui-group-by>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector<UauiGroupByElement>("uaui-group-by")!.updateComplete;
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
