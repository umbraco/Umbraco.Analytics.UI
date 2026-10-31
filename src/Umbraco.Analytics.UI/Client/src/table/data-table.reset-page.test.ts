// TBL-3 — Page through rows: go back to page 1 when the rows are replaced (`reset-page-on-rows`)
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import { axeRun } from "../internal/test/a11y.js";
import { deepText, recordEvents, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import { manyRows, nameColumns } from "./table-fixtures.js";

type PagedTable = UauiTestElement & { page: number; resetPageOnRows: boolean; mode: string; sort?: { key: string; direction: string }; query: string; requestUpdate: () => void };

const nextButton = (el: Element) =>
    shadow(shadow(el).querySelector("uaui-compact-pager")!).querySelector(".next") as HTMLElement & { updateComplete: Promise<boolean> };
const position = (el: Element) => deepText(shadow(shadow(el).querySelector("uaui-compact-pager")!).querySelector(".pager")!);
const rowNames = (el: Element) => [...shadow(el).querySelectorAll("uui-table-row:not(.column-toolbar) uui-table-cell:first-child")].map((c) => deepText(c).trim());

/** Clicks next once uui-button has rendered, then waits for the table. */
async function next(el: UauiTestElement) {
    const button = nextButton(el);
    await button.updateComplete;
    button.click();
    await settle(el);
}

const table = async (reset: boolean, rows = manyRows(30)) =>
    (await renderElement(
        reset
            ? html`<uaui-data-table label="Reset" mode="client" reset-page-on-rows .columns=${nameColumns} .rows=${rows} page-size="10"></uaui-data-table>`
            : html`<uaui-data-table label="Keep" mode="client" .columns=${nameColumns} .rows=${rows} page-size="10"></uaui-data-table>`,
        "uaui-data-table",
    )) as PagedTable;

/** A table on page 3 of 30 rows. */
async function onPage3(reset: boolean) {
    const el = await table(reset);
    await next(el);
    await next(el);
    expect(el.page).toBe(3);
    return el;
}

describe("Feature: go back to page 1 when the rows are replaced", () => {
    describe("Scenario: off by default", () => {
        it("is off without the attribute", async () => {
            const el = await table(false);
            expect(el.resetPageOnRows).toBe(false);
        });

        it("keeps the page when the rows are replaced", async () => {
            const el = await onPage3(false);
            el.rows = manyRows(30).map((r) => ({ ...r }));
            await settle(el);
            expect(el.page).toBe(3);
            expect(rowNames(el)[0]).toBe("Page 21");
        });

        it("still shows the last page when the new rows are fewer, as before", async () => {
            const el = await onPage3(false);
            el.rows = manyRows(15);
            await settle(el);
            expect(el.page).toBe(3);
            expect(rowNames(el)[0]).toBe("Page 11");
        });
    });

    describe("Scenario: reset-page-on-rows is set", () => {
        it("reads the attribute as the resetPageOnRows property", async () => {
            const el = await table(true);
            expect(el.resetPageOnRows).toBe(true);
        });

        it("goes back to page 1 when rows is a new array", async () => {
            const el = await onPage3(true);
            el.rows = manyRows(30).map((r) => ({ ...r }));
            await settle(el);
            expect(el.page).toBe(1);
            expect(rowNames(el)[0]).toBe("Page 1");
            expect(position(el)).toContain("1–10 of 30");
        });

        it("does not reset when the same array is set again", async () => {
            const el = await onPage3(true);
            const same = el.rows as unknown[];
            el.rows = same as never;
            el.requestUpdate();
            await settle(el);
            expect(el.page).toBe(3);
        });

        it("does not reset when the same array is changed in place", async () => {
            const el = await onPage3(true);
            (el.rows as Record<string, unknown>[]).push({ name: "Page 31", views: 0 });
            el.requestUpdate();
            await settle(el);
            expect(el.page).toBe(3);
        });

        it("lets a page set in the same update as the new rows win", async () => {
            const el = await onPage3(true);
            el.rows = manyRows(30).map((r) => ({ ...r }));
            el.page = 2;
            await settle(el);
            expect(el.page).toBe(2);
        });

        it("does not reset on the first render, so a page set with the first rows is kept", async () => {
            const el = (await renderElement(
                html`<uaui-data-table mode="client" reset-page-on-rows .columns=${nameColumns} .rows=${manyRows(30)} page="2" page-size="10"></uaui-data-table>`,
                "uaui-data-table",
            )) as PagedTable;
            expect(el.page).toBe(2);
            expect(rowNames(el)[0]).toBe("Page 11");
        });

        it("shows page 1 on the first render when no page is set", async () => {
            const el = await table(true);
            expect(el.page).toBe(1);
            expect(rowNames(el)[0]).toBe("Page 1");
            expect(position(el)).toContain("1–10 of 30");
        });

        it("raises no page-change when it resets", async () => {
            const el = await onPage3(true);
            const events = recordEvents(el, "page-change");
            el.rows = manyRows(30).map((r) => ({ ...r }));
            await settle(el);
            expect(el.page).toBe(1);
            expect(events).toHaveLength(0);
        });

        it("keeps the sort and the search, which go back to page 1 as before", async () => {
            const el = await onPage3(true);
            el.sort = { key: "views", direction: "ascending" };
            el.query = "Page";
            await settle(el);
            expect(el.page).toBe(3);
            el.rows = manyRows(30).map((r) => ({ ...r }));
            await settle(el);
            expect(el.page).toBe(1);
            expect(el.sort).toEqual({ key: "views", direction: "ascending" });
            expect(el.query).toBe("Page");
            expect(rowNames(el)[0]).toBe("Page 30");
        });

        it("passes the a11y audit after a reset", async () => {
            const el = await onPage3(true);
            el.rows = manyRows(30).map((r) => ({ ...r }));
            await settle(el);
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: server mode ignores it", () => {
        it("keeps the page when the rows are replaced", async () => {
            const el = (await renderElement(
                html`<uaui-data-table
                    mode="server"
                    reset-page-on-rows
                    .columns=${nameColumns}
                    .rows=${manyRows(10)}
                    total-rows="272"
                    page="3"
                    page-size="10"></uaui-data-table>`,
                "uaui-data-table",
            )) as PagedTable;
            const events = recordEvents(el, "page-change");
            el.rows = manyRows(10);
            await settle(el);
            expect(el.page).toBe(3);
            expect(position(el)).toContain("21–30 of 272");
            expect(events).toHaveLength(0);
        });
    });
});
