// BDG-1 — Change badge matches the design
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";
import "./delta-badge.element.js";

const pill = (el: Element) => shadow(el).querySelector(".badge") as HTMLElement;
const bg = (el: Element) => getComputedStyle(pill(el)).backgroundColor;
// Tints are color-mix()/light-dark() strings, so resolve one through a probe's computed background.
const tint = (el: Element, name: string) => {
    const probe = document.createElement("span");
    probe.style.background = `var(${name})`;
    shadow(el).appendChild(probe);
    const value = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return value;
};

describe("Feature: change badge matches the design", () => {
    describe("Scenario: positive change", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-delta-badge .value=${12.4}></uax-delta-badge>`, "uax-delta-badge");
        });

        it("sits on the positive tint", () => {
            expect(bg(el)).toBe(tint(el, "--_uax-tint-positive"));
        });
    });

    describe("Scenario: negative change", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-delta-badge .value=${-3}></uax-delta-badge>`, "uax-delta-badge");
        });

        it("sits on the danger tint", () => {
            expect(bg(el)).toBe(tint(el, "--_uax-tint-negative"));
        });
    });

    describe("Scenario: change that rounds to zero", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-delta-badge .value=${0.02} max-decimals="1"></uax-delta-badge>`, "uax-delta-badge");
        });

        it("sits on the neutral tint", () => {
            expect(bg(el)).toBe(tint(el, "--_uax-tint-neutral"));
        });
    });

    describe("Scenario: lower is better", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-delta-badge .value=${-1.2} unit="points" lower-is-better></uax-delta-badge>`,
                "uax-delta-badge",
            );
        });

        it("shows a fall on the positive tint", () => {
            expect(bg(el)).toBe(tint(el, "--_uax-tint-positive"));
        });
    });

    describe("Scenario: small size", () => {
        let md: UaxTestElement;
        let sm: UaxTestElement;
        beforeEach(async () => {
            md = await renderElement(html`<uax-delta-badge .value=${5}></uax-delta-badge>`, "uax-delta-badge");
            sm = await renderElement(html`<uax-delta-badge .value=${5} size="sm"></uax-delta-badge>`, "uax-delta-badge");
        });

        it("uses a smaller font than the default size", () => {
            expect(parseFloat(getComputedStyle(pill(sm)).fontSize)).toBeLessThan(parseFloat(getComputedStyle(pill(md)).fontSize));
        });
    });

    describe("Scenario: culture-aware number", () => {
        let el: UaxTestElement;
        const previousLanguage = umbLocalizationManager.documentLanguage;
        beforeEach(async () => {
            // The backoffice sets the formatting language from the user's language, not the <html> lang.
            umbLocalizationManager.documentLanguage = "da-DK";
            el = await renderElement(html`<uax-delta-badge .value=${12.4}></uax-delta-badge>`, "uax-delta-badge");
        });
        afterEach(() => {
            umbLocalizationManager.documentLanguage = previousLanguage;
        });

        it("formats the percent the way the culture does", () => {
            // da-DK puts a decimal comma and a (narrow) no-break space before the percent sign
            expect(shadow(el).textContent).toMatch(/\+12,4[\s\u00a0\u202f]?%/);
        });
    });
});
