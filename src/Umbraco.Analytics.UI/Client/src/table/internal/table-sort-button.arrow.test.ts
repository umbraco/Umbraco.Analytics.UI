// The sorted column's arrow sits level with its label: the middle of the visible chevron at the middle of the label's
// capitals, ascending or descending, at any font size.
import { describe, expect, it } from "vitest";
import "#platform/uui";
import { html } from "#platform/lit";
import { renderElement, settle, shadow } from "../../internal/test/dom.js";
import "./table-sort-button.element.js";

/** How far the visible chevron's middle is below the middle of the label's capitals, in px (negative: above). */
const chevronOffset = async (fontSize: number, descending: boolean) => {
    // Away from the top-left corner, where the test browser's pointer rests: hovering spreads the chevrons apart.
    const el = await renderElement(
        html`<div style="margin: 200px 0 0 300px; width: 240px; font-size: ${fontSize}px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase">
            <uaui-table-sort-button active ?descending=${descending}>Unique members</uaui-table-sort-button>
        </div>`,
        "div",
    );
    const button = el.querySelector("uaui-table-sort-button")!;
    await settle(button);
    const symbol = shadow(button).querySelector("uui-symbol-sort")!;
    // Let the symbol's opacity and margin transitions finish.
    await new Promise((resolve) => setTimeout(resolve, 400));

    const text = [...button.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const line = range.getBoundingClientRect();
    const style = getComputedStyle(button);
    const context = document.createElement("canvas").getContext("2d")!;
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const capital = context.measureText("H");
    const capsMiddle = line.top + capital.fontBoundingBoxAscent - capital.actualBoundingBoxAscent / 2;

    const visible = [...shadow(symbol).querySelectorAll("svg")].find((svg) => getComputedStyle(svg).opacity === "1")!;
    const chevron = visible.querySelector("path")!.getBoundingClientRect();
    el.remove();
    return (chevron.top + chevron.bottom) / 2 - capsMiddle;
};

describe("Feature: sort arrow alignment", () => {
    for (const fontSize of [11, 13, 15]) {
        describe(`Scenario: a sorted ${fontSize}px header`, () => {
            it("draws the ascending arrow level with the label's capitals", async () => {
                expect(Math.abs(await chevronOffset(fontSize, false))).toBeLessThanOrEqual(1);
            });

            it("draws the descending arrow level with the label's capitals", async () => {
                expect(Math.abs(await chevronOffset(fontSize, true))).toBeLessThanOrEqual(1);
            });

            it("draws both directions at the same height", async () => {
                expect(Math.abs((await chevronOffset(fontSize, false)) - (await chevronOffset(fontSize, true)))).toBeLessThanOrEqual(0.25);
            });
        });
    }
});
