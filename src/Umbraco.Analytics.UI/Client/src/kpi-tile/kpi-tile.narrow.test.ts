// T67 — KPI tiles don't overflow when narrow
/// <reference types="vite/client" />
import { beforeAll, describe, expect, it } from "vitest";
import latoBold from "../../node_modules/@umbraco-ui/uui/dist/assets/fonts/LatoLatin-Bold.woff2?url";
import latoRegular from "../../node_modules/@umbraco-ui/uui/dist/assets/fonts/LatoLatin-Regular.woff2?url";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import "./kpi-tile.element.js";
import "../stat/stat.element.js";
import type { UauiKpiTileElement } from "./kpi-tile.element.js";
import { deepText, settle } from "../internal/test/dom.js";

const EUR: Intl.NumberFormatOptions = { style: "currency", currency: "EUR" };

// The backoffice's own font, Lato (the files UUI ships), loaded here because the test page has no theme: the test browser's
// default (Times) is narrower and would hide the overflow, so the widths below are the real ones.
beforeAll(async () => {
    for (const [weight, url] of [["400", latoRegular], ["700", latoBold]] as const) {
        document.fonts.add(await new FontFace("Lato", `url(${url})`, { weight }).load());
    }
});


// Renders one tile in a column of the given width, with a currency value as long as the Commerce example's.
async function tileIn(width: number, attrs: { text?: number; loading?: boolean; selectable?: boolean; href?: string; dir?: string } = {}) {
    const { container } = render(
        html`<div style="width: ${width}px; font-family: Lato, sans-serif" dir=${attrs.dir ?? "ltr"}>
            <uaui-kpi-tile
                label="Revenue"
                icon="icon-coins"
                .value=${attrs.loading ? undefined : (attrs.text ?? 27337.11)}
                .valueFormat=${EUR}
                .delta=${attrs.loading ? undefined : 18.7}
                .loading=${attrs.loading ?? false}
                .selectable=${attrs.selectable ?? false}
                href=${attrs.href ?? ""}></uaui-kpi-tile>
        </div>`,
    );
    const el = container.querySelector("uaui-kpi-tile") as UauiKpiTileElement;
    await settle(el);
    return el;
}

const tile = (el: Element) => el.shadowRoot!.querySelector(".tile") as HTMLElement;
const icon = (el: Element) => el.shadowRoot!.querySelector(".icon") as HTMLElement;
const value = (el: Element) => el.shadowRoot!.querySelector(".value") as HTMLElement;
// Where the text itself is drawn: the value's box can be narrower than its nowrap text, so measure the text.
function textRect(el: Element): DOMRect {
    const range = document.createRange();
    range.selectNodeContents(value(el));
    return range.getBoundingClientRect();
}
// The tile's inner edge: the text must stay inside the padding, not just inside the border.
const innerRight = (el: Element) => tile(el).getBoundingClientRect().right - parseFloat(getComputedStyle(tile(el)).paddingRight);
const innerLeft = (el: Element) => tile(el).getBoundingClientRect().left + parseFloat(getComputedStyle(tile(el)).paddingLeft);
const stacked = (el: Element) => getComputedStyle(tile(el)).flexDirection === "column";

describe("Feature: KPI tiles don't overflow when narrow", () => {
    describe("Scenario: the narrowest grid column (220px)", () => {
        it("keeps a long currency value inside the tile", async () => {
            const el = await tileIn(220);
            const v = textRect(el);
            expect(v.right).toBeLessThanOrEqual(innerRight(el) + 0.5);
            expect(v.left).toBeGreaterThanOrEqual(innerLeft(el) - 0.5);
        });

        it("doesn't truncate the value", async () => {
            const el = await tileIn(220);
            expect(textRect(el).width).toBeLessThanOrEqual(value(el).getBoundingClientRect().width + 1);
            expect(deepText(value(el))).toContain("27,337.11");
        });

        it("keeps the icon", async () => {
            const el = await tileIn(220);
            expect(icon(el).getBoundingClientRect().width).toBe(48);
        });

        it("keeps a value inside the tile in a selectable tile", async () => {
            const el = await tileIn(220, { selectable: true });
            expect(textRect(el).right).toBeLessThanOrEqual(innerRight(el) + 0.5);
        });

        it("keeps a value inside the tile in a link tile", async () => {
            const el = await tileIn(220, { href: "#x" });
            expect(textRect(el).right).toBeLessThanOrEqual(innerRight(el) + 0.5);
        });

        it("keeps a value inside the tile in right-to-left", async () => {
            const el = await tileIn(220, { dir: "rtl" });
            const v = textRect(el);
            expect(v.left).toBeGreaterThanOrEqual(innerLeft(el) - 0.5);
            expect(v.right).toBeLessThanOrEqual(innerRight(el) + 0.5);
        });
    });

    describe("Scenario: stacking", () => {
        it("stacks the icon above the text below 240px", async () => {
            const el = await tileIn(239);
            expect(stacked(el)).toBe(true);
            expect(icon(el).getBoundingClientRect().bottom).toBeLessThanOrEqual(value(el).getBoundingClientRect().top);
        });

        it("puts the icon beside the text from 240px", async () => {
            const el = await tileIn(240);
            expect(stacked(el)).toBe(false);
            expect(icon(el).getBoundingClientRect().right).toBeLessThanOrEqual(value(el).getBoundingClientRect().left);
        });

        it("fits a six-digit value beside the icon at 240px", async () => {
            const el = await tileIn(240, { text: 127337.11 });
            expect(textRect(el).right).toBeLessThanOrEqual(innerRight(el) + 0.5);
        });

        it("aligns the icon with the start edge when stacked, in right-to-left too", async () => {
            const el = await tileIn(220, { dir: "rtl" });
            expect(icon(el).getBoundingClientRect().right).toBeGreaterThan(tile(el).getBoundingClientRect().right - 30);
        });

        it("steps the value down, not below 18px", async () => {
            const el = await tileIn(180);
            expect(parseFloat(getComputedStyle(value(el)).fontSize)).toBeGreaterThanOrEqual(18);
            expect(parseFloat(getComputedStyle(value(el)).fontSize)).toBeLessThan(24);
        });
    });

    describe("Scenario: the loading skeleton", () => {
        for (const width of [220, 320]) {
            it(`is as tall as the loaded tile at ${width}px`, async () => {
                const loading = await tileIn(width, { loading: true });
                const loaded = await tileIn(width);
                expect(Math.abs(tile(loading).getBoundingClientRect().height - tile(loaded).getBoundingClientRect().height)).toBeLessThan(1);
            });
        }
    });

    describe("Scenario: uaui-stat in a 220px cell", () => {
        it("keeps a long currency value inside the cell", async () => {
            const { container } = render(
                html`<div style="width: 220px; font-family: Lato, sans-serif">
                    <uaui-stat label="Revenue" .value=${27337.11} .valueFormat=${EUR}></uaui-stat>
                </div>`,
            );
            const stat = container.querySelector("uaui-stat") as HTMLElement & { updateComplete: Promise<unknown> };
            await settle(stat);
            const range = document.createRange();
            range.selectNodeContents(stat.shadowRoot!.querySelector(".value")!);
            expect(range.getBoundingClientRect().right).toBeLessThanOrEqual(container.querySelector("div")!.getBoundingClientRect().right);
        });
    });

    describe("Scenario: accessibility", () => {
        it("has no violations when stacked", async () => {
            expect(await axeRun(await tileIn(220))).toHaveNoViolations();
        });
    });
});
