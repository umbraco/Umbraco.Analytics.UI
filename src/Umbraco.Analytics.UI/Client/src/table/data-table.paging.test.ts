// TBL-3 — Page through rows
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { userEvent } from "vitest/browser";
import { axeRun } from "../internal/test/a11y.js";
import { nextEvent, recordEvents, renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";
import "./data-table.element.js";
import { manyRows, nameColumns } from "./table-fixtures.js";

const footer = (el: Element) => shadow(el).querySelector(".pager") as HTMLElement | null;
const pageSizeSelect = (el: Element) => footer(el)!.querySelector("uui-select[name='page-size']") as HTMLElement & {
        value: string;
        options: { value: string }[];
        updateComplete: Promise<boolean>;
    };
const nextButton = (el: Element) => footer(el)!.querySelector(".next") as HTMLElement & { updateComplete: Promise<boolean> };
const previousButton = (el: Element) => footer(el)!.querySelector(".previous") as HTMLElement & { updateComplete: Promise<boolean> };
/** Clicks a pager button once uui-button has rendered its inner button (its host click does nothing before that), then waits for the table to update. */
const press = async (el: UaxTestElement, button: HTMLElement) => {
    await (button as HTMLElement & { updateComplete: Promise<boolean> }).updateComplete;
    button.click();
    await el.updateComplete;
};
const innerButton = (button: HTMLElement) => button.shadowRoot!.querySelector("button") as HTMLButtonElement;
const rowNames = (el: Element) => [...shadow(el).querySelectorAll("uui-table-row uui-table-cell:first-child")].map((c) => c.textContent?.trim());
const shares = (el: Element) => [...shadow(el).querySelectorAll(".share-percent")].map((c) => c.textContent);
const barWidths = (el: Element) => [...shadow(el).querySelectorAll<HTMLElement>(".share-bar")].map((b) => b.style.width);

const serverTable = (attrs: { page?: number; pageSize?: number; total?: number } = {}) =>
    renderElement(
        html`<uax-data-table
            mode="server"
            .columns=${nameColumns}
            .rows=${manyRows(10)}
            total=${attrs.total ?? 272}
            page=${attrs.page ?? 1}
            page-size=${attrs.pageSize ?? 10}></uax-data-table>`,
        "uax-data-table",
    );

const clientTable = (count: number, pageSize = 10) =>
    renderElement(html`<uax-data-table mode="client" .columns=${nameColumns} .rows=${manyRows(count)} page-size=${pageSize}></uax-data-table>`, "uax-data-table");

describe("Feature: page through rows", () => {
    describe("Scenario: 272 rows, 10 per page, on page 1", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await serverTable();
        });

        it("shows 1–10 of 272", () => {
            expect(footer(el)!.textContent).toContain("1–10 of 272");
        });

        it("offers 10, 25, 50 and 100 rows per page", () => {
            const options = pageSizeSelect(el).options.map((o) => o.value);
            expect(options).toEqual(["10", "25", "50", "100"]);
        });

        it("labels the page size select with Show rows", () => {
            expect(pageSizeSelect(el).getAttribute("label")).toBe("Show rows");
        });

        it("disables previous on the first page", () => {
            expect(previousButton(el).hasAttribute("disabled")).toBe(true);
        });
    });

    describe("Scenario: the last page of 272 rows", () => {
        it("shows 271–272 of 272 and disables next", async () => {
            const el = await serverTable({ page: 28 });
            expect([footer(el)!.textContent, nextButton(el).hasAttribute("disabled")]).toEqual([expect.stringContaining("271–272 of 272"), true]);
        });
    });

    describe("Scenario: moving to the next page", () => {
        let detail: unknown;
        beforeEach(async () => {
            const el = await serverTable();
            const event = nextEvent(el, "page-change");
            nextButton(el).click();
            detail = (await event).detail;
        });

        it("raises page-change for page 2", () => {
            expect(detail).toEqual({ page: 2, pageSize: 10 });
        });
    });

    describe("Scenario: moving to the previous page", () => {
        it("raises page-change for page 2 from page 3", async () => {
            const el = await serverTable({ page: 3 });
            const event = nextEvent(el, "page-change");
            previousButton(el).click();
            expect((await event).detail).toEqual({ page: 2, pageSize: 10 });
        });
    });

    describe("Scenario: server mode leaves the rows to the product", () => {
        it("keeps showing the rows it was given after next is clicked", async () => {
            const el = await serverTable();
            await press(el, nextButton(el));
            expect(rowNames(el)).toHaveLength(10);
        });

        it("shows the new range straight away", async () => {
            const el = await serverTable();
            await press(el, nextButton(el));
            expect(footer(el)!.textContent).toContain("11–20 of 272");
        });
    });

    describe("Scenario: changing the page size", () => {
        let detail: unknown;
        beforeEach(async () => {
            const el = await serverTable({ page: 3 });
            const event = nextEvent(el, "page-change");
            const select = pageSizeSelect(el);
            select.value = "25";
            select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            detail = (await event).detail;
        });

        it("raises page-change for page 1 with 25 rows", () => {
            expect(detail).toEqual({ page: 1, pageSize: 25 });
        });
    });

    describe("Scenario: page-change is not composed", () => {
        it("bubbles but stays inside the host's tree", async () => {
            const el = await serverTable();
            const events = recordEvents(el, "page-change");
            await press(el, nextButton(el));
            expect([events[0].bubbles, events[0].composed]).toEqual([true, false]);
        });
    });

    describe("Scenario: client mode, page 2 of 30 rows", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await clientTable(30);
            await press(el, nextButton(el));
        });

        it("shows rows 11 to 20", () => {
            expect(rowNames(el)).toEqual(Array.from({ length: 10 }, (_, i) => `Page ${i + 11}`));
        });

        it("shows 11–20 of 30", () => {
            expect(footer(el)!.textContent).toContain("11–20 of 30");
        });

        it("still raises page-change", async () => {
            const event = nextEvent(el, "page-change");
            nextButton(el).click();
            expect((await event).detail).toEqual({ page: 3, pageSize: 10 });
        });
    });

    describe("Scenario: client mode, the last page is short", () => {
        it("shows the remaining rows", async () => {
            const el = await clientTable(25);
            await press(el, nextButton(el));
            await press(el, nextButton(el));
            expect(rowNames(el)).toEqual(["Page 21", "Page 22", "Page 23", "Page 24", "Page 25"]);
        });
    });

    describe("Scenario: client mode, a bigger page size", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await clientTable(60);
            await press(el, nextButton(el));
            const select = pageSizeSelect(el);
            select.value = "25";
            select.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
            await el.updateComplete;
        });

        it("goes back to page 1 and shows 25 rows", () => {
            expect(rowNames(el)).toEqual(Array.from({ length: 25 }, (_, i) => `Page ${i + 1}`));
        });
    });

    describe("Scenario: client mode, rows are replaced with fewer", () => {
        it("clamps to the last page that exists", async () => {
            const el = await clientTable(30);
            await press(el, nextButton(el));
            await press(el, nextButton(el));
            el.rows = manyRows(15);
            await el.updateComplete;
            expect(rowNames(el)).toEqual(Array.from({ length: 5 }, (_, i) => `Page ${i + 11}`));
        });
    });

    describe("Scenario: client mode, sorting", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await clientTable(30);
            await press(el, nextButton(el));
            const header = [...shadow(el).querySelectorAll("uui-table-head-cell")].find((h) => h.textContent?.includes("Views")) as HTMLElement;
            header.click();
            await el.updateComplete;
        });

        it("goes back to page 1 and sorts across all pages", () => {
            expect(rowNames(el)[0]).toBe("Page 1");
        });

        it("shows 1–10 of 30", () => {
            expect(footer(el)!.textContent).toContain("1–10 of 30");
        });
    });

    describe("Scenario: everything fits on one page", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await clientTable(8);
        });

        it("has no paging footer", () => {
            expect(footer(el)).toBe(null);
        });
    });

    describe("Scenario: a page size bigger than the rows", () => {
        it("keeps the footer so the editor can go back to a smaller size", async () => {
            const el = await clientTable(30, 50);
            expect(footer(el)).not.toBe(null);
        });

        it("hides the footer when the rows fit the smallest size", async () => {
            const el = await clientTable(10, 50);
            expect(footer(el)).toBe(null);
        });
    });

    describe("Scenario: a page size that isn't one of the options", () => {
        it("adds it to the list", async () => {
            const el = await clientTable(30, 5);
            const options = pageSizeSelect(el).options.map((o) => o.value);
            expect(options).toEqual(["5", "10", "25", "50", "100"]);
        });
    });

    describe("Scenario: using the pager from the keyboard", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await clientTable(30);
        });

        it("moves to the next page on Enter", async () => {
            innerButton(nextButton(el)).focus();
            await userEvent.keyboard("{Enter}");
            await el.updateComplete;
            expect(rowNames(el)[0]).toBe("Page 11");
        });

        it("moves to the next page on Space", async () => {
            innerButton(nextButton(el)).focus();
            await userEvent.keyboard(" ");
            await el.updateComplete;
            expect(rowNames(el)[0]).toBe("Page 11");
        });

        it("reaches next with Tab from the page size select, skipping the disabled previous", async () => {
            await pageSizeSelect(el).updateComplete;
            pageSizeSelect(el).shadowRoot!.querySelector("select")!.focus();
            await userEvent.tab();
            expect(shadow(el).activeElement).toBe(nextButton(el));
        });
    });

    describe("Scenario: focus when a pager button becomes disabled", () => {
        it("moves focus to previous when next lands on the last page", async () => {
            const el = await clientTable(20);
            const inner = innerButton(nextButton(el));
            await nextButton(el).updateComplete;
            inner.focus();
            await userEvent.keyboard("{Enter}");
            await el.updateComplete;
            await new Promise((r) => setTimeout(r));
            expect(shadow(el).activeElement).toBe(previousButton(el));
        });

        it("moves focus to next when previous lands on the first page", async () => {
            const el = await clientTable(20);
            await press(el, nextButton(el));
            await previousButton(el).updateComplete;
            innerButton(previousButton(el)).focus();
            await userEvent.keyboard("{Enter}");
            await el.updateComplete;
            await new Promise((r) => setTimeout(r));
            expect(shadow(el).activeElement).toBe(nextButton(el));
        });
    });

    describe("Scenario: the pager landmark", () => {
        it("is a navigation named Pagination", async () => {
            const el = await clientTable(30);
            expect([footer(el)!.getAttribute("role"), footer(el)!.getAttribute("aria-label")]).toEqual(["navigation", "Pagination"]);
        });
    });

    describe("Scenario: first load of a server table", () => {
        const loadingTable = (loading: boolean, rows: unknown[]) =>
            renderElement(
                html`<uax-data-table mode="server" .columns=${nameColumns} .rows=${rows} total="272" ?loading=${loading}></uax-data-table>`,
                "uax-data-table",
            );

        it("has no footer under the skeleton", async () => {
            expect(footer(await loadingTable(true, []))).toBe(null);
        });

        it("keeps the footer while reloading rows already shown", async () => {
            expect(footer(await loadingTable(true, manyRows(10)))).not.toBe(null);
        });
    });

    describe("Scenario: share percentages in server mode", () => {
        const columns = [
            { key: "name", label: "Name", type: "text" },
            { key: "views", label: "Views", type: "share" },
        ];
        const rows = [{ name: "A", views: 50 }, { name: "B", views: 25 }];

        it("uses the page's rows as the total when no totals are given", async () => {
            const el = await renderElement(html`<uax-data-table mode="server" .columns=${columns} .rows=${rows} total="272"></uax-data-table>`, "uax-data-table");
            expect(shares(el)).toEqual(["(66.7%)", "(33.3%)"]);
        });

        it("uses totals as the denominator", async () => {
            const el = await renderElement(
                html`<uax-data-table mode="server" .columns=${columns} .rows=${rows} total="272" .totals=${{ views: 200 }}></uax-data-table>`,
                "uax-data-table",
            );
            expect(shares(el)).toEqual(["(25.0%)", "(12.5%)"]);
        });

        it("ignores a total for another column", async () => {
            const el = await renderElement(
                html`<uax-data-table mode="server" .columns=${columns} .rows=${rows} total="272" .totals=${{ other: 200 }}></uax-data-table>`,
                "uax-data-table",
            );
            expect(shares(el)).toEqual(["(66.7%)", "(33.3%)"]);
        });

        it("shows 0% when the total is zero", async () => {
            const el = await renderElement(
                html`<uax-data-table mode="server" .columns=${columns} .rows=${rows} total="272" .totals=${{ views: 0 }}></uax-data-table>`,
                "uax-data-table",
            );
            expect(shares(el)).toEqual(["(0.0%)", "(0.0%)"]);
        });

        it("recomputes when totals change", async () => {
            const el = await renderElement(
                html`<uax-data-table mode="server" .columns=${columns} .rows=${rows} total="272" .totals=${{ views: 200 }}></uax-data-table>`,
                "uax-data-table",
            );
            el.totals = { views: 100 };
            await el.updateComplete;
            expect(shares(el)).toEqual(["(50.0%)", "(25.0%)"]);
        });
    });

    describe("Scenario: share bars in server mode", () => {
        const columns = [
            { key: "name", label: "Name", type: "text" },
            { key: "views", label: "Views", type: "share" },
        ];
        const rows = [{ name: "A", views: 50 }, { name: "B", views: 25 }];

        it("scales to the page's largest value when no maxes are given", async () => {
            const el = await renderElement(html`<uax-data-table mode="server" .columns=${columns} .rows=${rows} total="272"></uax-data-table>`, "uax-data-table");
            expect(barWidths(el)).toEqual(["100%", "50%"]);
        });

        it("scales to maxes when given", async () => {
            const el = await renderElement(
                html`<uax-data-table mode="server" .columns=${columns} .rows=${rows} total="272" .maxes=${{ views: 200 }}></uax-data-table>`,
                "uax-data-table",
            );
            expect(barWidths(el)).toEqual(["25%", "12.5%"]);
        });

        it("never draws a bar wider than its track", async () => {
            const el = await renderElement(
                html`<uax-data-table mode="server" .columns=${columns} .rows=${rows} total="272" .maxes=${{ views: 10 }}></uax-data-table>`,
                "uax-data-table",
            );
            expect(barWidths(el)).toEqual(["100%", "100%"]);
        });
    });

    describe("Scenario: client mode shares are of all rows, not the page", () => {
        it("keeps each row's share of the whole column on page 2", async () => {
            const columns = [{ key: "name", label: "Name", type: "text" }, { key: "views", label: "Views", type: "share" }];
            const rows = Array.from({ length: 20 }, (_, i) => ({ name: `Page ${i + 1}`, views: 10 }));
            const el = await renderElement(html`<uax-data-table .columns=${columns} .rows=${rows} page-size="10"></uax-data-table>`, "uax-data-table");
            await press(el, nextButton(el));
            expect(shares(el)[0]).toBe("(5.0%)");
        });
    });

    describe("Scenario: a11y audit with the footer", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 700px">
                        <uax-data-table .columns=${nameColumns} .rows=${manyRows(30)} page-size="10"></uax-data-table>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uax-data-table")!.updateComplete;
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
