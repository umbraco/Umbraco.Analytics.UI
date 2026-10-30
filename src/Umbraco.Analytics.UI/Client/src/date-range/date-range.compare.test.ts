// DR-2 — Pick a comparison range
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import "./date-range.element.js";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";

const value = { from: "2026-05-25", to: "2026-06-23" };

const openModal = async (el: UaxTestElement) => {
    (shadow(el).querySelector("uui-button, button") as HTMLElement).click();
    await el.updateComplete;
    return document.querySelector<HTMLElement>("uax-date-range-modal") as UaxTestElement;
};
const field = (modal: Element, name: string) => shadow(modal).querySelector(`[name='${name}']`) as HTMLInputElement | null;
const setField = async (modal: UaxTestElement, name: string, v: string | boolean) => {
    const input = field(modal, name)!;
    if (typeof v === "boolean") input.checked = v;
    else input.value = v;
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await modal.updateComplete;
};

describe("Feature: pick a comparison range", () => {
    describe("Scenario: no comparison yet", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            const el = await renderElement(html`<uax-date-range .value=${value}></uax-date-range>`, "uax-date-range");
            modal = await openModal(el);
        });

        it.skip("has Compare switched off", () => {
            expect(field(modal, "compare")!.checked).toBe(false);
        });
    });

    describe("Scenario: comparing with the previous period", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            const el = await renderElement(html`<uax-date-range .value=${value}></uax-date-range>`, "uax-date-range");
            modal = await openModal(el);
            await setField(modal, "compare", true);
            await setField(modal, "compare-mode", "previous-period");
        });

        it.skip("fills the comparison dates with 25 Apr–24 May 2026", () => {
            expect([field(modal, "compare-from")!.value, field(modal, "compare-to")!.value]).toEqual(["2026-04-25", "2026-05-24"]);
        });
    });

    describe("Scenario: a saved comparison", () => {
        let el: UaxTestElement;
        const previousLanguage = umbLocalizationManager.documentLanguage;
        beforeEach(async () => {
            umbLocalizationManager.documentLanguage = "en-US";
            el = await renderElement(
                html`<uax-date-range .value=${value} .compare=${{ mode: "previous-period", from: "2026-04-25", to: "2026-05-24" }}></uax-date-range>`,
                "uax-date-range",
            );
        });

        afterEach(() => {
            umbLocalizationManager.documentLanguage = previousLanguage;
        });

        it("shows a Compare to line on the button", () => {
            expect(shadow(el).textContent).toContain("Compare to: Apr 25, 2026 to May 24, 2026");
        });
    });

    describe("Scenario: comparing isn't allowed", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            const el = await renderElement(html`<uax-date-range .value=${value} .allowCompare=${false}></uax-date-range>`, "uax-date-range");
            modal = await openModal(el);
        });

        it.skip("has no Compare switch", () => {
            expect(field(modal, "compare")).toBe(null);
        });
    });

    describe("Scenario (sad path): custom comparison ending before it starts", () => {
        let modal: UaxTestElement;
        beforeEach(async () => {
            const el = await renderElement(html`<uax-date-range .value=${value}></uax-date-range>`, "uax-date-range");
            modal = await openModal(el);
            await setField(modal, "compare", true);
            await setField(modal, "compare-mode", "custom");
            await setField(modal, "compare-from", "2026-04-20");
            await setField(modal, "compare-to", "2026-04-01");
        });

        it.skip("disables Save", () => {
            const save = [...shadow(modal).querySelectorAll("uui-button")].find((b) => b.getAttribute("label") === "Save") as HTMLElement & { disabled: boolean };
            expect(save.disabled).toBe(true);
        });
    });
});
