/// <reference types="vite/client" />
// T61 — Progress cell: "2 of 3" with a decorative bar, the total from a row field the column's meta names.
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../../internal/test/a11y.js";
import { deepQuery, deepQueryAll, deepText, settle, shadow } from "../../internal/test/dom.js";
import "../data-table.element.js";
import "./index.js";
import { UAUI_TABLE_CELL } from "./cell-names.js";
import type { UauiProgressCellElement } from "./progress-cell.element.js";
import type { UauiTableColumn } from "../types.js";

const column: UauiTableColumn = {
    key: "completed",
    label: "Progress",
    elementName: UAUI_TABLE_CELL.progress,
    sortable: true,
    sortAs: "number",
    meta: { totalKey: "steps" },
};

async function renderCell(
    item: Record<string, unknown>,
    options: { column?: UauiTableColumn; value?: unknown; dir?: string; lang?: string; total?: number } = {},
): Promise<UauiProgressCellElement> {
    const col = options.column ?? column;
    const value = "value" in options ? options.value : item[col.key];
    const cell = render(
        html`<div style="width: 200px" dir=${options.dir ?? "ltr"}>
            <uaui-progress-cell lang=${options.lang ?? "en-US"} .column=${col} .item=${item} .value=${value} .total=${options.total}></uaui-progress-cell>
        </div>`,
    ).container.querySelector("uaui-progress-cell")!;
    await settle(cell);
    return cell;
}

const text = (cell: Element) => shadow(cell).querySelector(".progress-top")?.textContent?.trim() ?? "";
const bar = (cell: Element) => deepQuery<HTMLElement>(shadow(cell), ".share-bar");
const track = (cell: Element) => deepQuery<HTMLElement>(shadow(cell), ".track");

