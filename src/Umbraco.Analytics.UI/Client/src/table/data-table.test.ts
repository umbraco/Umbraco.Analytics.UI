// TBL-1 — Table cells by column type
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { renderElement, shadow, type UaxTestElement } from "../internal/test/pending.js";
import "./data-table.element.js";
import { pageColumns, pageRows } from "./table-fixtures.js";

const firstRowCells = (el: Element) => [...shadow(el).querySelector("uui-table-row")!.querySelectorAll("uui-table-cell")];
const bars = (el: Element, column: number) =>
    [...shadow(el).querySelectorAll(`uui-table-row uui-table-cell:nth-child(${column + 1}) .share-bar`)] as HTMLElement[];

describe("Feature: table cells by column type", () => {
    describe("Scenario: a number column in en-US", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table .columns=${[{ key: "n", label: "N", type: "number" }]} .rows=${[{ n: 1234 }]}></uax-data-table>`,
                "uax-data-table",
            );
        });

        it("shows 1,234", () => {
            expect(firstRowCells(el)[0].textContent?.trim()).toBe("1,234");
        });
    });

    describe("Scenario: share columns", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<div style="--uax-series-2: rgb(10, 20, 30)">
                    <uax-data-table .columns=${pageColumns} .rows=${pageRows}></uax-data-table>
                </div>`,
                "uax-data-table",
            );
        });

        it("shows the value and its percent of the column total", () => {
            expect(firstRowCells(el)[1].textContent).toContain("210 (77.2%)");
        });

        it("draws the largest value's bar at full width", () => {
            expect(bars(el, 1)[0].style.width).toBe("100%");
        });

        it("colours the second share column's bars with --uax-series-2", () => {
            expect(getComputedStyle(bars(el, 2)[0]).backgroundColor).toBe("rgb(10, 20, 30)");
        });

        it("renders link cells as anchors to the row's url", () => {
            expect(firstRowCells(el)[0].querySelector("a")?.getAttribute("href")).toBe("https://example.com/");
        });
    });

    describe("Scenario: comparing with earlier rows", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            const compareRows = [{ url: "https://example.com/", pageviews: 190, sessions: 30 }];
            el = await renderElement(
                html`<uax-data-table .columns=${pageColumns} .rows=${pageRows} .compareRows=${compareRows} row-key="url"></uax-data-table>`,
                "uax-data-table",
            );
        });

        it.skip("puts a small change badge after the share value", () => {
            expect(firstRowCells(el)[1].querySelector("uax-delta-badge[size='sm']")).not.toBe(null);
        });
    });

    describe("Scenario: content in the toolbar slot", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table .columns=${pageColumns} .rows=${pageRows}><div slot="toolbar" id="totals">272</div></uax-data-table>`,
                "uax-data-table",
            );
        });

        it("sits above the header row", () => {
            const toolbar = el.querySelector("#totals")!.getBoundingClientRect();
            const header = shadow(el).querySelector("uui-table-head")!.getBoundingClientRect();
            expect(toolbar.bottom).toBeLessThanOrEqual(header.top);
        });
    });

    describe("Scenario: the toolbar's padding", () => {
        it("takes --uax-table-padding", async () => {
            const el = await renderElement(
                html`<uax-data-table style="--uax-table-padding: 7px" .columns=${pageColumns} .rows=${pageRows}>
                    <div slot="toolbar" id="totals">272</div>
                </uax-data-table>`,
                "uax-data-table",
            );
            expect(el.querySelector("#totals")!.getBoundingClientRect().left - el.getBoundingClientRect().left).toBe(7);
        });
    });

    describe("Scenario: no toolbar content", () => {
        it("adds no space above the header row", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${pageColumns} .rows=${pageRows}></uax-data-table>`, "uax-data-table");
            expect(shadow(el).querySelector("uui-table-head")!.getBoundingClientRect().top).toBe(el.getBoundingClientRect().top);
        });
    });
});

