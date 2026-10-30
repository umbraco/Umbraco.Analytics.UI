// GRP-1 — Day / Week / Month switch
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { userEvent } from "vitest/browser";
import { nextEvent, renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";

const option = (el: Element, label: string) =>
    [...shadow(el).querySelectorAll("[role='radio']")].find((o) => o.textContent?.trim() === label) as HTMLElement;

describe("Feature: Day / Week / Month switch", () => {
    describe("Scenario: showing the current value", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-group-by value="week"></uan-group-by>`, "uan-group-by");
        });

        it.skip("checks Week", () => {
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

        it.skip("raises change with the new value", () => {
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

        it.skip("raises change with the next value", () => {
            expect(detail).toEqual({ value: "week" });
        });
    });

    describe("Scenario: limited options", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-group-by value="day" .options=${["day", "week"]}></uan-group-by>`, "uan-group-by");
        });

        it.skip("shows only Day and Week", () => {
            expect([...shadow(el).querySelectorAll("[role='radio']")].map((o) => o.textContent?.trim())).toEqual(["Day", "Week"]);
        });
    });
});
