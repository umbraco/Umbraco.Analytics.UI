// BDG-1 — Change badge matches the design
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { html } from "#platform/lit";
import { renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";
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
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-delta-badge .value=${12.4}></uaui-delta-badge>`, "uaui-delta-badge");
        });

        it("sits on the positive tint", () => {
            expect(bg(el)).toBe(tint(el, "--uaui-color-tint-positive"));
        });
    });

    describe("Scenario: negative change", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-delta-badge .value=${-3}></uaui-delta-badge>`, "uaui-delta-badge");
        });

        it("sits on the danger tint", () => {
            expect(bg(el)).toBe(tint(el, "--uaui-color-tint-negative"));
        });
    });

    describe("Scenario: change that rounds to zero", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-delta-badge .value=${0.02} max-decimals="1"></uaui-delta-badge>`, "uaui-delta-badge");
        });

        it("sits on the neutral tint", () => {
            expect(bg(el)).toBe(tint(el, "--uaui-color-tint-neutral"));
        });
    });

    describe("Scenario: lower is better", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-delta-badge .value=${-1.2} unit="points" lower-is-better></uaui-delta-badge>`,
                "uaui-delta-badge",
            );
        });

        it("shows a fall on the positive tint", () => {
            expect(bg(el)).toBe(tint(el, "--uaui-color-tint-positive"));
        });
    });

    describe("Scenario: small size", () => {
        let md: UauiTestElement;
        let sm: UauiTestElement;
        beforeEach(async () => {
            md = await renderElement(html`<uaui-delta-badge .value=${5}></uaui-delta-badge>`, "uaui-delta-badge");
            sm = await renderElement(html`<uaui-delta-badge .value=${5} size="sm"></uaui-delta-badge>`, "uaui-delta-badge");
        });

        it("uses a smaller font than the default size", () => {
            expect(parseFloat(getComputedStyle(pill(sm)).fontSize)).toBeLessThan(parseFloat(getComputedStyle(pill(md)).fontSize));
        });
    });

    describe("Scenario: culture-aware number", () => {
        let el: UauiTestElement;
        const previousLanguage = document.documentElement.lang;
        beforeEach(async () => {
            // Formatting follows the page language (<html lang>), so pin it.
            document.documentElement.lang = "da-DK";
            el = await renderElement(html`<uaui-delta-badge .value=${12.4}></uaui-delta-badge>`, "uaui-delta-badge");
        });
        afterEach(() => {
            document.documentElement.lang = previousLanguage;
        });

        it("formats the percent the way the culture does", () => {
            // da-DK puts a decimal comma and a (narrow) no-break space before the percent sign
            expect(shadow(el).textContent).toMatch(/\+12,4[\s\u00a0\u202f]?%/);
        });
    });
});
