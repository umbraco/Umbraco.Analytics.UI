// TBL-10 — A figure with its label and change badge: stacked in a column toolbar, or inline in a box header
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import type { UauiDeltaBadgeElement } from "../delta-badge/delta-badge.element.js";
import "./stat.element.js";

const badge = (el: Element) => shadow(el).querySelector("uaui-delta-badge") as UauiDeltaBadgeElement | null;
const text = (el: Element, selector: string) => shadow(el).querySelector(selector)?.textContent?.trim();

describe("Feature: a stat, stacked for the column toolbar or inline for a box header", () => {
    describe("Scenario: label and value", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-stat label="Total pageviews" value="1,272"></uaui-stat>`, "uaui-stat");
        });

        it("shows the label", () => {
            expect(text(el, ".label")).toBe("Total pageviews");
        });

        it("shows the value exactly as given", () => {
            expect(text(el, ".value")).toBe("1,272");
        });

        it("draws the value in bold", () => {
            expect(getComputedStyle(shadow(el).querySelector(".value")!).fontWeight).toBe("700");
        });

        it("draws the label in capitals", () => {
            expect(getComputedStyle(shadow(el).querySelector(".label")!).textTransform).toBe("uppercase");
        });

        it("puts the label above the value", () => {
            const label = shadow(el).querySelector(".label")!.getBoundingClientRect();
            const value = shadow(el).querySelector(".value")!.getBoundingClientRect();
            expect(label.bottom).toBeLessThanOrEqual(value.top);
        });

        it("is stacked by default and reflects it", () => {
            expect((el as unknown as { layout: string }).layout).toBe("stacked");
            expect(el.getAttribute("layout")).toBe("stacked");
        });
    });

    describe("Scenario: inline, for a box header", () => {
        const rect = (el: Element, selector: string) => shadow(el).querySelector(selector)!.getBoundingClientRect();
        const sameLine = (a: DOMRect, b: DOMRect) => a.top < b.bottom && b.top < a.bottom;

        async function inline(width = "auto") {
            const host = render(
                html`<div style="width: ${width}">
                    <uaui-stat layout="inline" label="Overall" value="3.8%" .current=${3.8} .previous=${3.6} delta-unit="points"></uaui-stat>
                </div>`,
            ).container.querySelector("div")!;
            const el = host.querySelector("uaui-stat")!;
            await settle(el);
            await settle(badge(el)!);
            return el;
        }

        it("reflects the layout to the attribute", async () => {
            const el = await inline();
            expect(el.getAttribute("layout")).toBe("inline");
        });

        it("puts the label, value and badge on one line, in that order", async () => {
            const el = await inline();
            const label = rect(el, ".label");
            const value = rect(el, ".value");
            const change = badge(el)!.getBoundingClientRect();
            expect(sameLine(label, value)).toBe(true);
            expect(sameLine(value, change)).toBe(true);
            expect(label.right).toBeLessThanOrEqual(value.left);
            expect(value.right).toBeLessThanOrEqual(change.left);
        });

        it("is no taller than its tallest part", async () => {
            const el = await inline();
            const tallest = Math.max(rect(el, ".label").height, rect(el, ".value").height, badge(el)!.getBoundingClientRect().height);
            expect(el.getBoundingClientRect().height).toBeLessThanOrEqual(Math.ceil(tallest) + 1);
        });

        it("stays on one line in a narrow space", async () => {
            const el = await inline("60px");
            const label = rect(el, ".label");
            const value = rect(el, ".value");
            expect(sameLine(label, value)).toBe(true);
            expect(sameLine(value, badge(el)!.getBoundingClientRect())).toBe(true);
        });

        it("lines the label and value up on their baseline", async () => {
            const el = await inline();
            // Different font sizes on one baseline: the larger value starts higher and both end near the same line.
            const label = rect(el, ".label");
            const value = rect(el, ".value");
            expect(value.height).toBeGreaterThan(label.height);
            expect(value.top).toBeLessThan(label.top);
        });

        it("draws the label muted and not in capitals, and the value bold", async () => {
            const el = await inline();
            const label = getComputedStyle(shadow(el).querySelector(".label")!);
            expect(label.textTransform).toBe("none");
            expect(label.fontWeight).toBe("400");
            expect(getComputedStyle(shadow(el).querySelector(".value")!).fontWeight).toBe("700");
        });

        it("still shows the change badge", async () => {
            const el = await inline();
            expect(shadow(badge(el)!).textContent).toContain("0.2");
        });
    });

    describe("Scenario: with a delta", () => {
        it("shows a small change badge for the delta", async () => {
            const el = await renderElement(html`<uaui-stat label="Sessions" value="52" .delta=${-3.2}></uaui-stat>`, "uaui-stat");
            expect(badge(el)?.value).toBe(-3.2);
        });

        it("makes the badge small", async () => {
            const el = await renderElement(html`<uaui-stat label="Sessions" value="52" .delta=${1}></uaui-stat>`, "uaui-stat");
            expect(badge(el)?.size).toBe("sm");
        });

        it("shows the delta, not the numbers, when both are given", async () => {
            const el = await renderElement(
                html`<uaui-stat label="Sessions" value="52" .delta=${5} .current=${150} .previous=${120}></uaui-stat>`,
                "uaui-stat",
            );
            expect(badge(el)?.value).toBe(5);
        });
    });

    describe("Scenario: with current and previous", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-stat label="Sessions" value="150" .current=${150} .previous=${120}></uaui-stat>`,
                "uaui-stat",
            );
            await settle(el);
        });

        it("shows a badge", () => {
            expect(badge(el)).not.toBeNull();
        });

        it("works out the percent change", () => {
            expect(shadow(badge(el)!).textContent).toContain("25%");
        });
    });

    describe("Scenario: in points", () => {
        it("works out the change in percentage points", async () => {
            const el = await renderElement(
                html`<uaui-stat label="Rate" value="62%" .current=${62} .previous=${60} delta-unit="points"></uaui-stat>`,
                "uaui-stat",
            );
            await settle(el);
            expect(shadow(badge(el)!).textContent).toBe("▲+2 pp, improvement");
        });

        it("shows a badge even when previous is 0", async () => {
            const el = await renderElement(
                html`<uaui-stat label="Rate" value="5%" .current=${5} .previous=${0} delta-unit="points"></uaui-stat>`,
                "uaui-stat",
            );
            expect(badge(el)).not.toBeNull();
        });
    });

    describe("Scenario (sad path): nothing to compare with", () => {
        it("shows no badge without numbers", async () => {
            const el = await renderElement(html`<uaui-stat label="Sessions" value="52"></uaui-stat>`, "uaui-stat");
            expect(badge(el)).toBeNull();
        });

        it("shows no badge with only current", async () => {
            const el = await renderElement(html`<uaui-stat label="Sessions" value="52" .current=${52}></uaui-stat>`, "uaui-stat");
            expect(badge(el)).toBeNull();
        });

        it("shows no badge when previous is 0 for a percent change", async () => {
            const el = await renderElement(
                html`<uaui-stat label="Sessions" value="52" .current=${52} .previous=${0}></uaui-stat>`,
                "uaui-stat",
            );
            expect(badge(el)).toBeNull();
        });

        it("shows no badge for a delta that is not a number", async () => {
            const el = await renderElement(html`<uaui-stat label="Sessions" value="52" .delta=${NaN}></uaui-stat>`, "uaui-stat");
            expect(badge(el)).toBeNull();
        });

        it("shows no value when there is none", async () => {
            const el = await renderElement(html`<uaui-stat label="Sessions"></uaui-stat>`, "uaui-stat");
            expect(shadow(el).querySelector(".value")).toBeNull();
        });
    });

    describe("Scenario: lower is better", () => {
        it("reflects lower-is-better to the attribute, like uaui-kpi-tile", async () => {
            const el = await renderElement(html`<uaui-stat label="Bounce" value="1" .lowerIsBetter=${true}></uaui-stat>`, "uaui-stat");
            expect(el.hasAttribute("lower-is-better")).toBe(true);
        });

        it("passes it to the badge", async () => {
            const el = await renderElement(
                html`<uaui-stat label="Bounce" value="1" .delta=${-4} .lowerIsBetter=${true}></uaui-stat>`,
                "uaui-stat",
            );
            expect(badge(el)?.lowerIsBetter).toBe(true);
        });
    });

    describe("Scenario: in an end-aligned cell", () => {
        it("ends on the right", async () => {
            const host = render(
                html`<div style="text-align: end; width: 300px">
                    <uaui-stat label="Sessions" value="52" .delta=${1}></uaui-stat>
                </div>`,
            ).container.querySelector("div")!;
            const el = host.querySelector("uaui-stat")!;
            await settle(el);
            const right = (node: Element) => node.getBoundingClientRect().right;
            expect(Math.round(right(badge(el)!))).toBe(Math.round(right(host)));
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
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); padding: 8px; width: 320px">
                        <uaui-stat label="Total pageviews" value="272" .current=${272} .previous=${251}></uaui-stat>
                        <uaui-stat label="Total sessions" value="52" .delta=${-3.2}></uaui-stat>
                        <uaui-stat layout="inline" label="Overall" value="3.8%" .current=${3.8} .previous=${3.6} delta-unit="points"></uaui-stat>
                        <uaui-stat layout="inline" label="Refund rate" value="2.1%" .delta=${0.4} delta-unit="points" lower-is-better></uaui-stat>
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

        it("passes the a11y audit in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });
    });
});
