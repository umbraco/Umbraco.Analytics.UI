/// <reference types="vite/client" />
// Generic toggle group (single choice, radio group)
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { userEvent } from "vitest/browser";
import { axeRun } from "../internal/test/a11y.js";
import { nextEvent, renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./toggle-group.element.js";
import type { UauiToggleGroupElement, UauiToggleGroupOption } from "./toggle-group.element.js";

const options: UauiToggleGroupOption[] = [
    { value: "model", label: "Model" },
    { value: "profile", label: "Profile" },
    { value: "team", label: "Team" },
];

const radios = (el: Element) => [...shadow(el).querySelectorAll<HTMLElement>("[role='radio']")];
const option = (el: Element, label: string) => radios(el).find((o) => o.textContent?.trim() === label)!;
const template = (value = "model") =>
    html`<uaui-toggle-group label="Break down by" value=${value} .options=${options}></uaui-toggle-group>`;

describe("Feature: Toggle group", () => {
    describe("Scenario: showing the options", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(template(), "uaui-toggle-group");
        });

        it("shows each option's label in order", () => {
            expect(radios(el).map((o) => o.textContent?.trim())).toEqual(["Model", "Profile", "Team"]);
        });

        it("is a radio group named by the label", () => {
            expect(shadow(el).querySelector("[role='radiogroup']")?.getAttribute("aria-label")).toBe("Break down by");
        });
    });

    describe("Scenario: showing the current value", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(template("profile"), "uaui-toggle-group");
        });

        it("checks the matching option", () => {
            expect(option(el, "Profile").getAttribute("aria-checked")).toBe("true");
        });

        it("leaves the others unchecked", () => {
            expect(option(el, "Model").getAttribute("aria-checked")).toBe("false");
        });

        it("puts only the selected option in the tab order", () => {
            expect(radios(el).map((o) => o.tabIndex)).toEqual([-1, 0, -1]);
        });
    });

    describe("Scenario: a value that is not an option", () => {
        it("gives the first option the tab stop", async () => {
            const el = await renderElement(template("nope"), "uaui-toggle-group");
            expect(radios(el).map((o) => o.tabIndex)).toEqual([0, -1, -1]);
        });
    });

    describe("Scenario: clicking an option", () => {
        let el: UauiTestElement;
        let detail: unknown;
        beforeEach(async () => {
            el = await renderElement(template(), "uaui-toggle-group");
            const event = nextEvent(el, "change");
            option(el, "Team").click();
            detail = (await event).detail;
        });

        it("raises change with the new value", () => {
            expect(detail).toEqual({ value: "team" });
        });

        it("updates its own value", () => {
            expect((el as unknown as UauiToggleGroupElement).value).toBe("team");
        });
    });

    describe("Scenario: clicking the selected option", () => {
        it("raises nothing", async () => {
            const el = await renderElement(template(), "uaui-toggle-group");
            let raised = false;
            el.addEventListener("change", () => (raised = true));
            option(el, "Model").click();
            expect(raised).toBe(false);
        });
    });

    describe("Scenario: the change event", () => {
        it("bubbles but is not composed", async () => {
            const el = await renderElement(template(), "uaui-toggle-group");
            const event = nextEvent(el, "change");
            option(el, "Profile").click();
            const { bubbles, composed } = await event;
            expect({ bubbles, composed }).toEqual({ bubbles: true, composed: false });
        });
    });

    describe("Scenario: using the arrow keys", () => {
        it("selects the next option on ArrowRight", async () => {
            const el = await renderElement(template(), "uaui-toggle-group");
            const event = nextEvent(el, "change");
            option(el, "Model").focus();
            await userEvent.keyboard("{ArrowRight}");
            expect((await event).detail).toEqual({ value: "profile" });
        });

        it("wraps to the last option on ArrowLeft from the first", async () => {
            const el = await renderElement(template(), "uaui-toggle-group");
            const event = nextEvent(el, "change");
            option(el, "Model").focus();
            await userEvent.keyboard("{ArrowLeft}");
            expect((await event).detail).toEqual({ value: "team" });
        });

        it("moves focus to the newly selected option", async () => {
            const el = await renderElement(template(), "uaui-toggle-group");
            option(el, "Model").focus();
            await userEvent.keyboard("{ArrowRight}");
            await el.updateComplete;
            expect(shadow(el).activeElement).toBe(option(el, "Profile"));
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
                    html`<div style="background: var(--uui-color-surface); padding: 8px">${template("profile")}</div>`,
                ).container.querySelector("div")!;
                await host.querySelector<UauiToggleGroupElement>("uaui-toggle-group")!.updateComplete;
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
