// TBL-9 — A summary row aligned to the columns
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html, nothing } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepText, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import "../table-search/table-search.element.js";
import "./table-total.element.js";
import { nameColumns } from "./table-fixtures.js";

const rows = [
    { name: "Contact", views: 62 },
    { name: "Home", views: 210 },
];
const summaryRow = (el: Element) => shadow(el).querySelector("uui-table-row.summary") as HTMLElement;
/** The row is always in the DOM, so slots can raise `slotchange`; what the editor sees is whether it is hidden. */
const shown = (el: Element) => getComputedStyle(summaryRow(el)).display !== "none";
const summaryCells = (el: Element) => [...summaryRow(el).querySelectorAll("uui-table-cell")] as HTMLElement[];
const bodyRows = (el: Element) => [...shadow(el).querySelectorAll("uui-table-row:not(.summary)")];
const headCell = (el: Element, label: string) =>
    [...shadow(el).querySelectorAll("uui-table-head-cell")].find((h) => h.textContent?.includes(label)) as HTMLElement;

const withSummary = (extra = nothing) =>
    html`<uaui-data-table .columns=${nameColumns} .rows=${rows}>
        <span slot="summary-name">Total</span>
        <span slot="summary-views">272</span>
        ${extra}
    </uaui-data-table>`;

