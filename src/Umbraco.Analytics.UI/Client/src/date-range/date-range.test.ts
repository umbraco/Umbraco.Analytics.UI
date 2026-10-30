// DR-1 — Pick a date range
// The modal opens through UMB_MODAL_MANAGER_CONTEXT. Arrange a host that provides it, following
// umbraco-backoffice-testing's "Backoffice element tests" (T13).
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { recordEvents, renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";

const value = { from: "2026-05-25", to: "2026-06-23" };

const openModal = async (el: UanTestElement) => {
    (shadow(el).querySelector("uui-button, button") as HTMLElement).click();
    await el.updateComplete;
    return document.querySelector("uan-date-range-modal") as UanTestElement;
};
const field = (modal: Element, name: string) => shadow(modal).querySelector(`[name='${name}']`) as HTMLInputElement;
const setField = async (modal: UanTestElement, name: string, v: string) => {
    const input = field(modal, name);
    input.value = v;
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await modal.updateComplete;
};
const button = (modal: Element, label: string) =>
    [...shadow(modal).querySelectorAll("uui-button")].find((b) => b.getAttribute("label") === label) as HTMLElement & { disabled: boolean };

describe("Feature: pick a date range", () => {
    describe("Scenario: the button", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-date-range .value=${value}></uan-date-range>`, "uan-date-range");
        });

        it.skip("shows the range in the backoffice culture", () => {
            expect(shadow(el).textContent).toContain("May 25, 2026 to Jun 23, 2026");
        });
    });

    describe("Scenario: clicking the button", () => {
        let modal: UanTestElement | null;
        beforeEach(async () => {
            const el = await renderElement(html`<uan-date-range .value=${value}></uan-date-range>`, "uan-date-range");
            modal = await openModal(el);
        });

        it.skip("opens uan-date-range-modal", () => {
            expect(modal).not.toBe(null);
        });
    });

    describe("Scenario: choosing a preset", () => {
        let modal: UanTestElement;
        beforeEach(async () => {
            const el = await renderElement(html`<uan-date-range .value=${value}></uan-date-range>`, "uan-date-range");
            modal = await openModal(el);
            await setField(modal, "preset", "last-30-days");
        });

        it.skip("fills the start date with 29 days before today", () => {
            const expected = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
            expect(field(modal, "from").value).toBe(expected);
        });
    });

    describe("Scenario: editing a date after choosing a preset", () => {
        let modal: UanTestElement;
        beforeEach(async () => {
            const el = await renderElement(html`<uan-date-range .value=${{ ...value, preset: "last-30-days" }}></uan-date-range>`, "uan-date-range");
            modal = await openModal(el);
            await setField(modal, "from", "2026-05-20");
        });

        it.skip("switches the preset to Custom", () => {
            expect(field(modal, "preset").value).toBe("custom");
        });
    });

    describe("Scenario: saving", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderElement(html`<uan-date-range .value=${value}></uan-date-range>`, "uan-date-range");
            events = recordEvents(el, "change");
            const modal = await openModal(el);
            await setField(modal, "from", "2026-06-01");
            button(modal, "Save").click();
            await el.updateComplete;
        });

        it.skip("raises change with the new value", () => {
            expect((events[0] as CustomEvent).detail.value).toEqual({ from: "2026-06-01", to: "2026-06-23", preset: "custom" });
        });
    });

    describe("Scenario (sad path): closing without saving", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderElement(html`<uan-date-range .value=${value}></uan-date-range>`, "uan-date-range");
            events = recordEvents(el, "change");
            const modal = await openModal(el);
            await setField(modal, "from", "2026-06-01");
            button(modal, "Close").click();
            await el.updateComplete;
        });

        it.skip("raises no change event", () => {
            expect(events).toHaveLength(0);
        });
    });

    describe("Scenario (sad path): end date before start date", () => {
        let modal: UanTestElement;
        beforeEach(async () => {
            const el = await renderElement(html`<uan-date-range .value=${value}></uan-date-range>`, "uan-date-range");
            modal = await openModal(el);
            await setField(modal, "to", "2026-05-01");
        });

        it.skip("disables Save", () => {
            expect(button(modal, "Save").disabled).toBe(true);
        });

        it.skip("shows an error under the end date", () => {
            expect(shadow(modal).querySelector("[part~='error'][data-for='to']")).not.toBe(null);
        });
    });
});
