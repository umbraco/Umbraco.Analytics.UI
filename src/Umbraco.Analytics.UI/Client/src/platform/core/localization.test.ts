// SAC-6 AC1–AC2 · SAC-7 AC1–AC5 · SAC-8 AC1–AC5 — standalone core package.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UauiLitElement } from "#platform/base-element";
import { customElement, html } from "#platform/lit";
import "#platform/uui";
import { renderElement, shadow, type UauiTestElement } from "../../internal/test/dom.js";
import "../../empty-state/empty-state.element.js";
import "../../error-state/error-state.element.js";
import "../../stat/stat.element.js";
import { resetUauiTranslations } from "../../internal/test/localization.js";
import { registerUauiTranslations } from "./public.js";

@customElement("uaui-localize-probe")
class ProbeElement extends UauiLitElement {}

const HEADLINE = "uauiAnalytics_emptyHeadline";
const headline = (el: Element) => shadow(el).querySelector(".headline")?.textContent;
const statValue = (el: Element) => shadow(el).querySelector("uaui-figure-value")?.shadowRoot?.textContent?.replace(/\s/g, " ").trim();
const htmlLang = document.documentElement.getAttribute("lang");

afterEach(() => {
    resetUauiTranslations();
    if (htmlLang === null) document.documentElement.removeAttribute("lang");
    else document.documentElement.setAttribute("lang", htmlLang);
});

describe("Feature: English out of the box", () => {
    describe("Scenario: Our own keys show English", () => {
        it("it shows the package's English headline", async () => {
            const el = await renderElement(html`<uaui-empty-state></uaui-empty-state>`, "uaui-empty-state");
            expect(headline(el)).toBe("No data yet");
        });
    });
    describe("Scenario: The reused Umbraco words show English", () => {
        it('the button reads "Retry"', async () => {
            const el = await renderElement(html`<uaui-error-state retryable></uaui-error-state>`, "uaui-error-state");
            expect(shadow(el).querySelector("uui-button")?.getAttribute("label")).toBe("Retry");
        });
    });
});

