// BDG-1 — Change badge matches the design
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, shadow, type UanTestElement } from "../internal/test/pending.js";
import "./delta-badge.element.js";

const pill = (el: Element) => shadow(el).querySelector(".badge") as HTMLElement;
const bg = (el: Element) => getComputedStyle(pill(el)).backgroundColor;
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
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-delta-badge .value=${12.4}></uan-delta-badge>`, "uan-delta-badge");
        });

        it.skip("sits on the positive tint", () => {
            expect(bg(el)).toBe(tint(el, "--uan-tint-positive"));
        });
    });

    describe("Scenario: negative change", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-delta-badge .value=${-3}></uan-delta-badge>`, "uan-delta-badge");
        });

        it.skip("sits on the danger tint", () => {
            expect(bg(el)).toBe(tint(el, "--uan-tint-negative"));
        });
    });

    describe("Scenario: change that rounds to zero", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-delta-badge .value=${0.02} max-decimals="1"></uan-delta-badge>`, "uan-delta-badge");
        });

        it.skip("sits on the neutral tint", () => {
            expect(bg(el)).toBe(tint(el, "--uan-tint-neutral"));
        });
    });

    describe("Scenario: lower is better", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-delta-badge .value=${-1.2} unit="points" lower-is-better></uan-delta-badge>`,
                "uan-delta-badge",
            );
        });

        it.skip("shows a fall on the positive tint", () => {
            expect(bg(el)).toBe(tint(el, "--uan-tint-positive"));
        });
    });

    describe("Scenario: small size", () => {
        let md: UanTestElement;
        let sm: UanTestElement;
        beforeEach(async () => {
            md = await renderElement(html`<uan-delta-badge .value=${5}></uan-delta-badge>`, "uan-delta-badge");
            sm = await renderElement(html`<uan-delta-badge .value=${5} size="sm"></uan-delta-badge>`, "uan-delta-badge");
        });

        it.skip("uses a smaller font than the default size", () => {
            expect(parseFloat(getComputedStyle(pill(sm)).fontSize)).toBeLessThan(parseFloat(getComputedStyle(pill(md)).fontSize));
        });
    });

    describe("Scenario: culture-aware number", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            // Arrange: backoffice culture da-DK (via the localization context, not document.lang)
            el = await renderElement(html`<uan-delta-badge .value=${12.4}></uan-delta-badge>`, "uan-delta-badge");
        });

        it.skip("uses the culture's decimal separator", () => {
            expect(shadow(el).textContent).toContain("+12,4%");
        });
    });
});
