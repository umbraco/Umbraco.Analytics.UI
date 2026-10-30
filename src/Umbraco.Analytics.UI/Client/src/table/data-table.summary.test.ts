// TBL-9 — A summary row aligned to the columns
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html, nothing } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { renderElement, settle, shadow, type UaxTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
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
    html`<uax-data-table .columns=${nameColumns} .rows=${rows}>
        <span slot="summary-name">Total</span>
        <span slot="summary-views">272</span>
        ${extra}
    </uax-data-table>`;

describe("Feature: a summary row aligned to the columns", () => {
    describe("Scenario: content is slotted for a column", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(withSummary(), "uax-data-table");
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

        it("sits above the data rows", () => {
            expect(shadow(el).querySelector("uui-table-head")!.nextElementSibling).toBe(summaryRow(el));
        });

        it("is not counted among the data rows", () => {
            expect(bodyRows(el)).toHaveLength(2);
        });
    });

    describe("Scenario: the summary is not sorted with the rows", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table .columns=${nameColumns} .rows=${rows} .sort=${{ key: "views", direction: "asc" }}>
                    <span slot="summary-views">272</span>
                </uax-data-table>`,
                "uax-data-table",
            );
            await settle(el);
        });

        it("stays the first row", () => {
            expect(shadow(el).querySelector("uui-table-head")!.nextElementSibling).toBe(summaryRow(el));
        });
    });

    describe("Scenario (sad path): nothing is slotted", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            await settle(el);
        });

        it("draws no summary row", () => {
            expect(shown(el)).toBe(false);
        });
    });

    describe("Scenario: content arrives after the first draw", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
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
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table .columns=${nameColumns} .rows=${rows}><span slot="summary-nope">x</span></uax-data-table>`,
                "uax-data-table",
            );
            await settle(el);
        });

        it("draws no summary row", () => {
            expect(shown(el)).toBe(false);
        });
    });

    describe("Scenario: the summary row is part of the table's semantics", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(withSummary(), "uax-data-table");
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
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 700px">${withSummary()}</div>`,
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
