/// <reference types="vite/client" />
// DR-5 - A fixed "today" for the date range
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import { renderWithModals } from "../internal/test/modal-host.js";
import { deepQuery, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./date-range.element.js";
import "./date-range-modal.element.js";

const openModal = async (el: UauiTestElement) => {
    (shadow(el).querySelector("uui-button") as HTMLElement).click();
    await expect.poll(() => deepQuery<UauiTestElement>(document, "uaui-date-range-modal")).not.toBe(null);
    const modal = deepQuery<UauiTestElement>(document, "uaui-date-range-modal")!;
    await modal.updateComplete;
    return modal;
};
const field = (modal: Element, name: string) => deepQuery<HTMLInputElement & { max: string }>(shadow(modal), `[name='${name}']`)!;
const setField = async (modal: UauiTestElement, name: string, v: string) => {
    const input = field(modal, name);
    input.value = v;
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await settle(modal);
};
const clockToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

describe("Feature: a fixed today for the date range", () => {
    const previousLanguage = umbLocalizationManager.documentLanguage;
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
    });
    afterEach(() => {
        umbLocalizationManager.documentLanguage = previousLanguage;
    });

    describe("Scenario: choosing a preset with today set", () => {
        let modal: UauiTestElement;
        beforeEach(async () => {
            const el = await renderWithModals(html`<uaui-date-range today="2026-06-23"></uaui-date-range>`, "uaui-date-range");
            modal = await openModal(el);
            await setField(modal, "preset", "last-7-days");
        });

        it("counts back from the set day", () => {
            expect(field(modal, "from").value).toBe("2026-06-17");
        });

        it("ends on the set day", () => {
            expect(field(modal, "to").value).toBe("2026-06-23");
        });

        it("stops the date fields at the set day", () => {
            expect(field(modal, "to").max).toBe("2026-06-23");
        });
    });

    describe("Scenario: no value given", () => {
        it("defaults to the last 30 days as of the set day", async () => {
            const el = await renderWithModals(html`<uaui-date-range today="2026-06-23"></uaui-date-range>`, "uaui-date-range");
            expect(shadow(el).textContent).toContain("May 25, 2026 to Jun 23, 2026");
        });

        it("follows the set day when it changes", async () => {
            const el = (await renderWithModals(html`<uaui-date-range today="2026-06-23"></uaui-date-range>`, "uaui-date-range")) as UauiTestElement & { today: string };
            el.today = "2026-07-01";
            await el.updateComplete;
            expect(shadow(el).textContent).toContain("Jun 2, 2026 to Jul 1, 2026");
        });
    });

    describe("Scenario: a value given", () => {
        it("keeps the value when today is set", async () => {
            const el = await renderWithModals(
                html`<uaui-date-range today="2026-06-23" .value=${{ from: "2026-01-01", to: "2026-01-31" }}></uaui-date-range>`,
                "uaui-date-range",
            );
            expect(shadow(el).textContent).toContain("Jan 1, 2026 to Jan 31, 2026");
        });
    });

    describe("Scenario: max-date with today set", () => {
        it("wins over the set day for the latest date the dialog accepts", async () => {
            const el = await renderWithModals(html`<uaui-date-range today="2026-06-23" max-date="2026-06-30"></uaui-date-range>`, "uaui-date-range");
            const modal = await openModal(el);
            expect(field(modal, "to").max).toBe("2026-06-30");
        });
    });

    describe("Scenario (sad path): today is not a real date", () => {
        it("uses the clock instead", async () => {
            const el = await renderWithModals(html`<uaui-date-range today="soon"></uaui-date-range>`, "uaui-date-range");
            const modal = await openModal(el);
            expect(field(modal, "to").max).toBe(clockToday());
        });
    });
});