describe("Feature: The host adds its own text", () => {
    describe("Scenario: A registered culture's text shows", () => {
        it('it shows "Ingen data"', async () => {
            registerUauiTranslations("da", { [HEADLINE]: "Ingen data" });
            const el = await renderElement(html`<uaui-empty-state lang="da"></uaui-empty-state>`, "uaui-empty-state");
            expect(headline(el)).toBe("Ingen data");
        });
    });
    describe("Scenario: Registering overrides our English", () => {
        it('it shows "Nothing yet"', async () => {
            registerUauiTranslations("en", { [HEADLINE]: "Nothing yet" });
            const el = await renderElement(html`<uaui-empty-state lang="en"></uaui-empty-state>`, "uaui-empty-state");
            expect(headline(el)).toBe("Nothing yet");
        });
    });
    describe("Scenario: Elements already on the page update", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-empty-state lang="da"></uaui-empty-state>`, "uaui-empty-state");
            registerUauiTranslations("da", { [HEADLINE]: "Ingen data" });
            await el.updateComplete;
        });

        it("the element shows the Danish text", () => {
            expect(headline(el)).toBe("Ingen data");
        });
    });
    describe("Sad path", () => {
        describe("Scenario: A missing key falls back to the language", () => {
            it('it shows the "da" text', async () => {
                registerUauiTranslations("da", { [HEADLINE]: "Ingen data" });
                registerUauiTranslations("da-DK", {});
                const el = await renderElement(html`<uaui-empty-state lang="da-DK"></uaui-empty-state>`, "uaui-empty-state");
                expect(headline(el)).toBe("Ingen data");
            });
        });
        describe("Scenario: A key missing everywhere falls back to English", () => {
            it("it shows the English text", async () => {
                registerUauiTranslations("da", { uauiAnalytics_emptyDescription: "Prøv en bredere periode." });
                const el = await renderElement(html`<uaui-empty-state lang="da"></uaui-empty-state>`, "uaui-empty-state");
                expect(headline(el)).toBe("No data yet");
            });
        });
    });
});

describe("Feature: The culture follows `lang`", () => {
    describe("Scenario: The element's own lang wins", () => {
        it('the value reads "1.234,5"', async () => {
            document.documentElement.setAttribute("lang", "en");
            const el = await renderElement(html`<uaui-stat lang="da-DK" label="Orders" .value=${1234.5}></uaui-stat>`, "uaui-stat");
            expect(statValue(el)).toBe("1.234,5");
        });
    });
    describe("Scenario: The nearest parent's lang is used", () => {
        it('the value reads "1.234,5"', async () => {
            const el = await renderElement(
                html`<div lang="da-DK"><uaui-stat label="Orders" .value=${1234.5}></uaui-stat></div>`,
                "uaui-stat",
            );
            expect(statValue(el)).toBe("1.234,5");
        });
    });
    describe("Scenario: The lang is on a parent outside a shadow root", () => {
        it('the value reads "1.234,5"', async () => {
            const host = document.createElement("div");
            host.setAttribute("lang", "da-DK");
            document.body.append(host);
            const stat = document.createElement("uaui-stat");
            stat.setAttribute("label", "Orders");
            stat.value = 1234.5;
            host.attachShadow({ mode: "open" }).append(stat);
            await stat.updateComplete;
            expect(statValue(stat)).toBe("1.234,5");
            host.remove();
        });
    });
    describe("Scenario: <html lang> is used when nothing nearer sets it", () => {
        it('the value reads "1.234,5"', async () => {
            document.documentElement.setAttribute("lang", "da-DK");
            const el = await renderElement(html`<uaui-stat label="Orders" .value=${1234.5}></uaui-stat>`, "uaui-stat");
            expect(statValue(el)).toBe("1.234,5");
        });
    });
    describe("Scenario: Changing <html lang> re-renders", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            document.documentElement.setAttribute("lang", "en-US");
            el = await renderElement(html`<uaui-stat label="Orders" .value=${1234.5}></uaui-stat>`, "uaui-stat");
            document.documentElement.setAttribute("lang", "da-DK");
            await new Promise((resolve) => setTimeout(resolve));
            await el.updateComplete;
        });

        it('the value reads "1.234,5"', () => {
            expect(statValue(el)).toBe("1.234,5");
        });
    });
    describe("Sad path", () => {
        describe("Scenario: No lang anywhere means English", () => {
            it('the value reads "1,234.5"', async () => {
                document.documentElement.removeAttribute("lang");
                const el = await renderElement(html`<uaui-stat label="Orders" .value=${1234.5}></uaui-stat>`, "uaui-stat");
                expect(statValue(el)).toBe("1,234.5");
            });
        });
    });
});

describe("Feature: term follows the backoffice's rules", () => {
    let probe: ProbeElement;
    beforeEach(() => {
        probe = new ProbeElement();
        registerUauiTranslations("en", {
            probe_braces: "{0} of {1}",
            probe_percents: "%1% then %0%",
            probe_function: (count: unknown) => `${count} items`,
        });
    });

    it("fills {0}-style placeholders", () => {
        expect(probe.localize.term("probe_braces", 2, 5)).toBe("2 of 5");
    });

    it("fills %0%-style placeholders", () => {
        expect(probe.localize.term("probe_percents", "a", "b")).toBe("b then a");
    });

    it("leaves a placeholder with no argument as written", () => {
        expect(probe.localize.term("probe_braces", 2)).toBe("2 of {1}");
    });

    it("calls a function-valued entry with the arguments", () => {
        expect(probe.localize.term("probe_function", 3)).toBe("3 items");
    });

    it("returns the key when nothing has it", () => {
        expect(probe.localize.term("probe_missing")).toBe("probe_missing");
    });

    it("returns an empty string for a number that isn't one", () => {
        expect(probe.localize.number("abc")).toBe("");
    });
});
