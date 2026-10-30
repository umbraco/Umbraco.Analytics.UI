/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import "./delta-badge.element.js";
import type { UanDeltaBadgeElement } from "./delta-badge.element.js";

describe("UanDeltaBadgeElement", () => {
    let element: UanDeltaBadgeElement;

    beforeEach(async () => {
        element = render(html`<uan-delta-badge .value=${12.4}></uan-delta-badge>`).container.querySelector(
            "uan-delta-badge",
        )!;
        await element.updateComplete;
    });

    // Renders every sentiment on the surface, optionally under a real UUI theme stylesheet, and audits it.
    async function auditAllSentiments(themeCss?: string) {
        const theme = document.createElement("style");
        if (themeCss) {
            theme.textContent = themeCss;
            document.head.appendChild(theme);
        }
        try {
            const host = render(
                html`<div style="background: var(--uui-color-surface); padding: 8px">
                    <uan-delta-badge .value=${12.4}></uan-delta-badge>
                    <uan-delta-badge .value=${-3}></uan-delta-badge>
                    <uan-delta-badge .value=${0}></uan-delta-badge>
                </div>`,
            ).container.querySelector("div")!;
            await Promise.all([...host.querySelectorAll("uan-delta-badge")].map((b) => b.updateComplete));
            return await axeRun(host);
        } finally {
            theme.remove();
        }
    }

    it("passes the a11y audit in the light theme, for every sentiment", async () => {
        expect(await auditAllSentiments()).toHaveNoViolations();
    });

    it("passes the a11y audit in the dark theme, for every sentiment", async () => {
        expect(await auditAllSentiments(darkCss)).toHaveNoViolations();
    });

    it("passes the a11y audit in the high contrast theme, for every sentiment", async () => {
        expect(await auditAllSentiments(highContrastCss)).toHaveNoViolations();
    });

    it("shows a signed percent change", () => {
        expect(element.shadowRoot!.textContent).toContain("+12.4%");
    });

    it("renders nothing without a value", async () => {
        element.value = undefined;
        await element.updateComplete;
        expect(element.shadowRoot!.querySelector(".badge")).toBe(null);
    });

    describe("direction and sentiment", () => {
        it("treats a rise as positive", () => {
            expect(element.direction).toBe("up");
            expect(element.sentiment).toBe("positive");
        });

        it("treats a fall as negative", async () => {
            element.value = -3;
            await element.updateComplete;
            expect(element.direction).toBe("down");
            expect(element.sentiment).toBe("negative");
        });

        it("flips sentiment when lower is better", async () => {
            element.value = -1.2;
            element.lowerIsBetter = true;
            await element.updateComplete;
            expect(element.sentiment).toBe("positive");
        });

        it("treats a change that rounds to zero as flat", async () => {
            element.value = 0.02;
            await element.updateComplete;
            expect(element.direction).toBe("flat");
            expect(element.sentiment).toBe("neutral");
        });
    });

    it("shows percentage points", async () => {
        element.value = -1.2;
        element.unit = "points";
        await element.updateComplete;
        expect(element.shadowRoot!.textContent).toContain("-1.2 pp");
    });

    it("says in text that a fall is an improvement when lower is better", async () => {
        element.value = -1.2;
        element.unit = "points";
        element.lowerIsBetter = true;
        await element.updateComplete;
        expect(element.shadowRoot!.querySelector(".visually-hidden")!.textContent).toContain("improvement");
    });
});
