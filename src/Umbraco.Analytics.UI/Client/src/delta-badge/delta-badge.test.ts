import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
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

    it("passes the a11y audit", async () => {
        expect(await axeRun(element)).toHaveNoViolations();
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
});
