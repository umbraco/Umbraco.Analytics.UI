/// <reference types="vite/client" />
// DR-2 — Pick a comparison range
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { axeRun } from "../internal/test/a11y.js";
import { queryDeep, renderWithModals } from "../internal/test/modal-host.js";
import { recordEvents, shadow, type UaxTestElement } from "../internal/test/pending.js";
import "./date-range.element.js";
import "./date-range-modal.element.js";

const value = { from: "2026-05-25", to: "2026-06-23" };

const render = (template = html`<uax-date-range .value=${value}></uax-date-range>`) => renderWithModals(template, "uax-date-range");
const openModal = async (el: UaxTestElement) => {
    (shadow(el).querySelector("uui-button") as HTMLElement).click();
    await expect.poll(() => queryDeep("uax-date-range-modal")).not.toBe(null);
    const modal = queryDeep("uax-date-range-modal")!;
    await modal.updateComplete;
    return modal;
};
const field = (modal: Element, name: string) => shadow(modal).querySelector(`[name='${name}']`) as HTMLInputElement | null;
const setField = async (modal: UaxTestElement, name: string, v: string | boolean) => {
    const input = field(modal, name)!;
    if (typeof v === "boolean") input.checked = v;
    else input.value = v;
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await modal.updateComplete;
};
const button = (modal: Element, label: string) =>
    [...shadow(modal).querySelectorAll("uui-button")].find((b) => b.getAttribute("label") === label) as HTMLElement & {
        disabled: boolean;
    };
const comparison = (modal: Element) => [field(modal, "compare-from")!.value, field(modal, "compare-to")!.value];
const errorFor = (modal: Element, name: string) => shadow(modal).querySelector(`[data-for='${name}']`)?.textContent?.trim();

