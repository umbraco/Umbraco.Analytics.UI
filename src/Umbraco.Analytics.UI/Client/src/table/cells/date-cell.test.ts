/// <reference types="vite/client" />
// T49 — Date cell: an ISO date in the editor's culture, read as its day so no timezone moves it, sortable by date.
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { ifDefined } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../../internal/test/a11y.js";
import { deepText, renderElement, settle, shadow } from "../../internal/test/dom.js";
import "../data-table.element.js";
import "./index.js";
import { UAUI_TABLE_CELL } from "./cell-names.js";
import type { UauiDateCellElement } from "./date-cell.element.js";
import type { UauiTableColumn } from "../types.js";

const validFrom: UauiTableColumn = { key: "validFrom", label: "Valid from", elementName: UAUI_TABLE_CELL.date, sortable: true, sortAs: "date" };

async function renderCell(value: unknown, column: UauiTableColumn = validFrom, lang?: string): Promise<UauiDateCellElement> {
    const cell = render(html`<uaui-date-cell lang=${ifDefined(lang)} .column=${column} .item=${{ [column.key]: value }} .value=${value}></uaui-date-cell>`).container.querySelector(
        "uaui-date-cell",
    )!;
    await settle(cell);
    return cell;
}

const text = (cell: Element) => deepText(cell).trim();

describe("Feature: the date cell", () => {
    it("is named UAUI_TABLE_CELL.date", () => {
        expect(UAUI_TABLE_CELL.date).toBe("uaui-date-cell");
    });

    describe("Scenario: formatting in the editor's culture", () => {
        it("shows a medium date by default in en-US", async () => {
            expect(text(await renderCell("2026-06-01", validFrom, "en-US"))).toBe("Jun 1, 2026");
        });

        it("shows a medium date by default in da-DK", async () => {
            const expected = new Intl.DateTimeFormat("da-DK", { dateStyle: "medium", timeZone: "UTC" }).format(Date.UTC(2026, 5, 1));
            const shown = text(await renderCell("2026-06-01", validFrom, "da-DK"));
            expect(shown).toBe(expected);
            expect(shown).not.toBe("Jun 1, 2026");
        });

        it("formats with the column's dateFormat", async () => {
            const column = { ...validFrom, dateFormat: { day: "numeric", month: "long", year: "numeric" } as Intl.DateTimeFormatOptions };
            expect(text(await renderCell("2026-06-01", column, "en-US"))).toBe("June 1, 2026");
        });

        it("shows a leap day", async () => {
            expect(text(await renderCell("2028-02-29", validFrom, "en-US"))).toBe("Feb 29, 2028");
        });

        it("falls back to the default format when Intl rejects the column's options", async () => {
            const column = { ...validFrom, dateFormat: { dateStyle: "medium", hour: "numeric" } as Intl.DateTimeFormatOptions };
            const cell = await renderCell("2026-06-01", column, "en-US");
            expect(text(cell)).toBe("Jun 1, 2026");
            cell.value = "2026-06-02";
            await settle(cell);
            expect(text(cell)).toBe("Jun 2, 2026");
        });

        it("marks the day up as a time element with the ISO day", async () => {
            const cell = await renderCell("2026-06-01T10:00:00Z", validFrom, "en-US");
            expect(shadow(cell).querySelector("time")?.getAttribute("datetime")).toBe("2026-06-01");
        });

        it("follows a change of language", async () => {
            const cell = await renderCell("2026-06-01", validFrom, "en-US");
            cell.lang = "da-DK";
            await expect.poll(() => text(cell)).toBe(new Intl.DateTimeFormat("da-DK", { dateStyle: "medium", timeZone: "UTC" }).format(Date.UTC(2026, 5, 1)));
        });
    });

    describe("Scenario: a date-time is read as its day, never shifted", () => {
        for (const value of ["2026-06-01T23:30:00-05:00", "2026-06-01T00:30:00+14:00", "2026-06-01T23:59:59Z", "2026-06-01T00:00:00", "2026-06-01 12:00"]) {
            it(`shows ${value} as 1 June`, async () => {
                expect(text(await renderCell(value, validFrom, "en-US"))).toBe("Jun 1, 2026");
            });
        }

        it("ignores a timeZone in dateFormat", async () => {
            const column = { ...validFrom, dateFormat: { dateStyle: "medium", timeZone: "Pacific/Kiritimati" } as Intl.DateTimeFormatOptions };
            expect(text(await renderCell("2026-06-01", column, "en-US"))).toBe("Jun 1, 2026");
        });
    });

    describe("Scenario: nothing to show", () => {
        for (const [name, value] of [
            ["missing", undefined],
            ["null", null],
            ["empty", ""],
            ["not a date", "soon"],
            ["not a real day", "2026-02-30"],
            ["a number", 1780272000000],
            ["a date followed by other text", "2026-06-01x"],
            ["a date, a space and other text", "2026-06-01 garbage"],
            ["a date and a T without a time", "2026-06-01T"],
            ["not a leap day", "2026-02-29"],
        ] as const) {
            it(`draws nothing for a value that is ${name}`, async () => {
                const cell = await renderCell(value, validFrom, "en-US");
                expect(text(cell)).toBe("");
                expect(shadow(cell).querySelector("time")).toBe(null);
            });
        }

        it("draws its own placeholder while loading", async () => {
            const cell = render(html`<uaui-date-cell loading .column=${validFrom}></uaui-date-cell>`).container.querySelector("uaui-date-cell")!;
            await settle(cell);
            expect(shadow(cell).querySelector("uaui-table-skeleton-cell")).not.toBe(null);
        });
    });

    describe("Scenario: in a table", () => {
        const rows = [
            { name: "Summer sale", validFrom: "2026-06-01" },
            { name: "No start", validFrom: undefined },
            { name: "Spring", validFrom: "2026-03-01T22:00:00-05:00" },
            { name: "Broken", validFrom: "someday" },
            { name: "New year", validFrom: "2026-01-01" },
        ];
        const columns: UauiTableColumn[] = [{ key: "name", label: "Discount", searchable: true }, { ...validFrom, searchable: true }];
        const names = (el: Element) =>
            [...shadow(el).querySelectorAll("uui-table-row:not([part~='header']):not(.column-toolbar) uui-table-cell:first-child")].map((c) => deepText(c).trim());

        async function table(sort?: { key: string; direction: string }, query?: string) {
            const el = await renderElement(
                html`<uaui-data-table lang="en-US" .columns=${columns} .rows=${rows} .sort=${sort} .query=${query}></uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
            return el;
        }

        it("sorts by date ascending, with missing and invalid dates last", async () => {
            expect(names(await table({ key: "validFrom", direction: "asc" }))).toEqual(["New year", "Spring", "Summer sale", "No start", "Broken"]);
        });

        it("sorts by date descending, with missing and invalid dates still last", async () => {
            expect(names(await table({ key: "validFrom", direction: "desc" }))).toEqual(["Summer sale", "Spring", "New year", "No start", "Broken"]);
        });

        it("searches the ISO value, not the shown text", async () => {
            expect(names(await table(undefined, "2026-06"))).toEqual(["Summer sale"]);
            expect(names(await table(undefined, "Jun 1"))).toEqual([]);
        });
    });

    describe("Scenario: accessibility", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 500px">
                        <uaui-data-table
                            label="Discounts"
                            .columns=${[{ key: "name", label: "Discount" }, validFrom]}
                            .rows=${[
                                { name: "Summer sale", validFrom: "2026-06-01" },
                                { name: "No start" },
                            ]}></uaui-data-table>
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
    });
});
