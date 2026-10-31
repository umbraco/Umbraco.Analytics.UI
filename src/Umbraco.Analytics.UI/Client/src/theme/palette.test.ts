// FND-1 — Products use the package's palette
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { css, html, LitElement } from "@umbraco-cms/backoffice/external/lit";
import lightCss from "@umbraco-ui/uui/themes/light.css?inline";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { UauiPaletteStyles } from "../index.js";
import { deepQuery, renderElement, settle, type UauiTestElement } from "../internal/test/dom.js";
import "../table/cells/share-cell.element.js";

/** A product's own element: it adds the palette and paints two swatches, outside any of our shadow roots. */
class TestProductLegendElement extends LitElement {
    override render() {
        return html`<span class="one"></span><span class="two"></span>`;
    }

    static override styles = [
        UauiPaletteStyles,
        css`
            span {
                display: block;
                height: 4px;
            }
            .one {
                background-color: var(--uaui-color-series-1);
            }
            .two {
                background-color: var(--uaui-color-series-2);
            }
        `,
    ];
}

customElements.define("test-product-legend", TestProductLegendElement);

const swatch = (el: UauiTestElement, name: "one" | "two") =>
    getComputedStyle(el.shadowRoot!.querySelector(`.${name}`)!).backgroundColor;

const bar = (cell: UauiTestElement) =>
    getComputedStyle(deepQuery(cell.shadowRoot!, ".share-bar")!).backgroundColor;

const themes = { light: lightCss, dark: darkCss, "high contrast": highContrastCss };

const render = async (wrapperStyle = "") => {
    const product = await renderElement(
        html`<div style=${wrapperStyle}>
            <test-product-legend></test-product-legend>
            <uaui-share-cell .value=${50} .total=${100} .max=${100} .color=${1}></uaui-share-cell>
            <uaui-share-cell .value=${50} .total=${100} .max=${100} .color=${2}></uaui-share-cell>
        </div>`,
        "test-product-legend",
    );
    const cells = [...product.parentElement!.querySelectorAll<UauiTestElement>("uaui-share-cell")];
    await Promise.all(cells.map((cell) => settle(cell)));
    return { product, cells };
};

describe("Feature: products use the package's palette", () => {
    let themeStyle: HTMLStyleElement;
    beforeEach(() => {
        themeStyle = document.createElement("style");
        document.head.appendChild(themeStyle);
    });
    afterEach(() => themeStyle.remove());

    for (const [theme, themeCss] of Object.entries(themes)) {
        describe(`Scenario: a product element in the ${theme} theme`, () => {
            let product: UauiTestElement;
            let cells: UauiTestElement[];
            beforeEach(async () => {
                themeStyle.textContent = themeCss;
                ({ product, cells } = await render());
            });

            it("paints series 1 in the colour of our first share bar", () => {
                expect(swatch(product, "one")).toBe(bar(cells[0]));
            });

            it("paints series 2 in the colour of our second share bar", () => {
                expect(swatch(product, "two")).toBe(bar(cells[1]));
            });
        });
    }

    describe("Scenario: a product element with the palette in the light theme", () => {
        let product: UauiTestElement;
        beforeEach(async () => {
            themeStyle.textContent = lightCss;
            ({ product } = await render());
        });

        it("paints series 1 in a colour, not transparent", () => {
            expect(swatch(product, "one")).not.toBe("rgba(0, 0, 0, 0)");
        });
    });

    describe("Scenario: a product overrides --uaui-series-1 on an ancestor", () => {
        let product: UauiTestElement;
        let cells: UauiTestElement[];
        beforeEach(async () => {
            themeStyle.textContent = lightCss;
            ({ product, cells } = await render("--uaui-series-1: rgb(1, 2, 3)"));
        });

        it("paints the product's series 1 in the override", () => {
            expect(swatch(product, "one")).toBe("rgb(1, 2, 3)");
        });

        it("paints our first share bar in the override", () => {
            expect(bar(cells[0])).toBe("rgb(1, 2, 3)");
        });
    });
});
