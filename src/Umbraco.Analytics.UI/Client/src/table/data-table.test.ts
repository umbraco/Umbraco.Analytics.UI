// TBL-1 — Table cells by column type
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQuery, deepQueryAll, deepText, renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import { pageColumns, pageRows } from "./table-fixtures.js";
import { UAUI_TABLE_CELL } from "./cells/cell-names.js";

const firstRowCells = (el: Element) => [...shadow(el).querySelector("uui-table-row:not(.summary)")!.querySelectorAll("uui-table-cell")];
const bars = (el: Element, column: number) =>
    [...shadow(el).querySelectorAll(`uui-table-row:not(.summary) uui-table-cell:nth-child(${column + 1})`)].flatMap((cell) =>
        deepQueryAll<HTMLElement>(cell, ".share-bar"),
    );

describe("Feature: table cells by column type", () => {
    describe("Scenario: a number column in en-US", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-data-table .columns=${[{ key: "n", label: "N", elementName: UAUI_TABLE_CELL.number, align: "end" }]} .rows=${[{ n: 1234 }]}></uaui-data-table>`,
                "uaui-data-table",
            );
        });

        it("shows 1,234", () => {
            expect(deepText(firstRowCells(el)[0]).trim()).toBe("1,234");
        });
    });

    describe("Scenario: share columns", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<div style="--uaui-series-2: rgb(10, 20, 30)">
                    <uaui-data-table .columns=${pageColumns} .rows=${pageRows}></uaui-data-table>
                </div>`,
                "uaui-data-table",
            );
        });

        it("shows the value and its percent of the column total", () => {
            expect(deepText(firstRowCells(el)[1])).toContain("210 (77.2%)");
        });

        it("draws the largest value's bar at full width", () => {
            expect(bars(el, 1)[0].style.width).toBe("100%");
        });

        it("colours the second share column's bars with --uaui-series-2", () => {
            expect(getComputedStyle(bars(el, 2)[0]).backgroundColor).toBe("rgb(10, 20, 30)");
        });

        it("renders link cells as anchors to the row's url", () => {
            expect(deepQuery(firstRowCells(el)[0], "a")?.getAttribute("href")).toBe("https://example.com/");
        });
    });

    describe("Scenario: comparing with earlier rows", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            const compareRows = [{ url: "https://example.com/", pageviews: 190, sessions: 30 }];
            el = await renderElement(
                html`<uaui-data-table .columns=${pageColumns} .rows=${pageRows} .compareRows=${compareRows} row-key="url"></uaui-data-table>`,
                "uaui-data-table",
            );
        });

        it("puts a small change badge after the share value", () => {
            expect(deepQuery(firstRowCells(el)[1], "uaui-delta-badge[size='sm']")).not.toBe(null);
        });
    });

    describe("Scenario: content in the toolbar slot", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-data-table .columns=${pageColumns} .rows=${pageRows}><div slot="toolbar" id="totals">272</div></uaui-data-table>`,
                "uaui-data-table",
            );
        });

        it("sits above the header row", () => {
            const toolbar = el.querySelector("#totals")!.getBoundingClientRect();
            const header = shadow(el).querySelector("uui-table-head")!.getBoundingClientRect();
            expect(toolbar.bottom).toBeLessThanOrEqual(header.top);
        });
    });

    describe("Scenario: the toolbar's padding", () => {
        it("takes --uaui-table-padding", async () => {
            const el = await renderElement(
                html`<uaui-data-table style="--uaui-table-padding: 7px" .columns=${pageColumns} .rows=${pageRows}>
                    <div slot="toolbar" id="totals">272</div>
                </uaui-data-table>`,
                "uaui-data-table",
            );
            expect(el.querySelector("#totals")!.getBoundingClientRect().left - el.getBoundingClientRect().left).toBe(7);
        });
    });

    describe("Scenario: no toolbar content", () => {
        it("adds no space above the header row", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${pageColumns} .rows=${pageRows}></uaui-data-table>`, "uaui-data-table");
            expect(shadow(el).querySelector("uui-table-head")!.getBoundingClientRect().top).toBe(el.getBoundingClientRect().top);
        });
    });
});

