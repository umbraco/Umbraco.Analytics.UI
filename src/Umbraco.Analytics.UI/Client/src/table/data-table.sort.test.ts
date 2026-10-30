// TBL-2 — Sort by a column
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html, ifDefined } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQueryAll, deepText, nextEvent, recordEvents, renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";
import "./data-table.element.js";
import { nameColumns } from "./table-fixtures.js";

const rows = [{ name: "Contact", views: 62 }, { name: "Home", views: 210 }];
const header = (el: Element, label: string) =>
    [...shadow(el).querySelectorAll("uui-table-head-cell")].find((h) => h.textContent?.includes(label)) as HTMLElement;
const firstName = (el: Element) => deepText(shadow(el).querySelector("uui-table-row:not([part~='header']) uui-table-cell")!).trim();
const names = (el: Element) =>
    [...shadow(el).querySelectorAll("uui-table-row uui-table-cell:first-child")].map((c) => deepText(c).trim());
const sortButton = (el: Element, label: string) => header(el, label).querySelector("uax-table-sort-button")?.shadowRoot?.querySelector("button") as HTMLButtonElement;
const textColumns = [
    { key: "name", label: "Name", type: "text", sortable: true },
    { key: "views", label: "Views", type: "number", sortable: true },
];

describe("Feature: sort by a column", () => {
    describe("Scenario: clicking a sortable header", () => {
        let detail: unknown;
        beforeEach(async () => {
            const el = await renderElement(
                html`<uax-data-table .columns=${nameColumns} .rows=${rows} .sort=${{ key: "views", direction: "desc" }}></uax-data-table>`,
                "uax-data-table",
            );
            const event = nextEvent(el, "sort-change");
            header(el, "Views").click();
            detail = (await event).detail;
        });

        it("raises sort-change with the other direction", () => {
            expect(detail).toEqual({ key: "views", direction: "asc" });
        });
    });

    describe("Scenario: client mode", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table mode="client" .columns=${nameColumns} .rows=${rows} .sort=${{ key: "views", direction: "desc" }}></uax-data-table>`,
                "uax-data-table",
            );
        });

        it("puts the most-viewed row first", () => {
            expect(firstName(el)).toBe("Home");
        });
    });

    describe("Scenario: server mode", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-data-table mode="server" .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            header(el, "Views").click();
            await el.updateComplete;
        });

        it("keeps the rows in the order given", () => {
            expect(firstName(el)).toBe("Contact");
        });
    });

    describe("Scenario (sad path): a column that isn't sortable", () => {
        let events: Event[];
        beforeEach(async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            events = recordEvents(el, "sort-change");
            header(el, "Name").click();
        });

        it("raises no sort-change", () => {
            expect(events).toHaveLength(0);
        });
    });

    describe("Scenario: the sort indicator", () => {
        it("marks the sorted column aria-sort descending", async () => {
            const el = await renderElement(
                html`<uax-data-table .columns=${nameColumns} .rows=${rows} .sort=${{ key: "views", direction: "desc" }}></uax-data-table>`,
                "uax-data-table",
            );
            expect(header(el, "Views").getAttribute("aria-sort")).toBe("descending");
        });

        it("marks an unsorted sortable column aria-sort none", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            expect(header(el, "Views").getAttribute("aria-sort")).toBe("none");
        });

        it("gives a column that isn't sortable no aria-sort", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            expect(header(el, "Name").hasAttribute("aria-sort")).toBe(false);
        });

        it("updates aria-sort after a click", async () => {
            const el = await renderElement(
                html`<uax-data-table .columns=${nameColumns} .rows=${rows} .sort=${{ key: "views", direction: "desc" }}></uax-data-table>`,
                "uax-data-table",
            );
            header(el, "Views").click();
            await el.updateComplete;
            expect(header(el, "Views").getAttribute("aria-sort")).toBe("ascending");
        });

        it("sets the sort property itself", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            header(el, "Views").click();
            expect(el.sort).toEqual({ key: "views", direction: "desc" });
        });
    });

    describe("Scenario: a keyboard user sorts", () => {
        it("has a button in a sortable header", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            expect(sortButton(el, "Views")).toBeInstanceOf(HTMLButtonElement);
        });

        it("raises sort-change once when the button is activated", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            const events = recordEvents(el, "sort-change");
            sortButton(el, "Views").click();
            expect(events).toHaveLength(1);
        });

        it("can be focused", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            sortButton(el, "Views").focus();
            expect(header(el, "Views").querySelector("uax-table-sort-button")!.shadowRoot!.activeElement).toBe(sortButton(el, "Views"));
        });

        it("centres the sort symbol on the label", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows} .sort=${{ key: "views", direction: "asc" }}></uax-data-table>`, "uax-data-table");
            const root = header(el, "Views").querySelector("uax-table-sort-button")!.shadowRoot!;
            const label = root.querySelector(".label")!.getBoundingClientRect();
            const symbol = root.querySelector("uui-symbol-sort")!.getBoundingClientRect();
            expect(Math.abs(symbol.top + symbol.height / 2 - (label.top + label.height / 2))).toBeLessThanOrEqual(2);
        });

        it("has no button in a header that isn't sortable", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            expect(deepQueryAll(header(el, "Name"), "button")).toHaveLength(0);
        });
    });

    describe("Scenario: the first click on a new column", () => {
        it("sorts a number column descending", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${textColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            const event = nextEvent(el, "sort-change");
            header(el, "Views").click();
            expect((await event).detail).toEqual({ key: "views", direction: "desc" });
        });

        it("sorts a text column ascending", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${textColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            const event = nextEvent(el, "sort-change");
            header(el, "Name").click();
            expect((await event).detail).toEqual({ key: "name", direction: "asc" });
        });
    });

    describe("Scenario: client mode ordering", () => {
        const sorted = async (data: Record<string, unknown>[], sort: { key: string; direction: string }, lang?: string) => {
            const el = await renderElement(
                html`<uax-data-table lang=${ifDefined(lang)} .columns=${textColumns} .rows=${data} .sort=${sort}></uax-data-table>`,
                "uax-data-table",
            );
            return names(el);
        };

        it("sorts numbers numerically, not as text", async () => {
            const data = [{ name: "a", views: 9 }, { name: "b", views: 100 }, { name: "c", views: 20 }];
            expect(await sorted(data, { key: "views", direction: "asc" })).toEqual(["a", "c", "b"]);
        });

        it("keeps equal rows in their given order", async () => {
            const data = [{ name: "a", views: 5 }, { name: "b", views: 5 }, { name: "c", views: 5 }];
            expect(await sorted(data, { key: "views", direction: "desc" })).toEqual(["a", "b", "c"]);
        });

        it("puts missing values last when ascending", async () => {
            const data = [{ name: "a" }, { name: "b", views: 1 }, { name: "c", views: 2 }];
            expect(await sorted(data, { key: "views", direction: "asc" })).toEqual(["b", "c", "a"]);
        });

        it("puts missing values last when descending", async () => {
            const data = [{ name: "a" }, { name: "b", views: 1 }, { name: "c", views: 2 }];
            expect(await sorted(data, { key: "views", direction: "desc" })).toEqual(["c", "b", "a"]);
        });

        it("sorts text with the locale's collation", async () => {
            const data = [{ name: "Zebra" }, { name: "Ægir" }, { name: "Apple" }];
            expect(await sorted(data, { key: "name", direction: "asc" }, "da")).toEqual(["Apple", "Zebra", "Ægir"]);
        });

        it("sorts text without regard to case", async () => {
            const data = [{ name: "b" }, { name: "A" }, { name: "c" }];
            expect(await sorted(data, { key: "name", direction: "asc" })).toEqual(["A", "b", "c"]);
        });

        it("re-sorts when new rows arrive", async () => {
            const el = await renderElement(
                html`<uax-data-table .columns=${textColumns} .rows=${rows} .sort=${{ key: "views", direction: "desc" }}></uax-data-table>`,
                "uax-data-table",
            );
            el.rows = [{ name: "New", views: 1 }, { name: "Top", views: 500 }];
            await el.updateComplete;
            expect(firstName(el)).toBe("Top");
        });

        it("does not change the rows array it was given", async () => {
            const data = [{ name: "Contact", views: 62 }, { name: "Home", views: 210 }];
            await sorted(data, { key: "views", direction: "desc" });
            expect(data[0].name).toBe("Contact");
        });
    });

    describe("Scenario: server mode with a sort", () => {
        it("leaves the rows in order even when sort is set", async () => {
            const el = await renderElement(
                html`<uax-data-table mode="server" .columns=${nameColumns} .rows=${rows} .sort=${{ key: "views", direction: "desc" }}></uax-data-table>`,
                "uax-data-table",
            );
            expect(firstName(el)).toBe("Contact");
        });

        it("still raises sort-change on a click", async () => {
            const el = await renderElement(html`<uax-data-table mode="server" .columns=${nameColumns} .rows=${rows}></uax-data-table>`, "uax-data-table");
            const event = nextEvent(el, "sort-change");
            header(el, "Views").click();
            expect((await event).detail).toEqual({ key: "views", direction: "desc" });
        });
    });

    describe("Scenario: shares when sorted", () => {
        it("keeps each row's share of the column total", async () => {
            const el = await renderElement(
                html`<uax-data-table .columns=${[{ key: "name", label: "Name", type: "text" }, { key: "views", label: "Views", type: "share", sortable: true }]} .rows=${rows} .sort=${{ key: "views", direction: "desc" }}></uax-data-table>`,
                "uax-data-table",
            );
            expect(deepQueryAll(shadow(el), ".share-percent")[0]?.textContent).toBe("(77.2%)");
        });
    });

    describe("Scenario: a11y audit with a sorted column", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 700px">
                        <uax-data-table .columns=${nameColumns} .rows=${rows} .sort=${{ key: "views", direction: "desc" }}></uax-data-table>
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
