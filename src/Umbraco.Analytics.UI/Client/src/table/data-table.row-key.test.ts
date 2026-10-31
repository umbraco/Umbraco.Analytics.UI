// T50 — a row key made of several fields, for compare-row matching
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { html, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQueryAll, renderElement, shadow } from "../internal/test/dom.js";
import { UAUI_TABLE_CELL } from "./cells/cell-names.js";
import "./data-table.element.js";
import type { UauiDataTableElement } from "./data-table.element.js";

const columns = [
    { key: "name", label: "Product" },
    { key: "sold", label: "Sold", elementName: UAUI_TABLE_CELL.number, align: "end" as const },
];

const PRODUCT_AND_VARIANT = ["productReference", "productVariantReference"];

// Two variants of one product, and a product without variants.
const rows = [
    { productReference: "hoodie", productVariantReference: "m", name: "Hoodie, M", sold: 120 },
    { productReference: "hoodie", productVariantReference: "l", name: "Hoodie, L", sold: 90 },
    { productReference: "mug", name: "Mug", sold: 50 },
];
const compareRows = [
    { productReference: "hoodie", productVariantReference: "m", sold: 100 },
    { productReference: "hoodie", productVariantReference: "l", sold: 60 },
    { productReference: "mug", productVariantReference: null, sold: 40 },
];

const renderTable = async (template: TemplateResult) => (await renderElement(template, "uaui-data-table")) as unknown as UauiDataTableElement;

/** The text of each data row's badges, in row order: "" for a row without one. */
async function badgeTexts(el: Element): Promise<string[]> {
    const dataRows = [...shadow(el).querySelectorAll("uui-table-row:not(.column-toolbar)")];
    const texts: string[] = [];
    for (const row of dataRows) {
        const all = deepQueryAll(row, "uaui-delta-badge") as (HTMLElement & { updateComplete: Promise<boolean> })[];
        await Promise.all(all.map((badge) => badge.updateComplete));
        const shown = all.filter((badge) => badge.shadowRoot?.querySelector(".badge"));
        texts.push(shown.map((badge) => badge.shadowRoot!.textContent!.replace(/\s+/g, " ").trim()).join(" "));
    }
    return texts;
}

describe("Feature: a row key made of several fields", () => {
    describe("Scenario: rows keyed on product and variant", () => {
        it("draws every row and matches each to its own compare row", async () => {
            const el = await renderTable(
                html`<uaui-data-table .columns=${columns} .rows=${rows} .compareRows=${compareRows} .rowKey=${PRODUCT_AND_VARIANT}></uaui-data-table>`,
            );
            const texts = await badgeTexts(el);
            expect(texts).toHaveLength(3);
            // 120 vs 100, 90 vs 60, 50 vs 40.
            expect(texts[0]).toContain("+20%");
            expect(texts[1]).toContain("+50%");
            expect(texts[2]).toContain("+25%");
        });
    });

    describe("Scenario: the product alone isn't enough", () => {
        it("matches both variants to the last compare row of the product when keyed on the product only", async () => {
            const el = await renderTable(
                html`<uaui-data-table .columns=${columns} .rows=${rows} .compareRows=${compareRows} row-key="productReference"></uaui-data-table>`,
            );
            const texts = await badgeTexts(el);
            // Both hoodies against the L row's 60: the reason to key on the variant too.
            expect(texts[0]).toContain("+100%");
            expect(texts[1]).toContain("+50%");
        });
    });

    describe("Scenario: values a plain join would run together", () => {
        it("doesn't match ['a b', 'c'] with ['a', 'b c']", async () => {
            const el = await renderTable(
                html`<uaui-data-table
                    .columns=${columns}
                    .rows=${[{ productReference: "a b", productVariantReference: "c", name: "A", sold: 10 }]}
                    .compareRows=${[{ productReference: "a", productVariantReference: "b c", sold: 5 }]}
                    .rowKey=${PRODUCT_AND_VARIANT}></uaui-data-table>`,
            );
            expect(await badgeTexts(el)).toEqual([""]);
        });
    });

    describe("Scenario: a missing field", () => {
        it("counts as empty, so a product without a variant matches a compare row whose variant is null", async () => {
            const el = await renderTable(
                html`<uaui-data-table .columns=${columns} .rows=${rows} .compareRows=${compareRows} .rowKey=${PRODUCT_AND_VARIANT}></uaui-data-table>`,
            );
            expect((await badgeTexts(el))[2]).toContain("+25%");
        });
        it("never matches a row with none of the fields", async () => {
            const el = await renderTable(
                html`<uaui-data-table
                    .columns=${columns}
                    .rows=${[{ name: "Nothing", sold: 10 }]}
                    .compareRows=${[{ sold: 5 }]}
                    .rowKey=${PRODUCT_AND_VARIANT}></uaui-data-table>`,
            );
            expect(await badgeTexts(el)).toEqual([""]);
        });
    });

    describe("Scenario: the property and the attribute", () => {
        it("keeps the attribute to one field: a space is part of the field's name", async () => {
            const el = await renderTable(
                html`<uaui-data-table
                    .columns=${columns}
                    .rows=${[{ "product reference": "p1", name: "One", sold: 20 }]}
                    .compareRows=${[{ "product reference": "p1", sold: 10 }]}
                    row-key="product reference"></uaui-data-table>`,
            );
            expect(el.rowKey).toBe("product reference");
            expect((await badgeTexts(el))[0]).toContain("+100%");
        });
        it("reads a one-field array the same as the attribute", async () => {
            const el = await renderTable(
                html`<uaui-data-table .columns=${columns} .rows=${rows} .compareRows=${compareRows} .rowKey=${["productReference"]}></uaui-data-table>`,
            );
            const texts = await badgeTexts(el);
            expect(texts[0]).toContain("+100%");
            expect(texts[2]).toContain("+25%");
        });
        it("switches the matching when the property changes from one field to several", async () => {
            const el = await renderTable(
                html`<uaui-data-table .columns=${columns} .rows=${rows} .compareRows=${compareRows} row-key="productReference"></uaui-data-table>`,
            );
            expect((await badgeTexts(el))[0]).toContain("+100%");
            el.rowKey = PRODUCT_AND_VARIANT;
            await el.updateComplete;
            expect((await badgeTexts(el))[0]).toContain("+20%");
        });
        it("keeps matching when given a new array with the same fields", async () => {
            const el = await renderTable(
                html`<uaui-data-table .columns=${columns} .rows=${rows} .compareRows=${compareRows} .rowKey=${PRODUCT_AND_VARIANT}></uaui-data-table>`,
            );
            el.rowKey = [...PRODUCT_AND_VARIANT];
            await el.updateComplete;
            expect((await badgeTexts(el))[1]).toContain("+50%");
        });
        it("shows no badges for an empty array, as without a row-key", async () => {
            const el = await renderTable(
                html`<uaui-data-table .columns=${columns} .rows=${rows} .compareRows=${compareRows} .rowKey=${[]}></uaui-data-table>`,
            );
            expect(await badgeTexts(el)).toEqual(["", "", ""]);
        });
    });

    describe("Scenario: a11y audit with a row key of several fields", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 700px">
                        <uaui-data-table
                            label="Top products"
                            .columns=${columns}
                            .rows=${rows}
                            .compareRows=${compareRows}
                            .rowKey=${PRODUCT_AND_VARIANT}></uaui-data-table>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uaui-data-table")!.updateComplete;
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        it("passes in the light theme", async () => {
            expect(await audit()).toHaveNoViolations();
        });
        it("passes in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });
        it("passes in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });
    });
});
