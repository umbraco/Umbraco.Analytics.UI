// T66 — A stat formats a number value in the user's culture, and shows a string as given
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepText, renderElement, settle, shadow } from "../internal/test/dom.js";
import type { UauiDeltaBadgeElement } from "../delta-badge/delta-badge.element.js";
import type { UauiStatElement } from "./stat.element.js";
import "./stat.element.js";

const EUR: Intl.NumberFormatOptions = { style: "currency", currency: "EUR" };
// Intl puts no-break spaces in some cultures' currency formats.
const value = (el: Element) => {
    const node = shadow(el).querySelector(".value");
    return node ? deepText(node).replace(/\s/g, " ") : undefined;
};
const badge = (el: Element) => shadow(el).querySelector("uaui-delta-badge") as UauiDeltaBadgeElement | null;

describe("Feature: a stat formats its own number", () => {
    describe("Scenario: a number value", () => {
        it("formats it in the user's culture", async () => {
            const en = await renderElement(html`<uaui-stat lang="en-US" label="Orders" .value=${4837}></uaui-stat>`, "uaui-stat");
            const da = await renderElement(html`<uaui-stat lang="da-DK" label="Orders" .value=${4837}></uaui-stat>`, "uaui-stat");
            expect(value(en)).toBe("4,837");
            expect(value(da)).toBe("4.837");
        });

        it("formats it with the currency from valueFormat", async () => {
            const en = await renderElement(html`<uaui-stat lang="en-US" label="Revenue" .value=${4837.4} .valueFormat=${EUR}></uaui-stat>`, "uaui-stat");
            const da = await renderElement(
                html`<uaui-stat lang="da-DK" label="Revenue" .value=${4837.4} .valueFormat=${{ style: "currency", currency: "DKK" }}></uaui-stat>`,
                "uaui-stat",
            );
            expect(value(en)).toBe("€4,837.40");
            expect(value(da)).toBe("4.837,40 kr.");
        });

        it("reads valueFormat from the value-format attribute", async () => {
            const el = await renderElement(
                html`<uaui-stat lang="en-US" label="Rate" .value=${0.256} value-format='{"style":"percent","maximumFractionDigits":1}'></uaui-stat>`,
                "uaui-stat",
            );
            expect(value(el)).toBe("25.6%");
        });

        it("formats it with a unit from valueFormat", async () => {
            const el = await renderElement(
                html`<uaui-stat lang="en-US" label="Time saved" .value=${12.5} .valueFormat=${{ style: "unit", unit: "hour", unitDisplay: "long" }}></uaui-stat>`,
                "uaui-stat",
            );
            expect(value(el)).toBe("12.5 hours");
        });

        it("shows 0 as a value", async () => {
            const el = await renderElement(html`<uaui-stat lang="en-US" label="Revenue" .value=${0} .valueFormat=${EUR}></uaui-stat>`, "uaui-stat");
            expect(value(el)).toBe("€0.00");
        });

        it("follows a change of valueFormat", async () => {
            const el = (await renderElement(html`<uaui-stat lang="en-US" label="Revenue" .value=${5} .valueFormat=${EUR}></uaui-stat>`, "uaui-stat")) as unknown as UauiStatElement;
            el.valueFormat = { style: "currency", currency: "USD" };
            await settle(el);
            expect(value(el)).toBe("$5.00");
        });

        it("follows a change of language", async () => {
            const el = await renderElement(html`<uaui-stat lang="en-US" label="Orders" .value=${4837.5}></uaui-stat>`, "uaui-stat");
            el.lang = "da-DK";
            await expect.poll(() => value(el)).toBe("4.837,5");
        });
    });

    describe("Scenario: a string value", () => {
        it("shows it exactly as given, whatever valueFormat says", async () => {
            const el = await renderElement(html`<uaui-stat lang="da-DK" label="Revenue" value="€ 4,837.40" .valueFormat=${EUR}></uaui-stat>`, "uaui-stat");
            expect(value(el)).toBe("€ 4,837.40");
        });

        it("keeps a number in the attribute as text", async () => {
            const el = await renderElement(html`<uaui-stat lang="da-DK" label="Orders" value="1234.5"></uaui-stat>`, "uaui-stat");
            expect(value(el)).toBe("1234.5");
        });
    });

    describe("Scenario (sad path): a number that isn't finite", () => {
        it("shows no value for NaN", async () => {
            const el = await renderElement(html`<uaui-stat label="Orders" .value=${Number.NaN}></uaui-stat>`, "uaui-stat");
            expect(shadow(el).querySelector(".value")).toBeNull();
        });

        it("shows no value for Infinity", async () => {
            const el = await renderElement(html`<uaui-stat label="Orders" .value=${Number.POSITIVE_INFINITY}></uaui-stat>`, "uaui-stat");
            expect(shadow(el).querySelector(".value")).toBeNull();
        });
    });

    describe("Scenario (sad path): a bad currency code", () => {
        it("falls back to the default format without throwing", async () => {
            const el = await renderElement(
                html`<uaui-stat lang="en-US" label="Revenue" .value=${4837.4} .valueFormat=${{ style: "currency", currency: "EURO" }}></uaui-stat>`,
                "uaui-stat",
            );
            expect(value(el)).toBe("4,837.4");
        });
    });

    describe("Scenario: the badge uses a number value as the current period", () => {
        it("works out the change from value and previous", async () => {
            const el = await renderElement(html`<uaui-stat label="Orders" .value=${150} .previous=${120}></uaui-stat>`, "uaui-stat");
            await settle(badge(el)!);
            expect(badge(el)?.current).toBe(150);
            expect(shadow(badge(el)!).textContent).toContain("25%");
        });

        it("prefers current when it is set", async () => {
            const el = await renderElement(html`<uaui-stat label="Orders" .value=${150} .current=${132} .previous=${120}></uaui-stat>`, "uaui-stat");
            expect(badge(el)?.current).toBe(132);
        });

        it("lets delta win", async () => {
            const el = await renderElement(html`<uaui-stat label="Orders" .value=${150} .previous=${120} .delta=${3}></uaui-stat>`, "uaui-stat");
            expect(badge(el)?.value).toBe(3);
        });

        it("scales a percent value and previous to points: 0.256 against 0.24 is +1.6 pp", async () => {
            const el = await renderElement(
                html`<uaui-stat lang="en-US" label="Rate" .value=${0.256} .previous=${0.24} .valueFormat=${{ style: "percent", maximumFractionDigits: 1 }} delta-unit="points"></uaui-stat>`,
                "uaui-stat",
            );
            await settle(badge(el)!);
            expect(shadow(badge(el)!).textContent).toContain("+1.6 pp");
        });

        it("doesn't scale a set current and previous, which are in percent units", async () => {
            const el = await renderElement(
                html`<uaui-stat lang="en-US" label="Rate" .value=${0.256} .current=${25.6} .previous=${24} .valueFormat=${{ style: "percent" }} delta-unit="points"></uaui-stat>`,
                "uaui-stat",
            );
            await settle(badge(el)!);
            expect(shadow(badge(el)!).textContent).toContain("+1.6 pp");
        });

        it("does not use a string value", async () => {
            const el = await renderElement(html`<uaui-stat label="Orders" value="150" .previous=${120}></uaui-stat>`, "uaui-stat");
            expect(badge(el)).toBeNull();
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
                        <uaui-stat label="Revenue" .value=${4837.4} .valueFormat=${EUR} .previous=${4075}></uaui-stat>
                        <uaui-stat label="Conversion" .value=${0.256} .valueFormat=${{ style: "percent", maximumFractionDigits: 1 }}></uaui-stat>
                    </div>`,
                ).container.querySelector("div")!;
                await Promise.all([...host.querySelectorAll("uaui-stat")].map((stat) => settle(stat)));
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
