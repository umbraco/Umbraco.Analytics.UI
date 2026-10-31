// T46 — Name each table and its pager, so two paged tables on one page have unique landmarks
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import { UAUI_TABLE_CELL } from "./cells/cell-names.js";
import { manyRows, nameColumns } from "./table-fixtures.js";

const table = (el: Element) => shadow(el).querySelector("uui-table") as HTMLElement;
const pager = (el: Element) => shadow(el).querySelector("uaui-compact-pager")!.shadowRoot!.querySelector(".pager") as HTMLElement;
const scroller = (el: Element) => shadow(el).querySelector<HTMLElement>(".scroll")!;
const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

const pagedTable = (label?: string) =>
    renderElement(
        html`<uaui-data-table label=${label ?? ""} .columns=${nameColumns} .rows=${manyRows(30)} page-size="10"></uaui-data-table>`,
        "uaui-data-table",
    );

// Five columns, like the AI usage table, so they don't fit in 420px.
const wideColumns = [
    { key: "name", label: "Model", width: "28%" },
    { key: "requests", label: "Requests", elementName: UAUI_TABLE_CELL.share, width: "24%" },
    { key: "tokens", label: "Tokens", elementName: UAUI_TABLE_CELL.share, width: "24%" },
    { key: "rate", label: "Success rate", elementName: UAUI_TABLE_CELL.percent, align: "end" },
    { key: "duration", label: "Avg duration", elementName: UAUI_TABLE_CELL.number, align: "end" },
];
const wideRows = Array.from({ length: 30 }, (_, i) => ({ name: `model-${i + 1}`, requests: 120 - i, tokens: 52000 - i * 100, rate: 0.98, duration: 840 + i }));

/** Two paged tables, one above the other, in a box narrow enough that both scroll sideways too, so each has a pager and a scroll region. */
async function twoTables(first: string, second: string) {
    const host = render(
        html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 420px">
            <uaui-data-table label=${first} .columns=${wideColumns} .rows=${wideRows} page-size="10"></uaui-data-table>
            <uaui-data-table label=${second} .columns=${wideColumns} .rows=${wideRows} page-size="10"></uaui-data-table>
        </div>`,
    ).container.querySelector("div")!;
    const tables = [...host.querySelectorAll("uaui-data-table")] as unknown as UauiTestElement[];
    for (const el of tables) await settle(el);
    await frames();
    for (const el of tables) await settle(el);
    return { host, tables };
}

describe("Feature: name each table and its pager", () => {
    describe("Scenario: a table with no label", () => {
        it("gives the table no name, as before", async () => {
            expect(table(await pagedTable()).hasAttribute("aria-label")).toBe(false);
        });

        it("names the pager Pagination, as before", async () => {
            expect(pager(await pagedTable()).getAttribute("aria-label")).toBe("Pagination");
        });
    });

    describe("Scenario: a table labelled Top pages", () => {
        it("names the table Top pages", async () => {
            expect(table(await pagedTable("Top pages")).getAttribute("aria-label")).toBe("Top pages");
        });

        it("names the pager Top pages, pagination", async () => {
            expect(pager(await pagedTable("Top pages")).getAttribute("aria-label")).toBe("Top pages, pagination");
        });

        it("doesn't show the label", async () => {
            expect(shadow(await pagedTable("Top pages")).textContent).not.toContain("Top pages");
        });

        it("reflects a later change to the pager's name", async () => {
            const el = await pagedTable("Top pages");
            (el as unknown as { label: string }).label = "Entry pages";
            await settle(el);
            await shadow(el).querySelector<HTMLElement & { updateComplete: Promise<boolean> }>("uaui-compact-pager")!.updateComplete;
            expect([table(el).getAttribute("aria-label"), pager(el).getAttribute("aria-label")]).toEqual(["Entry pages", "Entry pages, pagination"]);
        });
    });

    describe("Scenario: the columns don't fit", () => {
        it("names the scroll region after the label", async () => {
            const { tables } = await twoTables("Top pages", "Entry pages");
            expect(tables.map((el) => scroller(el).getAttribute("aria-label"))).toEqual([
                "Top pages, scroll sideways to see more columns",
                "Entry pages, scroll sideways to see more columns",
            ]);
        });

        it("keeps the region's name apart from the table's", async () => {
            const { tables } = await twoTables("Top pages", "Entry pages");
            expect(scroller(tables[0]).getAttribute("aria-label")).not.toBe(table(tables[0]).getAttribute("aria-label"));
        });

        it("keeps the old region name with no label", async () => {
            const { tables } = await twoTables("", "");
            expect(scroller(tables[0]).getAttribute("aria-label")).toBe("Table, scroll sideways to see more columns");
        });
    });

    describe("Scenario: two paged tables on one page", () => {
        it("has unique landmarks when both are labelled", async () => {
            const { host, tables } = await twoTables("Top pages", "Entry pages");
            expect(scroller(tables[0]).getAttribute("role")).toBe("region");
            const results = await axeRun(host);
            expect(results.violations.filter((violation) => violation.id === "landmark-unique")).toEqual([]);
            expect(results).toHaveNoViolations();
        });

        it("still repeats the landmarks when neither is labelled, which is why label exists", async () => {
            const { host } = await twoTables("", "");
            const results = await axeRun(host);
            expect(results.violations.map((violation) => violation.id)).toContain("landmark-unique");
        });
    });
});
