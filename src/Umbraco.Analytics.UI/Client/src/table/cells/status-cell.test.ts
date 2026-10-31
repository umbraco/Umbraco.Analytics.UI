/// <reference types="vite/client" />
// T48 — Status cell: a row's value with a tone the product picks per row, never colour alone.
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../../internal/test/a11y.js";
import { deepText, renderElement, settle, shadow } from "../../internal/test/dom.js";
import "../data-table.element.js";
import "./index.js";
import { UAUI_TABLE_CELL } from "./cell-names.js";
import type { UauiStatusCellElement } from "./status-cell.element.js";
import type { UauiTableColumn } from "../types.js";

const DAYS: Intl.NumberFormatOptions = { style: "unit", unit: "day", unitDisplay: "long", maximumFractionDigits: 0 };
const daysColumn: UauiTableColumn = {
    key: "days",
    label: "Days left",
    elementName: UAUI_TABLE_CELL.status,
    valueFormat: DAYS,
    align: "end",
    sortable: true,
    sortAs: "number",
    meta: { toneKey: "tone", textKey: "text" },
};

async function renderCell(column: UauiTableColumn, item: Record<string, unknown>, value: unknown = item[column.key]): Promise<UauiStatusCellElement> {
    const cell = render(html`<uaui-status-cell .column=${column} .item=${item} .value=${value}></uaui-status-cell>`).container.querySelector("uaui-status-cell")!;
    await settle(cell);
    return cell;
}

const status = (cell: Element) => shadow(cell).querySelector<HTMLElement>(".status");

describe("Feature: the status cell", () => {
    it("is named UAUI_TABLE_CELL.status", () => {
        expect(UAUI_TABLE_CELL.status).toBe("uaui-status-cell");
    });

    describe("Scenario: the tone comes from the row", () => {
        for (const tone of ["default", "positive", "warning", "danger"] as const) {
            it(`shows the ${tone} tone from the toneKey field`, async () => {
                const cell = await renderCell(daysColumn, { days: 3, tone });
                expect(status(cell)?.getAttribute("data-tone")).toBe(tone);
            });
        }

        it("falls back to default for an unknown tone", async () => {
            const cell = await renderCell(daysColumn, { days: 3, tone: "red" });
            expect(status(cell)?.getAttribute("data-tone")).toBe("default");
        });

        it("falls back to default for a tone that isn't text", async () => {
            const cell = await renderCell(daysColumn, { days: 3, tone: 2 });
            expect(status(cell)?.getAttribute("data-tone")).toBe("default");
        });

        it("is default without a toneKey", async () => {
            const cell = await renderCell({ key: "state", label: "State", meta: {} }, { state: "Active", tone: "positive" });
            expect(status(cell)?.getAttribute("data-tone")).toBe("default");
        });

        it("gives each tone its own colours", async () => {
            const colours = new Set<string>();
            for (const tone of ["default", "positive", "warning", "danger"]) {
                const cell = await renderCell(daysColumn, { days: 3, tone });
                const style = getComputedStyle(status(cell)!);
                colours.add(`${style.color}|${style.backgroundColor}`);
            }
            expect(colours.size).toBe(4);
        });
    });

    describe("Scenario: the text", () => {
        it("shows the row's textKey field", async () => {
            const cell = await renderCell(daysColumn, { days: 0, tone: "danger", text: "Out of stock" });
            expect(deepText(cell).trim()).toBe("Out of stock");
        });

        it("shows the value formatted with valueFormat when the row has no text", async () => {
            const cell = await renderCell(daysColumn, { days: 12, tone: "warning" });
            expect(deepText(cell).trim()).toBe(new Intl.NumberFormat("en", DAYS).format(12));
        });

        it("shows the value formatted when the text is only spaces", async () => {
            const cell = await renderCell(daysColumn, { days: 1, text: "  " });
            expect(deepText(cell).trim()).toBe(new Intl.NumberFormat("en", DAYS).format(1));
        });

        it("shows a text value as it is", async () => {
            const cell = await renderCell({ key: "state", label: "State", meta: { toneKey: "tone" } }, { state: "Inactive", tone: "default" });
            expect(deepText(cell).trim()).toBe("Inactive");
        });

        it("shows nothing, not an empty label, for a missing value with no text", async () => {
            const cell = await renderCell(daysColumn, { tone: "danger" });
            expect(status(cell)).toBe(null);
        });

        it("draws its own placeholder while loading", async () => {
            const cell = render(html`<uaui-status-cell loading .column=${daysColumn}></uaui-status-cell>`).container.querySelector("uaui-status-cell")!;
            await settle(cell);
            expect(shadow(cell).querySelector("uaui-table-skeleton-cell")).not.toBe(null);
            expect(status(cell)).toBe(null);
        });
    });

    describe("Scenario: in a table", () => {
        const rows = [
            { name: "Hoodie", days: 12, tone: "warning" },
            { name: "Mug", days: 0, tone: "danger", text: "Out of stock" },
            { name: "Cap", days: 30, tone: "positive" },
        ];
        const columns: UauiTableColumn[] = [{ key: "name", label: "Product", searchable: true }, daysColumn];
        const cellTexts = (el: Element) =>
            [...shadow(el).querySelectorAll("uui-table-row:not([part~='header']):not(.column-toolbar) uaui-status-cell")].map((c) => deepText(c).trim());

        it("sorts by the value, not the text", async () => {
            const el = await renderElement(
                html`<uaui-data-table .columns=${columns} .rows=${rows} .sort=${{ key: "days", direction: "asc" }}></uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
            const format = new Intl.NumberFormat("en", DAYS);
            expect(cellTexts(el)).toEqual(["Out of stock", format.format(12), format.format(30)]);
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
                            label="Stock"
                            .columns=${[{ key: "name", label: "Product" }, daysColumn]}
                            .rows=${[
                                { name: "Mug", days: 0, tone: "danger", text: "Out of stock" },
                                { name: "Hoodie", days: 12, tone: "warning" },
                                { name: "Cap", days: 30, tone: "positive" },
                                { name: "Pin", days: 40, tone: "default", text: "Unknown" },
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

        it("passes in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });
    });
});