describe("Feature: the progress cell", () => {
    it("is named UAUI_TABLE_CELL.progress", () => {
        expect(UAUI_TABLE_CELL.progress).toBe("uaui-progress-cell");
    });

    describe("Scenario: a row part way through", () => {
        it('shows "2 of 3"', async () => {
            const cell = await renderCell({ completed: 2, steps: 3 });
            expect(text(cell)).toBe("2 of 3");
        });

        it("fills the bar to the ratio", async () => {
            const cell = await renderCell({ completed: 2, steps: 3 });
            expect(bar(cell)?.style.width).toBe("66.67%");
        });

        it("hides the bar from assistive tech, so the text is read once", async () => {
            const cell = await renderCell({ completed: 2, steps: 3 });
            expect(track(cell)?.getAttribute("aria-hidden")).toBe("true");
            expect(deepQuery(shadow(cell), "[role=progressbar]")).toBeNull();
        });

        it("formats both numbers in the editor's culture", async () => {
            const cell = await renderCell({ completed: 1200, steps: 3400 }, { lang: "da-DK" });
            expect(text(cell)).toBe("1.200 of 3.400");
        });

        it("formats both numbers with the column's valueFormat", async () => {
            const cell = await renderCell({ completed: 1, steps: 4 }, { column: { ...column, valueFormat: { minimumFractionDigits: 1 } } });
            expect(text(cell)).toBe("1.0 of 4.0");
        });

        it("takes the total from the total property over the row", async () => {
            const cell = await renderCell({ completed: 1, steps: 3 }, { total: 5 });
            expect(text(cell)).toBe("1 of 5");
        });

        it("uses the column's palette slot for the bar", async () => {
            const cell = await renderCell({ completed: 1, steps: 2 }, { column: { ...column, meta: { totalKey: "steps", color: 3 } } });
            expect(bar(cell)?.style.backgroundColor).toBe("var(--uaui-color-series-3)");
        });
    });

    describe("Scenario: edge values", () => {
        it("fills the bar for a finished row", async () => {
            const cell = await renderCell({ completed: 3, steps: 3 });
            expect(bar(cell)?.style.width).toBe("100%");
        });

        it("caps the bar at full when the count passes the total", async () => {
            const cell = await renderCell({ completed: 5, steps: 3 });
            expect(text(cell)).toBe("5 of 3");
            expect(bar(cell)?.style.width).toBe("100%");
        });

        it('shows "0 of 0" and an empty bar for a total of 0', async () => {
            const cell = await renderCell({ completed: 0, steps: 0 });
            expect(text(cell)).toBe("0 of 0");
            expect(bar(cell)?.style.width).toBe("0%");
        });

        it("shows the count alone and no bar without a total", async () => {
            const cell = await renderCell({ completed: 2 });
            expect(text(cell)).toBe("2");
            expect(bar(cell)).toBeNull();
        });

        it("shows the count alone when the total isn't a number", async () => {
            const cell = await renderCell({ completed: 2, steps: "three" });
            expect(text(cell)).toBe("2");
        });

        it("shows the count alone without a totalKey", async () => {
            const cell = await renderCell({ completed: 2, steps: 3 }, { column: { ...column, meta: {} } });
            expect(text(cell)).toBe("2");
        });

        it("draws nothing for a missing value", async () => {
            const cell = await renderCell({ steps: 3 });
            expect(deepText(shadow(cell)).trim()).toBe("");
        });

        it("draws nothing for a value that isn't a number", async () => {
            const cell = await renderCell({ completed: "two", steps: 3 });
            expect(deepText(shadow(cell)).trim()).toBe("");
        });
    });

    describe("Scenario: right to left", () => {
        it("fills the bar from the right edge", async () => {
            const cell = await renderCell({ completed: 1, steps: 3 }, { dir: "rtl" });
            const filled = bar(cell)!.getBoundingClientRect();
            const all = track(cell)!.getBoundingClientRect();
            expect(Math.round(filled.right)).toBe(Math.round(all.right));
            expect(filled.width).toBeLessThan(all.width / 2);
        });

        it("fills the bar from the left edge left to right", async () => {
            const cell = await renderCell({ completed: 1, steps: 3 });
            const filled = bar(cell)!.getBoundingClientRect();
            expect(Math.round(filled.left)).toBe(Math.round(track(cell)!.getBoundingClientRect().left));
        });
    });

    describe("Scenario: loading", () => {
        it("draws a text and a bar placeholder", async () => {
            const cell = render(html`<uaui-progress-cell loading .column=${column}></uaui-progress-cell>`).container.querySelector("uaui-progress-cell")!;
            await settle(cell);
            expect(shadow(cell).querySelectorAll("uaui-skeleton")).toHaveLength(2);
        });
    });

    describe("Scenario: in a data table", () => {
        const rows = [
            { name: "Home", completed: 1, steps: 3 },
            { name: "About", completed: 3, steps: 3 },
            { name: "News", completed: 2, steps: 4 },
        ];

        it("sorts by the completed count with sortAs number", async () => {
            const table = render(
                html`<uaui-data-table
                    .columns=${[{ key: "name", label: "Page" }, column]}
                    .rows=${rows}
                    .sort=${{ key: "completed", direction: "desc" }}></uaui-data-table>`,
            ).container.querySelector("uaui-data-table")!;
            await settle(table);
            const cells = deepQueryAll(table.shadowRoot!, "uaui-progress-cell");
            await Promise.all(cells.map((c) => settle(c)));
            expect(cells.map(text)).toEqual(["3 of 3", "2 of 4", "1 of 3"]);
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
                const table = render(
                    html`<div style="background: var(--uui-color-surface)">
                        <uaui-data-table
                            label="Workflows"
                            .columns=${[{ key: "name", label: "Page" }, column]}
                            .rows=${[
                                { name: "Home", completed: 1, steps: 3 },
                                { name: "News", completed: 0, steps: 0 },
                                { name: "About", completed: 2 },
                            ]}></uaui-data-table>
                    </div>`,
                ).container.querySelector("div")!;
                await settle(table.querySelector("uaui-data-table")!);
                return await axeRun(table);
            } finally {
                theme.remove();
            }
        }

        it("passes the a11y audit in light", async () => {
            expect(await audit()).toHaveNoViolations();
        });

        it("passes the a11y audit in dark", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });

        it("passes the a11y audit in high contrast", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });
    });
});
