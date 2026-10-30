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
import { deepQuery, deepText, renderElement, settle, shadow, type UaxTestElement } from "../internal/test/pending.js";
import "./data-table.element.js";
import "./cells/index.js";
import type { UaxShareCellElement } from "./cells/share-cell.element.js";
import type { UaxTableCellElement, UaxTableColumn } from "./types.js";
import { UAX_TABLE_CELL } from "./cells/cell-names.js";

/** A product's own cell: a dot and the value. Records what the table gave it. */
@customElement("uax-test-dot-cell")
class TestDotCellElement extends UmbLitElement implements UaxTableCellElement {
    @property({ attribute: false }) column: UaxTableColumn = { key: "", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;

    override render() {
        return html`<span class="dot" aria-hidden="true"></span>${String(this.value ?? "")}`;
    }
}

@customElement("uax-test-other-cell")
class TestOtherCellElement extends TestDotCellElement {}

const rows = [{ name: "New visitor", n: 5 }, { name: "Returning visitor", n: 7 }];
const columns = (elementName?: string): UaxTableColumn[] => [
    { key: "name", label: "Type", elementName },
    { key: "n", label: "N", elementName: UAX_TABLE_CELL.number, align: "end" },
];
const firstCell = (el: Element) => shadow(el).querySelector("uui-table-row:not([part~='header']) uui-table-cell")!.firstElementChild as TestDotCellElement;
const table = (el: Element) => el as UaxTestElement & { columns: UaxTableColumn[]; rows: unknown[] };

describe("Feature: table cells are elements", () => {
    describe("Scenario: a column with an elementName", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table .columns=${columns("uax-test-dot-cell")} .rows=${rows}></uax-data-table>`, "uax-data-table");
            await settle(el);
        });

        it("creates that element in the cell", () => {
            expect(firstCell(el).tagName.toLowerCase()).toBe("uax-test-dot-cell");
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
            const el = await renderElement(html`<uax-data-table .columns=${columns("uax-test-dot-cell")} .rows=${rows}></uax-data-table>`, "uax-data-table");
            const before = firstCell(el);
            table(el).columns = [...table(el).columns];
            await settle(el);
            expect(firstCell(el)).toBe(before);
        });

        it("gives the reused element the new column", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${columns("uax-test-dot-cell")} .rows=${rows}></uax-data-table>`, "uax-data-table");
            const next = [{ ...columns("uax-test-dot-cell")[0], label: "Renamed" }, columns()[1]];
            table(el).columns = next;
            await settle(el);
            expect(firstCell(el).column).toBe(next[0]);
        });

        it("replaces the element when the name changes", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${columns("uax-test-dot-cell")} .rows=${rows}></uax-data-table>`, "uax-data-table");
            table(el).columns = columns("uax-test-other-cell");
            await settle(el);
            expect(firstCell(el).tagName.toLowerCase()).toBe("uax-test-other-cell");
        });

        it("goes back to the built-in cell when the name is removed", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${columns("uax-test-dot-cell")} .rows=${rows}></uax-data-table>`, "uax-data-table");
            table(el).columns = columns();
            await settle(el);
            expect(firstCell(el).tagName.toLowerCase()).toBe("uax-text-cell");
        });
    });

    describe("Scenario: a column with a built-in cell name", () => {
        it("uses that cell element", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${columns()} .rows=${rows}></uax-data-table>`, "uax-data-table");
            const cells = [...shadow(el).querySelectorAll("uui-table-row:not([part~='header'])")[0].querySelectorAll("uui-table-cell")];
            expect(cells.map((c) => c.firstElementChild?.tagName.toLowerCase())).toEqual(["uax-text-cell", "uax-number-cell"]);
        });
    });

    describe("Scenario: a share cell used on its own", () => {
        let cell: UaxShareCellElement;
        beforeEach(async () => {
            const host = render(html`<uax-share-cell .value=${25} .total=${100} .max=${50} .color=${2}></uax-share-cell>`).container;
            cell = host.querySelector("uax-share-cell")!;
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
            expect(deepQuery(cell.shadowRoot!, "uax-delta-badge")).not.toBe(null);
        });
    });

    describe("Scenario: a link cell used on its own", () => {
        it("links to the item's hrefKey value", async () => {
            const host = render(
                html`<uax-link-cell
                    .column=${{ key: "url", label: "", elementName: UAX_TABLE_CELL.link, hrefKey: "href" }}
                    .item=${{ href: "https://example.com/" }}
                    .value=${"Home"}></uax-link-cell>`,
            ).container;
            const cell = host.querySelector("uax-link-cell")!;
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
                        <uax-data-table .columns=${columns("uax-test-dot-cell")} .rows=${rows}></uax-data-table>
                    </div>`,
                ).container.querySelector("div")!;
                await settle(host.querySelector("uax-data-table")!);
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
        "uax-test-dot-cell": TestDotCellElement;
        "uax-test-other-cell": TestOtherCellElement;
    }
}
