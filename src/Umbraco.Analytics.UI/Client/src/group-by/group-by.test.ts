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
import type { UanGroupByElement } from "./group-by.element.js";
import { nextEvent, renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";

const option = (el: Element, label: string) =>
    [...shadow(el).querySelectorAll("[role='radio']")].find((o) => o.textContent?.trim() === label) as HTMLElement;

describe("Feature: Day / Week / Month switch", () => {
    describe("Scenario: showing the current value", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-group-by value="week"></uan-group-by>`, "uan-group-by");
        });

        it("checks Week", () => {
            expect(option(el, "Week").getAttribute("aria-checked")).toBe("true");
        });
    });

    describe("Scenario: clicking an option", () => {
        let detail: unknown;
        beforeEach(async () => {
            const el = await renderElement(html`<uan-group-by value="day"></uan-group-by>`, "uan-group-by");
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
            const el = await renderElement(html`<uan-group-by value="day"></uan-group-by>`, "uan-group-by");
            const event = nextEvent(el, "change");
            option(el, "Day").focus();
            await userEvent.keyboard("{ArrowRight}");
            detail = (await event).detail;
        });

        it("raises change with the next value", () => {
            expect(detail).toEqual({ value: "week" });
        });
    });

    describe("Scenario: limited options", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-group-by value="day" .options=${["day", "week"]}></uan-group-by>`, "uan-group-by");
        });

        it("shows only Day and Week", () => {
            expect([...shadow(el).querySelectorAll("[role='radio']")].map((o) => o.textContent?.trim())).toEqual(["Day", "Week"]);
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
                        <uan-group-by value="week"></uan-group-by>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector<UanGroupByElement>("uan-group-by")!.updateComplete;
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