describe("Feature: pick a comparison range", () => {
    // The backoffice sets the formatting language from the user's language, so pin it rather than use the browser's.
    const previousLanguage = umbLocalizationManager.documentLanguage;
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
    });
    afterEach(() => {
        umbLocalizationManager.documentLanguage = previousLanguage;
    });

    describe("Scenario: no comparison yet", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            modal = await openModal(await render());
        });

        it("has Compare switched off", () => {
            expect(field(modal, "compare")!.checked).toBe(false);
        });

        it("shows no comparison dates", () => {
            expect(field(modal, "compare-from")).toBe(null);
        });
    });

    describe("Scenario: comparing with the previous period", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            modal = await openModal(await render());
            await setField(modal, "compare", true);
            await setField(modal, "compare-mode", "previous-period");
        });

        it("fills the comparison dates with 25 Apr–24 May 2026", () => {
            expect(comparison(modal)).toEqual(["2026-04-25", "2026-05-24"]);
        });

        it("recomputes the comparison when the range changes", async () => {
            await setField(modal, "to", "2026-06-24");
            expect(comparison(modal)).toEqual(["2026-04-24", "2026-05-24"]);
        });
    });

    describe("Scenario: comparing with the previous year", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            modal = await openModal(await render());
            await setField(modal, "compare", true);
            await setField(modal, "compare-mode", "previous-year");
        });

        it("fills the comparison dates with the same days a year earlier", () => {
            expect(comparison(modal)).toEqual(["2025-05-25", "2025-06-23"]);
        });

        it("recomputes the comparison when the range changes", async () => {
            await setField(modal, "from", "2026-05-26");
            expect(comparison(modal)).toEqual(["2025-05-26", "2025-06-23"]);
        });
    });

    describe("Scenario: editing a comparison date", () => {
        it("switches the mode to custom", async () => {
            const modal = await openModal(await render());
            await setField(modal, "compare", true);
            await setField(modal, "compare-from", "2026-04-20");
            expect(field(modal, "compare-mode")!.value).toBe("custom");
        });

        it("keeps a custom comparison when the range changes", async () => {
            const modal = await openModal(await render());
            await setField(modal, "compare", true);
            await setField(modal, "compare-from", "2026-04-20");
            await setField(modal, "to", "2026-06-24");
            expect(field(modal, "compare-from")!.value).toBe("2026-04-20");
        });
    });

    describe("Scenario: saving a comparison", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await render();
            events = recordEvents(el, "change");
            const modal = await openModal(el);
            await setField(modal, "compare", true);
            button(modal, "Save").click();
            await expect.poll(() => events.length).toBe(1);
        });

        it("raises change with the comparison", () => {
            expect((events[0] as CustomEvent).detail.compare).toEqual({
                mode: "previous-period",
                from: "2026-04-25",
                to: "2026-05-24",
            });
        });
    });

    describe("Scenario: switching Compare off again", () => {
        let events: Event[];
        beforeEach(async () => {
            const compare = { mode: "previous-period", from: "2026-04-25", to: "2026-05-24" };
            const el = await render(html`<uax-date-range .value=${value} .compare=${compare}></uax-date-range>`);
            events = recordEvents(el, "change");
            const modal = await openModal(el);
            await setField(modal, "compare", false);
            button(modal, "Save").click();
            await expect.poll(() => events.length).toBe(1);
        });

        it("raises change with no comparison", () => {
            expect((events[0] as CustomEvent).detail.compare).toBeUndefined();
        });
    });

    describe("Scenario: a saved comparison", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await render(
                html`<uax-date-range .value=${value} .compare=${{ mode: "previous-period", from: "2026-04-25", to: "2026-05-24" }}></uax-date-range>`,
            );
        });

        it("shows a Compare to line on the button", () => {
            expect(shadow(el).textContent).toContain("Compare to: Apr 25, 2026 to May 24, 2026");
        });

        it("opens with Compare on", async () => {
            expect(field(await openModal(el), "compare")!.checked).toBe(true);
        });
    });

    describe("Scenario: comparing isn't allowed", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            modal = await openModal(await render(html`<uax-date-range .value=${value} .allowCompare=${false}></uax-date-range>`));
        });

        it("has no Compare switch", () => {
            expect(field(modal, "compare")).toBe(null);
        });
    });

    describe("Scenario (sad path): custom comparison ending before it starts", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            modal = await openModal(await render());
            await setField(modal, "compare", true);
            await setField(modal, "compare-mode", "custom");
            await setField(modal, "compare-from", "2026-04-20");
            await setField(modal, "compare-to", "2026-04-01");
        });

        it("disables Save", () => {
            expect(button(modal, "Save").disabled).toBe(true);
        });

        it("says the end date must be on or after the start date", () => {
            expect(errorFor(modal, "compare-to")).toBe("The end date must be on or after the start date.");
        });
    });

    describe("Scenario (sad path): custom comparison after the latest allowed date", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            modal = await openModal(await render(html`<uax-date-range .value=${value} max-date="2026-06-23"></uax-date-range>`));
            await setField(modal, "compare", true);
            await setField(modal, "compare-from", "2026-06-24");
        });

        it("says the date can't be after the latest allowed date", () => {
            expect(errorFor(modal, "compare-from")).toBe("The date can't be after Jun 23, 2026.");
        });

        it("disables Save", () => {
            expect(button(modal, "Save").disabled).toBe(true);
        });
    });

    describe("Scenario (sad path): a comparison date left empty", () => {
        it("disables Save", async () => {
            const modal = await openModal(await render());
            await setField(modal, "compare", true);
            await setField(modal, "compare-from", "");
            expect(button(modal, "Save").disabled).toBe(true);
        });
    });

    describe("Scenario: Compare off ignores the comparison fields", () => {
        it("keeps Save enabled", async () => {
            const modal = await openModal(await render());
            expect(button(modal, "Save").disabled).toBe(false);
        });
    });

    describe("Scenario: accessibility with a custom comparison", () => {
        async function audit(themeCss: string | undefined) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const el = await render(
                    html`<div style="background: var(--uui-color-surface); padding: 8px">
                        <uax-date-range .value=${value}></uax-date-range>
                    </div>`,
                );
                const modal = await openModal(el);
                await setField(modal, "compare", true);
                await setField(modal, "compare-mode", "custom");
                return await axeRun(modal);
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
