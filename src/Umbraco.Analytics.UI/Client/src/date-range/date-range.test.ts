/// <reference types="vite/client" />
// DR-1 — Pick a date range
// The modal opens through UMB_MODAL_MANAGER_CONTEXT. Every spec renders under uax-test-modal-host, which
// provides the modal manager and the backoffice's real modal container.
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

const openModal = async (el: UaxTestElement) => {
    (shadow(el).querySelector("uui-button") as HTMLElement).click();
    await expect.poll(() => queryDeep("uax-date-range-modal")).not.toBe(null);
    const modal = queryDeep("uax-date-range-modal")!;
    await modal.updateComplete;
    return modal;
};
const field = (modal: Element, name: string) => shadow(modal).querySelector(`[name='${name}']`) as HTMLInputElement;
const setField = async (modal: UaxTestElement, name: string, v: string) => {
    const input = field(modal, name);
    input.value = v;
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await modal.updateComplete;
};
const button = (modal: Element, label: string) =>
    [...shadow(modal).querySelectorAll("uui-button")].find((b) => b.getAttribute("label") === label) as HTMLElement & {
        disabled: boolean;
    };
/** Today in the browser's timezone, `days` from now, as an ISO date. */
const isoDaysFromToday = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

describe("Feature: pick a date range", () => {
    // The backoffice sets the formatting language from the user's language, so pin it rather than use the browser's.
    const previousLanguage = umbLocalizationManager.documentLanguage;
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
    });
    afterEach(() => {
        umbLocalizationManager.documentLanguage = previousLanguage;
    });

    describe("Scenario: the button", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderWithModals(html`<uax-date-range .value=${value}></uax-date-range>`, "uax-date-range");
        });

        it("shows the range in the backoffice culture", () => {
            expect(shadow(el).textContent).toContain("May 25, 2026 to Jun 23, 2026");
        });
    });

    describe("Scenario: the button in another culture", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            umbLocalizationManager.documentLanguage = "da-DK";
            el = await renderWithModals(html`<uax-date-range .value=${value}></uax-date-range>`, "uax-date-range");
        });

        it("formats the dates the way that culture does", () => {
            expect(shadow(el).textContent).toContain("25. maj 2026");
        });
    });

    describe("Scenario: clicking the button", () => {
        let modal: UaxTestElement | null;
        beforeEach(async () => {
            const el = await renderWithModals(html`<uax-date-range .value=${value}></uax-date-range>`, "uax-date-range");
            modal = await openModal(el);
        });

        it("opens uax-date-range-modal", () => {
            expect(modal).not.toBe(null);
        });
    });

    describe("Scenario: choosing a preset", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            const el = await renderWithModals(html`<uax-date-range .value=${value}></uax-date-range>`, "uax-date-range");
            modal = await openModal(el);
            await setField(modal, "preset", "last-30-days");
        });

        it("fills the start date with 29 days before today", () => {
            expect(field(modal, "from").value).toBe(isoDaysFromToday(-29));
        });

        it("fills the end date with today", () => {
            expect(field(modal, "to").value).toBe(isoDaysFromToday(0));
        });
    });

    describe("Scenario: editing a date after choosing a preset", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            const el = await renderWithModals(
                html`<uax-date-range .value=${{ ...value, preset: "last-30-days" }}></uax-date-range>`,
                "uax-date-range",
            );
            modal = await openModal(el);
            await setField(modal, "from", "2026-05-20");
        });

        it("switches the preset to Custom", () => {
            expect(field(modal, "preset").value).toBe("custom");
        });
    });

    describe("Scenario: saving", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderWithModals(html`<uax-date-range .value=${value}></uax-date-range>`, "uax-date-range");
            events = recordEvents(el, "change");
            const modal = await openModal(el);
            await setField(modal, "from", "2026-06-01");
            button(modal, "Save").click();
            await expect.poll(() => events.length).toBe(1);
        });

        it("raises change with the new value", () => {
            expect((events[0] as CustomEvent).detail.value).toEqual({
                from: "2026-06-01",
                to: "2026-06-23",
                preset: "custom",
            });
        });
    });

    describe("Scenario: opening the dialog", () => {
        const bound = { from: "2026-05-25", to: "2026-06-23" };
        beforeEach(async () => {
            const el = await renderWithModals(html`<uax-date-range .value=${bound}></uax-date-range>`, "uax-date-range");
            await openModal(el);
        });

        it("leaves the product's value object unfrozen", () => {
            expect(Object.isFrozen(bound)).toBe(false);
        });
    });

    describe("Scenario: the change event", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderWithModals(html`<uax-date-range .value=${value}></uax-date-range>`, "uax-date-range");
            events = recordEvents(el, "change");
            const modal = await openModal(el);
            await setField(modal, "from", "2026-06-01");
            button(modal, "Save").click();
            await expect.poll(() => events.length).toBe(1);
        });

        it("bubbles but is not composed, like UUI's change", () => {
            expect([events[0].bubbles, events[0].composed]).toEqual([true, false]);
        });
    });

    describe("Scenario (sad path): closing without saving", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderWithModals(html`<uax-date-range .value=${value}></uax-date-range>`, "uax-date-range");
            events = recordEvents(el, "change");
            const modal = await openModal(el);
            await setField(modal, "from", "2026-06-01");
            button(modal, "Close").click();
            // The dialog is gone once the modal manager has dropped it.
            await expect.poll(() => queryDeep("uax-date-range-modal")).toBe(null);
        });

        it("raises no change event", () => {
            expect(events).toHaveLength(0);
        });
    });

    describe("Scenario (sad path): end date before start date", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            const el = await renderWithModals(html`<uax-date-range .value=${value}></uax-date-range>`, "uax-date-range");
            modal = await openModal(el);
            await setField(modal, "to", "2026-05-01");
        });

        it("disables Save", () => {
            expect(button(modal, "Save").disabled).toBe(true);
        });

        it("shows an error under the end date", () => {
            expect(shadow(modal).querySelector(".error[data-for='to']")?.textContent).toContain(
                "The end date must be on or after the start date.",
            );
        });
    });

    describe("Scenario (sad path): a date after the latest allowed date", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            const el = await renderWithModals(
                html`<uax-date-range .value=${value} max-date="2026-06-30"></uax-date-range>`,
                "uax-date-range",
            );
            modal = await openModal(el);
            await setField(modal, "to", "2026-07-02");
        });

        it("disables Save", () => {
            expect(button(modal, "Save").disabled).toBe(true);
        });

        it("names the latest allowed date under the field", () => {
            expect(shadow(modal).querySelector(".error[data-for='to']")?.textContent).toContain(
                "The date can't be after Jun 30, 2026.",
            );
        });
    });

    describe("Scenario (sad path): opening with an invalid range", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            const el = await renderWithModals(
                html`<uax-date-range .value=${{ from: "2026-06-23", to: "2026-05-25" }}></uax-date-range>`,
                "uax-date-range",
            );
            modal = await openModal(el);
        });

        it("focuses the first field, since Save is disabled", async () => {
            await expect.poll(() => shadow(modal).activeElement?.getAttribute("name")).toBe("preset");
        });
    });

    describe("Scenario: accessibility", () => {
        // Audits the button, then the open dialog, under a real UUI theme stylesheet.
        async function audit(themeCss: string | undefined, target: "button" | "dialog") {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const el = await renderWithModals(
                    html`<div style="background: var(--uui-color-surface); padding: 8px">
                        <uax-date-range
                            .value=${value}
                            .compare=${{ mode: "previous-period", from: "2026-04-25", to: "2026-05-24" }}></uax-date-range>
                    </div>`,
                    "uax-date-range",
                );
                if (target === "button") return await axeRun(el);
                return await axeRun(await openModal(el));
            } finally {
                theme.remove();
            }
        }

        it("has no axe violations on the button in the light theme", async () => {
            expect(await audit(undefined, "button")).toHaveNoViolations();
        });

        it("has no axe violations on the button in the dark theme", async () => {
            expect(await audit(darkCss, "button")).toHaveNoViolations();
        });

        it("has no axe violations on the button in the high contrast theme", async () => {
            expect(await audit(highContrastCss, "button")).toHaveNoViolations();
        });

        it("has no axe violations on the open dialog in the light theme", async () => {
            expect(await audit(undefined, "dialog")).toHaveNoViolations();
        });

        it("has no axe violations on the open dialog in the dark theme", async () => {
            expect(await audit(darkCss, "dialog")).toHaveNoViolations();
        });

        it("has no axe violations on the open dialog in the high contrast theme", async () => {
            expect(await audit(highContrastCss, "dialog")).toHaveNoViolations();
        });
    });
});