describe("Feature: a summary row aligned to the columns", () => {
    describe("Scenario: content is slotted for a column", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(withSummary(), "uaui-data-table");
            await settle(el);
        });

        it("shows the summary row", () => {
            expect(shown(el)).toBe(true);
        });

        it("has one cell per column", () => {
            expect(summaryCells(el)).toHaveLength(2);
        });

        it("puts the content in its column's cell", () => {
            const slot = summaryCells(el)[1].querySelector("slot") as HTMLSlotElement;
            expect(slot.assignedNodes().map((n) => n.textContent)).toEqual(["272"]);
        });

        it("lines the cell up with its column header", () => {
            const cell = summaryCells(el)[1].getBoundingClientRect();
            const head = headCell(el, "Views").getBoundingClientRect();
            expect([Math.round(cell.left), Math.round(cell.right)]).toEqual([Math.round(head.left), Math.round(head.right)]);
        });

        it("takes the alignment of the column", () => {
            expect(getComputedStyle(summaryCells(el)[1]).textAlign).toBe("end");
        });

        it("comes before the column headings in the table", () => {
            expect(shadow(el).querySelector("uui-table-head")!.previousElementSibling).toBe(summaryRow(el));
        });

        it("draws the summary row above the column headings", () => {
            const head = shadow(el).querySelector("uui-table-head")!.getBoundingClientRect();
            expect(summaryRow(el).getBoundingClientRect().bottom).toBeLessThanOrEqual(head.top + 1);
        });

        it("draws the column headings in one row", () => {
            const tops = [...shadow(el).querySelectorAll("uui-table-head-cell")].map((h) => Math.round(h.getBoundingClientRect().top));
            expect(new Set(tops).size).toBe(1);
        });

        it("keeps the column headings above the data rows", () => {
            const head = shadow(el).querySelector("uui-table-head")!.getBoundingClientRect();
            expect(head.bottom).toBeLessThanOrEqual(bodyRows(el)[0].getBoundingClientRect().top + 1);
        });

        it("is not counted among the data rows", () => {
            expect(bodyRows(el)).toHaveLength(2);
        });
    });

    describe("Scenario: the content lines up with the column's content", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-data-table .columns=${nameColumns} .rows=${rows}>
                    <span slot="summary-name">Total</span>
                    <uaui-table-total slot="summary-views" label="Views" value="272"></uaui-table-total>
                </uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
        });

        const firstDataCell = (index: number) => bodyRows(el)[0].querySelectorAll("uui-table-cell")[index] as HTMLElement;
        const contentLeft = (cell: HTMLElement) => cell.getBoundingClientRect().left + parseFloat(getComputedStyle(cell).paddingLeft);
        const contentRight = (cell: HTMLElement) => cell.getBoundingClientRect().right - parseFloat(getComputedStyle(cell).paddingRight);

        it("starts the slotted content where the first column's data content starts", () => {
            const slotted = el.querySelector("[slot=summary-name]")!.getBoundingClientRect();
            expect(Math.round(slotted.left)).toBe(Math.round(contentLeft(firstDataCell(0))));
        });

        it("ends the total's value where the end-aligned column's data content ends", () => {
            const value = shadow(el.querySelector("uaui-table-total")!).querySelector(".value")!.getBoundingClientRect();
            expect(Math.round(value.right)).toBe(Math.round(contentRight(firstDataCell(1))));
        });
    });

    describe("Scenario: the summary is not sorted with the rows", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-data-table .columns=${nameColumns} .rows=${rows} .sort=${{ key: "views", direction: "asc" }}>
                    <span slot="summary-views">272</span>
                </uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
        });

        it("stays above the column headings", () => {
            expect(shadow(el).querySelector("uui-table-head")!.previousElementSibling).toBe(summaryRow(el));
        });
    });

    describe("Scenario: a search in the first column's summary", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-data-table .columns=${nameColumns} .rows=${rows}>
                    <uaui-table-search slot="summary-name"></uaui-table-search>
                </uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
            el.querySelector("uaui-table-search")!.dispatchEvent(new CustomEvent("search", { detail: { query: "cont" }, bubbles: true }));
            await settle(el);
        });

        it("sets the table's query", () => {
            expect(el.query).toBe("cont");
        });

        it("filters the rows", () => {
            expect(bodyRows(el)).toHaveLength(1);
        });

        it("keeps the row that matches", () => {
            expect(deepText(bodyRows(el)[0])).toContain("Contact");
        });
    });

    describe("Scenario: a toolbar and a summary row", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-data-table .columns=${nameColumns} .rows=${rows}>
                    <div slot="toolbar">Toolbar</div>
                    <span slot="summary-views">272</span>
                </uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
        });

        it("draws the toolbar above the summary row", () => {
            const toolbar = shadow(el).querySelector(".toolbar")!.getBoundingClientRect();
            expect(toolbar.bottom).toBeLessThanOrEqual(summaryRow(el).getBoundingClientRect().top + 1);
        });
    });

    describe("Scenario: the summary row's borders", () => {
        it("gives the headings a top border when the summary row shows", async () => {
            const el = await renderElement(withSummary(), "uaui-data-table");
            await settle(el);
            expect(getComputedStyle(headCell(el, "Views")).borderTopWidth).toBe("1px");
        });

        it("gives the summary cells no top border without a toolbar", async () => {
            const el = await renderElement(withSummary(), "uaui-data-table");
            await settle(el);
            expect(getComputedStyle(summaryCells(el)[0]).borderTopWidth).toBe("0px");
        });
    });

    describe("Scenario (sad path): nothing is slotted", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-data-table .columns=${nameColumns} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
            await settle(el);
        });

        it("draws no summary row", () => {
            expect(shown(el)).toBe(false);
        });
    });

    describe("Scenario: content arrives after the first draw", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uaui-data-table .columns=${nameColumns} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
            const late = document.createElement("span");
            late.slot = "summary-views";
            late.textContent = "272";
            el.append(late);
            await expect.poll(() => shown(el)).toBe(true);
        });

        it("shows the summary row", () => {
            expect(shown(el)).toBe(true);
        });

        it("hides the row again when the content goes", async () => {
            el.querySelector("[slot=summary-views]")!.remove();
            await expect.poll(() => shown(el)).toBe(false);
        });
    });

    describe("Scenario: a summary for a column the table doesn't have", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-data-table .columns=${nameColumns} .rows=${rows}><span slot="summary-nope">x</span></uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
        });

        it("draws no summary row", () => {
            expect(shown(el)).toBe(false);
        });
    });

    describe("Scenario: the summary row is part of the table's semantics", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(withSummary(), "uaui-data-table");
            await settle(el);
        });

        it("is a row of the table", () => {
            expect(summaryRow(el).getAttribute("role")).toBe("row");
        });

        it("holds cells", () => {
            expect(summaryCells(el).every((c) => c.getAttribute("role") === "cell")).toBe(true);
        });
    });

    describe("Scenario: a11y audit", () => {
        async function audit(themeCss?: string, content = withSummary()) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 700px">${content}</div>`,
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

        describe("with a search and a total with a badge", () => {
            const composed = html`<uaui-data-table .columns=${nameColumns} .rows=${rows}>
                <uaui-table-search slot="summary-name"></uaui-table-search>
                <uaui-table-total slot="summary-views" label="Total views" value="272" .current=${272} .previous=${230}></uaui-table-total>
            </uaui-data-table>`;

            it("passes in the light theme", async () => {
                expect(await audit(undefined, composed)).toHaveNoViolations();
            });
            it("passes in the dark theme", async () => {
                expect(await audit(darkCss, composed)).toHaveNoViolations();
            });
            it("passes in the high contrast theme", async () => {
                expect(await audit(highContrastCss, composed)).toHaveNoViolations();
            });
        });
    });
});
