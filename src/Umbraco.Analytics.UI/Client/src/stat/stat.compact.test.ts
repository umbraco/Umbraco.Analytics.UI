// T69 — A big number value is shown compact, with the exact amount for hover and screen readers
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { renderElement, settle, shadow } from "../internal/test/dom.js";
import "./stat.element.js";

const EUR: Intl.NumberFormatOptions = { style: "currency", currency: "EUR" };
const DKK: Intl.NumberFormatOptions = { style: "currency", currency: "DKK" };
const clean = (text: string | null | undefined) => text?.replace(/\s/g, " ");
const value = (el: Element) => shadow(el).querySelector(".value");
// What uaui-figure-value draws.
const inner = (el: Element) => shadow(value(el)!.querySelector("uaui-figure-value")!);
const shown = (el: Element) => inner(el).querySelector("[aria-hidden=true]");
const visible = (el: Element) => clean(shown(el)?.textContent ?? inner(el).textContent);
const exact = (el: Element) => clean(inner(el).querySelector(".visually-hidden")?.textContent);
const title = (el: Element) => clean(shown(el)?.getAttribute("title"));

describe("Feature: a stat shows a big number compact", () => {
    describe("Scenario: the threshold", () => {
        it("keeps 999,999 exact, with no title and no hidden text", async () => {
            const el = await renderElement(html`<uaui-stat lang="en-US" label="Revenue" .value=${999_999} .valueFormat=${EUR}></uaui-stat>`, "uaui-stat");
            expect(visible(el)).toBe("€999,999.00");
            expect(title(el)).toBeUndefined();
            expect(exact(el)).toBeUndefined();
        });

        it("compacts 1,000,000", async () => {
            const el = await renderElement(html`<uaui-stat lang="en-US" label="Revenue" .value=${1_000_000} .valueFormat=${EUR}></uaui-stat>`, "uaui-stat");
            expect(visible(el)).toBe("€1M");
        });

        it("compacts a negative number by its size", async () => {
            const el = await renderElement(html`<uaui-stat lang="en-US" label="Revenue" .value=${-1_200_000} .valueFormat=${EUR}></uaui-stat>`, "uaui-stat");
            expect(visible(el)).toBe("-€1.2M");
            expect(exact(el)).toBe("-€1,200,000.00");
        });
    });

    describe("Scenario: languages", () => {
        it("compacts in English with the exact amount as title and hidden text", async () => {
            const el = await renderElement(html`<uaui-stat lang="en-US" label="Revenue" .value=${1_234_567} .valueFormat=${EUR}></uaui-stat>`, "uaui-stat");
            expect(visible(el)).toBe("€1.23M");
            expect(title(el)).toBe("€1,234,567.00");
            expect(exact(el)).toBe("€1,234,567.00");
        });

        it("compacts in Danish", async () => {
            const el = await renderElement(html`<uaui-stat lang="da-DK" label="Revenue" .value=${12_345_678} .valueFormat=${DKK}></uaui-stat>`, "uaui-stat");
            expect(visible(el)).toBe("12,3 mio. kr.");
            expect(title(el)).toBe("12.345.678,00 kr.");
        });
    });

    describe("Scenario: what screen readers get", () => {
        it("hides the compact text and leaves the exact amount readable", async () => {
            const el = await renderElement(html`<uaui-stat lang="en-US" label="Revenue" .value=${1_234_567} .valueFormat=${EUR}></uaui-stat>`, "uaui-stat");
            expect(shown(el)?.textContent).toBe("€1.23M");
            expect(inner(el).querySelector(".visually-hidden")?.getAttribute("aria-hidden")).toBeNull();
            expect(value(el)?.hasAttribute("title")).toBe(false);
        });
    });

    describe("Scenario: the product's options", () => {
        it("keeps the exact amount with notation standard", async () => {
            const el = await renderElement(
                html`<uaui-stat lang="en-US" label="Revenue" .value=${1_234_567} .valueFormat=${{ ...EUR, notation: "standard" }}></uaui-stat>`,
                "uaui-stat",
            );
            expect(visible(el)).toBe("€1,234,567.00");
            expect(title(el)).toBeUndefined();
        });

        it("respects the product's own notation", async () => {
            const el = await renderElement(
                html`<uaui-stat lang="en-US" label="Revenue" .value=${1_234_567} .valueFormat=${{ notation: "compact", compactDisplay: "long" }}></uaui-stat>`,
                "uaui-stat",
            );
            expect(visible(el)).toBe("1.2 million");
        });

        it("ignores the product's fraction digits in the compact form", async () => {
            const el = await renderElement(
                html`<uaui-stat lang="en-US" label="Revenue" .value=${1_234_567.891} .valueFormat=${{ ...EUR, maximumFractionDigits: 2 }}></uaui-stat>`,
                "uaui-stat",
            );
            expect(visible(el)).toBe("€1.23M");
            expect(exact(el)).toBe("€1,234,567.89");
        });
    });

    describe("Scenario: a string value", () => {
        it("is never changed", async () => {
            const el = await renderElement(html`<uaui-stat lang="en-US" label="Revenue" value="1234567"></uaui-stat>`, "uaui-stat");
            expect(visible(el)).toBe("1234567");
            expect(title(el)).toBeUndefined();
        });
    });

    describe("Scenario: the badge is unaffected", () => {
        it("keeps the change badge beside a compact value", async () => {
            const el = await renderElement(html`<uaui-stat lang="en-US" label="Revenue" .value=${1_234_567} .previous=${1_000_000}></uaui-stat>`, "uaui-stat");
            await settle(shadow(el).querySelector("uaui-delta-badge") as HTMLElement);
            expect(shadow(shadow(el).querySelector("uaui-delta-badge")!).textContent).toContain("23.5%");
        });
    });

    describe("Scenario: accessibility", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); padding: 8px; display: grid; gap: 8px; width: 320px">
                        <uaui-stat label="Revenue"  .value=${1_234_567} .valueFormat=${EUR} .previous=${1_075_000}></uaui-stat>
                        <uaui-stat label="Spend"  .value=${12_345_678} .valueFormat=${DKK}></uaui-stat>
                    </div>`,
                ).container.querySelector("div")!;
                await Promise.all([...host.querySelectorAll("uaui-stat")].map((tile) => settle(tile)));
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        it("passes the a11y audit in the light theme", async () => {
            expect(await audit()).toHaveNoViolations();
        });

        it("passes the a11y audit in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });
    });
});
