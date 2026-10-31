// TBL-1 — Cells are elements, as in the CMS umb-table
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { customElement, html, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQuery, deepText, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import "./cells/index.js";
import type { UauiShareCellElement } from "./cells/share-cell.element.js";
import type { UauiTableCellElement, UauiTableColumn } from "./types.js";
import { UAUI_TABLE_CELL } from "./cells/cell-names.js";

/** A product's own cell: a dot and the value. Records what the table gave it. */
@customElement("uaui-test-dot-cell")
class TestDotCellElement extends UmbLitElement implements UauiTableCellElement {
    @property({ attribute: false }) column: UauiTableColumn = { key: "", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;

    override render() {
        return html`<span class="dot" aria-hidden="true"></span>${String(this.value ?? "")}`;
    }
}

@customElement("uaui-test-other-cell")
class TestOtherCellElement extends TestDotCellElement {}

const rows = [{ name: "New visitor", n: 5 }, { name: "Returning visitor", n: 7 }];
const columns = (elementName?: string): UauiTableColumn[] => [
    { key: "name", label: "Type", elementName },
    { key: "n", label: "N", elementName: UAUI_TABLE_CELL.number, align: "end" },
];
const firstCell = (el: Element) => shadow(el).querySelector("uui-table-row:not([part~='header']):not(.summary) uui-table-cell")!.firstElementChild as TestDotCellElement;
const table = (el: Element) => el as UauiTestElement & { columns: UauiTableColumn[]; rows: unknown[] };

describe("Feature: table cells are elements", () => {
    describe("Scenario: a column with an elementName", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-data-table .columns=${columns("uaui-test-dot-cell")} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
            await settle(el);
        });

        it("creates that element in the cell", () => {
            expect(firstCell(el).tagName.toLowerCase()).toBe("uaui-test-dot-cell");
        });

        it("gives it the column", () => {
            expect(firstCell(el).column).toBe(table(el).columns[0]);
        });

        it("gives it the row as item", () => {
            expect(firstCell(el).item).toBe(rows[0]);
        });

        it("gives it the row's value for the column", () => {
            expect(firstCell(el).value).toBe("New visitor");
        });

        it("draws what the element draws", () => {
            expect(deepText(firstCell(el))).toBe("New visitor");
        });
    });

    describe("Scenario: the table renders again", () => {
        it("reuses the same element while the name stays the same", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${columns("uaui-test-dot-cell")} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
            const before = firstCell(el);
            table(el).columns = [...table(el).columns];
            await settle(el);
            expect(firstCell(el)).toBe(before);
        });

        it("gives the reused element the new column", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${columns("uaui-test-dot-cell")} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
            const next = [{ ...columns("uaui-test-dot-cell")[0], label: "Renamed" }, columns()[1]];
            table(el).columns = next;
            await settle(el);
            expect(firstCell(el).column).toBe(next[0]);
        });

        it("replaces the element when the name changes", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${columns("uaui-test-dot-cell")} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
            table(el).columns = columns("uaui-test-other-cell");
            await settle(el);
            expect(firstCell(el).tagName.toLowerCase()).toBe("uaui-test-other-cell");
        });

        it("goes back to the built-in cell when the name is removed", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${columns("uaui-test-dot-cell")} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
            table(el).columns = columns();
            await settle(el);
            expect(firstCell(el).tagName.toLowerCase()).toBe("uaui-text-cell");
        });
    });

    describe("Scenario: a column with a built-in cell name", () => {
        it("uses that cell element", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${columns()} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
            const cells = [...shadow(el).querySelectorAll("uui-table-row:not([part~='header']):not(.summary)")[0].querySelectorAll("uui-table-cell")];
            expect(cells.map((c) => c.firstElementChild?.tagName.toLowerCase())).toEqual(["uaui-text-cell", "uaui-number-cell"]);
        });
    });

    describe("Scenario: a share cell used on its own", () => {
        let cell: UauiShareCellElement;
        beforeEach(async () => {
            const host = render(html`<uaui-share-cell .value=${25} .total=${100} .max=${50} .color=${2}></uaui-share-cell>`).container;
            cell = host.querySelector("uaui-share-cell")!;
            await settle(cell);
        });

        it("shows the value", () => {
            expect(deepText(cell)).toContain("25");
        });

        it("shows the percent of the total", () => {
            expect(deepQuery(cell.shadowRoot!, ".share-percent")?.textContent).toBe("(25.0%)");
        });

        it("fills the bar to the value over the max", () => {
            expect(deepQuery<HTMLElement>(cell.shadowRoot!, ".share-bar")!.style.width).toBe("50%");
        });

        it("shows a change badge when it has a compare value", async () => {
            cell.compareValue = 20;
            await settle(cell);
            expect(deepQuery(cell.shadowRoot!, "uaui-delta-badge")).not.toBe(null);
        });
    });

    describe("Scenario: a link cell used on its own", () => {
        it("links to the item's hrefKey value", async () => {
            const host = render(
                html`<uaui-link-cell
                    .column=${{ key: "url", label: "", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "href" } }}
                    .item=${{ href: "https://example.com/" }}
                    .value=${"Home"}></uaui-link-cell>`,
            ).container;
            const cell = host.querySelector("uaui-link-cell")!;
            await settle(cell);
            expect(cell.shadowRoot!.querySelector("a")?.getAttribute("href")).toBe("https://example.com/");
        });
    });

    describe("Scenario: a11y audit with a custom cell", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 700px">
                        <uaui-data-table .columns=${columns("uaui-test-dot-cell")} .rows=${rows}></uaui-data-table>
                    </div>`,
                ).container.querySelector("div")!;
                await settle(host.querySelector("uaui-data-table")!);
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

declare global {
    interface HTMLElementTagNameMap {
        "uaui-test-dot-cell": TestDotCellElement;
        "uaui-test-other-cell": TestOtherCellElement;
    }
}