describe("Feature: table cell details", () => {
    const render1 = (columns: unknown[], rows: unknown[], width = "600px") =>
        renderElement(
            html`<div style="width: ${width}"><uax-data-table .columns=${columns} .rows=${rows}></uax-data-table></div>`,
            "uax-data-table",
        );
    const cell = (el: Element, index = 0) => firstRowCells(el)[index] as HTMLElement;

    describe("Scenario: a number column with a currency format", () => {
        it("shows the value in that format", async () => {
            const el = await render1(
                [{ key: "n", label: "N", type: "number", valueFormat: { style: "currency", currency: "EUR" } }],
                [{ n: 1234.5 }],
            );
            expect(cell(el).textContent?.trim()).toBe("€1,234.50");
        });
    });

    describe("Scenario: a percent column", () => {
        it("shows a fraction as a percentage", async () => {
            const el = await render1([{ key: "p", label: "P", type: "percent" }], [{ p: 0.254 }]);
            expect(cell(el).textContent?.trim()).toBe("25.4%");
        });
    });

    describe("Scenario: a number column", () => {
        it("right-aligns the cell", async () => {
            const el = await render1([{ key: "n", label: "N", type: "number" }], [{ n: 5 }]);
            expect(getComputedStyle(cell(el)).textAlign).toBe("end");
        });

        it("uses tabular numerals", async () => {
            const el = await render1([{ key: "n", label: "N", type: "number" }], [{ n: 5 }]);
            expect(getComputedStyle(cell(el)).fontVariantNumeric).toBe("tabular-nums");
        });

        it("right-aligns the header too", async () => {
            const el = await render1([{ key: "n", label: "N", type: "number" }], [{ n: 5 }]);
            expect(getComputedStyle(shadow(el).querySelector("uui-table-head-cell")!).textAlign).toBe("end");
        });
    });

    describe("Scenario: a text column with align end", () => {
        it("right-aligns the cell", async () => {
            const el = await render1([{ key: "t", label: "T", type: "text", align: "end" }], [{ t: "x" }]);
            expect(getComputedStyle(cell(el)).textAlign).toBe("end");
        });
    });

    describe("Scenario: a share column with a chosen colour slot", () => {
        it("draws the bar in that slot's colour", async () => {
            const el = await renderElement(
                html`<div style="--uax-series-3: rgb(1, 2, 3)">
                    <uax-data-table .columns=${[{ key: "n", label: "N", type: "share", color: 3 }]} .rows=${[{ n: 5 }]}></uax-data-table>
                </div>`,
                "uax-data-table",
            );
            expect(getComputedStyle(bars(el, 0)[0]).backgroundColor).toBe("rgb(1, 2, 3)");
        });
    });

    describe("Scenario: a share column with a number format", () => {
        it("formats the value but not the percent of total", async () => {
            const el = await render1(
                [{ key: "n", label: "N", type: "share", valueFormat: { style: "currency", currency: "EUR" } }],
                [{ n: 1000 }, { n: 3000 }],
            );
            expect(cell(el).textContent).toContain("€1,000.00 (25.0%)");
        });
    });

    describe("Scenario: a share column where every value is 0", () => {
        it("shows 0.0% and an empty bar", async () => {
            const el = await render1([{ key: "n", label: "N", type: "share" }], [{ n: 0 }]);
            expect(cell(el).textContent).toContain("0 (0.0%)");
        });
    });

    describe("Scenario: a share bar for a smaller value", () => {
        it("is scaled to the largest value", async () => {
            const el = await renderElement(html`<uax-data-table .columns=${pageColumns} .rows=${pageRows}></uax-data-table>`, "uax-data-table");
            expect(bars(el, 1)[1].style.width).toBe("29.52%");
        });
    });

    describe("Scenario: a long URL in a link column", () => {
        it("wraps instead of overflowing the cell", async () => {
            const url = "https://example.com/" + "a-very-long-page-name/".repeat(8);
            const el = await render1([{ key: "url", label: "URL", type: "link", hrefKey: "url" }], [{ url }], "300px");
            expect(cell(el).scrollWidth).toBeLessThanOrEqual(cell(el).clientWidth);
        });
    });

    describe("Scenario (sad path): a link with an unsafe URL", () => {
        it("shows the text without a link", async () => {
            const el = await render1(
                [{ key: "url", label: "URL", type: "link", hrefKey: "url" }],
                [{ url: "javascript:alert(1)" }],
            );
            expect(cell(el).querySelector("a")).toBe(null);
        });
    });

    describe("Scenario (sad path): a link row without a URL", () => {
        it("still shows the text", async () => {
            const el = await render1([{ key: "name", label: "Name", type: "link", hrefKey: "url" }], [{ name: "Home" }]);
            expect(cell(el).textContent?.trim()).toBe("Home");
        });
    });

    describe("Scenario (sad path): a number column with a missing value", () => {
        it("leaves the cell empty", async () => {
            const el = await render1([{ key: "n", label: "N", type: "number" }], [{ n: undefined }]);
            expect(cell(el).textContent?.trim()).toBe("");
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
                        <uax-data-table .columns=${pageColumns} .rows=${pageRows}>
                            <div slot="toolbar">Total 272</div>
                        </uax-data-table>
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
