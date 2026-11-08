/// <reference types="vite/client" />
// HRS-8 — Today and Yesterday presets.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "#platform/lit";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import { uauiCompareFor, uauiPresetRange } from "../date-helpers/index.js";
import { renderWithModals } from "../internal/test/modal-host.js";
import { deepQuery, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./date-range.element.js";

const openModal = async (el: UauiTestElement) => {
    (shadow(el).querySelector("uui-button") as HTMLElement).click();
    await expect.poll(() => deepQuery<UauiTestElement>(document, "uaui-date-range-dialog")).not.toBe(null);
    const modal = deepQuery<UauiTestElement>(document, "uaui-date-range-dialog")!;
    await modal.updateComplete;
    return modal;
};
const field = (modal: Element, name: string) => deepQuery<HTMLInputElement>(shadow(modal), `[name='${name}']`)!;
const setField = async (modal: UauiTestElement, name: string, v: string) => {
    const input = field(modal, name);
    input.value = v;
    input.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
    await settle(modal);
};
const presetNames = (modal: Element) => (field(modal, "preset") as unknown as { options: { name: string }[] }).options.map((o) => o.name);
const withPresets = [{ id: "today" }, { id: "yesterday" }, { id: "last-7-days" }, { id: "custom" }];

describe("Feature: Today and Yesterday presets", () => {
    const previousLanguage = umbLocalizationManager.documentLanguage;
    beforeEach(() => {
        umbLocalizationManager.documentLanguage = "en-US";
    });
    afterEach(() => {
        umbLocalizationManager.documentLanguage = previousLanguage;
    });

    describe("Scenario: the dates of each preset", () => {
        it("gives today as a one-day range", () => {
            expect(uauiPresetRange("today", "2026-11-05")).toEqual({ from: "2026-11-05", to: "2026-11-05" });
        });

        it("gives yesterday as a one-day range", () => {
            expect(uauiPresetRange("yesterday", "2026-11-05")).toEqual({ from: "2026-11-04", to: "2026-11-04" });
        });

        it("compares today with yesterday as the previous period", () => {
            expect(uauiCompareFor("previous-period", { from: "2026-11-05", to: "2026-11-05" })).toMatchObject({ from: "2026-11-04", to: "2026-11-04" });
        });
    });

    describe("Scenario: a product adds both presets", () => {
        let modal: UauiTestElement;
        beforeEach(async () => {
            const el = await renderWithModals(html`<uaui-date-range today="2026-11-05" .presets=${withPresets}></uaui-date-range>`, "uaui-date-range");
            modal = await openModal(el);
        });

        it("labels them Today and Yesterday", () => {
            expect(presetNames(modal).slice(0, 2)).toEqual(["Today", "Yesterday"]);
        });

        it("sets both date fields to today when Today is picked", async () => {
            await setField(modal, "preset", "today");
            expect([field(modal, "from").value, field(modal, "to").value]).toEqual(["2026-11-05", "2026-11-05"]);
        });
    });

    describe("Scenario: sad path", () => {
        it("leaves them out of the default list", async () => {
            const el = await renderWithModals(html`<uaui-date-range today="2026-11-05"></uaui-date-range>`, "uaui-date-range");
            const modal = await openModal(el);
            expect(presetNames(modal).filter((n) => n === "Today" || n === "Yesterday")).toEqual([]);
        });

        it("gives yesterday across a month boundary", () => {
            expect(uauiPresetRange("yesterday", "2026-12-01")).toEqual({ from: "2026-11-30", to: "2026-11-30" });
        });
    });
});
