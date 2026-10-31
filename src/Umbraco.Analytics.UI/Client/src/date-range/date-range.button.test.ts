/// <reference types="vite/client" />
// DR-3 — The date range button with a comparison on
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { axeRun } from "../internal/test/a11y.js";
import { renderWithModals } from "../internal/test/modal-host.js";
import { deepQuery, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./date-range.element.js";
import "../group-by/group-by.element.js";

const value = { from: "2026-05-25", to: "2026-06-23" };
const compare = { mode: "previous-period", from: "2026-04-25", to: "2026-05-24" };

const render = async (compareValue?: object, width = "auto", dir = "ltr") => {
    const el = await renderWithModals(
        html`<div dir=${dir} style="background: var(--uui-color-surface); padding: 8px; width: ${width}">
            <uaui-group-by .value=${"week"} .options=${["day", "week", "month"]}></uaui-group-by>
            <uaui-date-range .value=${value} .compare=${compareValue}></uaui-date-range>
        </div>`,
        "uaui-date-range",
    );
    await settle(el.parentElement!.querySelector("uaui-group-by")!);
    return el;
};
const heightOf = (el: Element | null | undefined) => el!.getBoundingClientRect().height;
const groupByBox = (el: UauiTestElement) => deepQuery(el.parentElement!.querySelector("uaui-group-by")!.shadowRoot!, ".group");
const dateButton = (el: UauiTestElement) => shadow(el).querySelector("uui-button")!;
const line2 = (el: UauiTestElement) => shadow(el).querySelector(".compare")?.textContent?.trim();

describe("Feature: the date range button with a comparison", () => {
    const previousLanguage = umbLocalizationManager.documentLanguage;
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
    });
    afterEach(() => {
        umbLocalizationManager.documentLanguage = previousLanguage;
    });

    describe("Scenario: no comparison", () => {
        it("is as tall as uaui-group-by", async () => {
            const el = await render();
            expect(heightOf(dateButton(el))).toBe(heightOf(groupByBox(el)));
        });
    });

    describe("Scenario: UUI's own label text", () => {
        it("is not drawn without a comparison", async () => {
            const el = await render();
            expect(dateButton(el).shadowRoot!.querySelector("span.label")).toBe(null);
        });

        it("is not drawn with a comparison", async () => {
            const el = await render(compare);
            expect(dateButton(el).shadowRoot!.querySelector("span.label")).toBe(null);
        });
    });

    describe("Scenario: comparing in the same year", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await render(compare);
        });

        it("is as tall as uaui-group-by", () => {
            expect(heightOf(dateButton(el))).toBe(heightOf(groupByBox(el)));
        });

        it("shows the comparison on a second line with the year", () => {
            expect(line2(el)).toBe("vs Apr 25, 2026 to May 24, 2026");
        });

        it("names the comparison line as shown on the button", () => {
            expect(dateButton(el).getAttribute("label")).toContain("vs Apr 25, 2026 to May 24, 2026");
        });
    });

    describe("Scenario: comparing across years", () => {
        it("keeps the year on the comparison line", async () => {
            const el = await render({ mode: "previous-year", from: "2025-05-25", to: "2025-06-23" });
            expect(line2(el)).toBe("vs May 25, 2025 to Jun 23, 2025");
        });

        it("names the comparison as shown", async () => {
            const el = await render({ mode: "previous-year", from: "2025-05-25", to: "2025-06-23" });
            expect(dateButton(el).getAttribute("label")).toContain("vs May 25, 2025 to Jun 23, 2025");
        });
    });

    describe("Scenario: a narrow header", () => {
        const range = (el: UauiTestElement) => shadow(el).querySelector(".range")!.getBoundingClientRect();

        it("keeps the dates inside the button edge", async () => {
            const el = await render(compare, "160px");
            expect(range(el).right).toBeLessThanOrEqual(dateButton(el).getBoundingClientRect().right);
        });

        it("keeps the dates inside the button edge when right to left", async () => {
            const el = await render(compare, "160px", "rtl");
            expect(range(el).left).toBeGreaterThanOrEqual(dateButton(el).getBoundingClientRect().left);
        });

        it("cuts the dates short instead of wrapping", async () => {
            const el = await render(compare, "160px");
            const line = shadow(el).querySelector(".range") as HTMLElement;
            expect(line.scrollWidth).toBeGreaterThan(line.clientWidth);
        });
    });

    describe("Scenario: accessibility", () => {
        async function audit(themeCss: string | undefined) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                return await axeRun(await render(compare));
            } finally {
                theme.remove();
            }
        }

        it("has no axe violations in the light theme", async () => {
            expect(await audit(undefined)).toHaveNoViolations();
        });

        it("has no axe violations in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });

        it("has no axe violations in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });
    });
});