describe("Feature: table cell details", () => {
    const render1 = (columns: unknown[], rows: unknown[], width = "600px") =>
        renderElement(
            html`<div style="width: ${width}"><uaui-data-table .columns=${columns} .rows=${rows}></uaui-data-table></div>`,
            "uaui-data-table",
        );
    const cell = (el: Element, index = 0) => firstRowCells(el)[index] as HTMLElement;

    describe("Scenario: a number column with a currency format", () => {
        it("shows the value in that format", async () => {
            const el = await render1(
                [{ key: "n", label: "N", elementName: UAUI_TABLE_CELL.number, align: "end", valueFormat: { style: "currency", currency: "EUR" } }],
                [{ n: 1234.5 }],
            );
            expect(deepText(cell(el)).trim()).toBe("€1,234.50");
        });
    });

    describe("Scenario: a percent column", () => {
        it("shows a fraction as a percentage", async () => {
            const el = await render1([{ key: "p", label: "P", elementName: UAUI_TABLE_CELL.percent, align: "end" }], [{ p: 0.254 }]);
            expect(deepText(cell(el)).trim()).toBe("25.4%");
        });
    });

    describe("Scenario: a column with align end", () => {
        it("right-aligns the cell", async () => {
            const el = await render1([{ key: "n", label: "N", elementName: UAUI_TABLE_CELL.number, align: "end" }], [{ n: 5 }]);
            expect(getComputedStyle(cell(el)).textAlign).toBe("end");
        });

        it("uses tabular numerals", async () => {
            const el = await render1([{ key: "n", label: "N", elementName: UAUI_TABLE_CELL.number, align: "end" }], [{ n: 5 }]);
            expect(getComputedStyle(cell(el).firstElementChild!).fontVariantNumeric).toBe("tabular-nums");
        });

        it("right-aligns the header too", async () => {
            const el = await render1([{ key: "n", label: "N", elementName: UAUI_TABLE_CELL.number, align: "end" }], [{ n: 5 }]);
            expect(getComputedStyle(shadow(el).querySelector("uui-table-head-cell")!).textAlign).toBe("end");
        });
    });

    describe("Scenario: a text column with align end", () => {
        it("right-aligns the cell", async () => {
            const el = await render1([{ key: "t", label: "T", align: "end" }], [{ t: "x" }]);
            expect(getComputedStyle(cell(el)).textAlign).toBe("end");
        });
    });

    describe("Scenario: a share column with a chosen colour slot", () => {
        it("draws the bar in that slot's colour", async () => {
            const el = await renderElement(
                html`<div style="--uaui-series-3: rgb(1, 2, 3)">
                    <uaui-data-table .columns=${[{ key: "n", label: "N", elementName: UAUI_TABLE_CELL.share, meta: { color: 3 } }]} .rows=${[{ n: 5 }]}></uaui-data-table>
                </div>`,
                "uaui-data-table",
            );
            expect(getComputedStyle(bars(el, 0)[0]).backgroundColor).toBe("rgb(1, 2, 3)");
        });
    });

    describe("Scenario: a share column with a number format", () => {
        it("formats the value but not the percent of total", async () => {
            const el = await render1(
                [{ key: "n", label: "N", elementName: UAUI_TABLE_CELL.share, valueFormat: { style: "currency", currency: "EUR" } }],
                [{ n: 1000 }, { n: 3000 }],
            );
            expect(deepText(cell(el))).toContain("€1,000.00 (25.0%)");
        });
    });

    describe("Scenario: a share column where every value is 0", () => {
        it("shows 0.0% and an empty bar", async () => {
            const el = await render1([{ key: "n", label: "N", elementName: UAUI_TABLE_CELL.share }], [{ n: 0 }]);
            expect(deepText(cell(el))).toContain("0 (0.0%)");
        });
    });

    describe("Scenario: a share bar for a smaller value", () => {
        it("is scaled to the largest value", async () => {
            const el = await renderElement(html`<uaui-data-table .columns=${pageColumns} .rows=${pageRows}></uaui-data-table>`, "uaui-data-table");
            expect(bars(el, 1)[1].style.width).toBe("29.52%");
        });
    });

    describe("Scenario: a long URL in a link column", () => {
        it("wraps instead of overflowing the cell", async () => {
            const url = "https://example.com/" + "a-very-long-page-name/".repeat(8);
            const el = await render1([{ key: "url", label: "URL", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" } }], [{ url }], "300px");
            expect(cell(el).scrollWidth).toBeLessThanOrEqual(cell(el).clientWidth);
        });
    });

    describe("Scenario (sad path): a link with an unsafe URL", () => {
        it("shows the text without a link", async () => {
            const el = await render1(
                [{ key: "url", label: "URL", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" } }],
                [{ url: "javascript:alert(1)" }],
            );
            expect(deepQuery(cell(el), "a")).toBe(null);
        });
    });

    describe("Scenario (sad path): a link row without a URL", () => {
        it("still shows the text", async () => {
            const el = await render1([{ key: "name", label: "Name", elementName: UAUI_TABLE_CELL.link, meta: { hrefKey: "url" } }], [{ name: "Home" }]);
            expect(deepText(cell(el)).trim()).toBe("Home");
        });
    });

    describe("Scenario (sad path): a number column with a missing value", () => {
        it("leaves the cell empty", async () => {
            const el = await render1([{ key: "n", label: "N", elementName: UAUI_TABLE_CELL.number, align: "end" }], [{ n: undefined }]);
            expect(deepText(cell(el)).trim()).toBe("");
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
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 700px">
                        <uaui-data-table .columns=${pageColumns} .rows=${pageRows}>
                            <div slot="toolbar">Total 272</div>
                        </uaui-data-table>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uaui-data-table")!.updateComplete;
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
