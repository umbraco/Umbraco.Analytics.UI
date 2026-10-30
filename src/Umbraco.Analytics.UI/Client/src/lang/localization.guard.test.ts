// FND-2 — Built-in text is translated: nothing a package element draws or announces is hard-coded.
// Every key reads as a marker here, so any word left in an element's text, aria-label, title or placeholder
// did not come from a key. Sample data is written DATA; see `untranslatedWords`.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import { deepQuery, renderElement, settle, shadow, type UaxTestElement } from "../internal/test/dom.js";
import { renderWithModals } from "../internal/test/modal-host.js";
import { markerFor, registerMarkerTranslations, untranslatedWords } from "../internal/test/untranslated.js";
import "../chart/time-series-chart.element.js";
import "../chart/internal/chart-tooltip.element.js";
import "../chart/internal/chart-marker-tooltip.element.js";
import "../date-range/date-range.element.js";
import "../date-range/date-range-modal.element.js";
import "../delta-badge/delta-badge.element.js";
import "../empty-state/empty-state.element.js";
import "../error-state/error-state.element.js";
import "../group-by/group-by.element.js";
import "../internal/loading/loading-bar.element.js";
import "../kpi-tile/kpi-tile.element.js";
import "../segmented/segmented.element.js";
import "../table/data-table.element.js";
import "../table-search/table-search.element.js";
import { UAX_TABLE_CELL } from "../table/cells/cell-names.js";

const points = (from: number, values: number[]) => values.map((value, i) => ({ date: `2026-06-${String(from + i).padStart(2, "0")}`, value }));
const series = [{ id: "a", label: "DATA", points: points(10, [120, 280, 140]) }];
const second = { id: "b", label: "DATA", points: points(10, [20, 80, 40]) };
const previous = [{ id: "a", label: "DATA", points: points(1, [100, 200, 130]) }];
const range = { from: "2026-06-10", to: "2026-06-12" };
const compare = { mode: "previous-period" as const, from: "2026-06-07", to: "2026-06-09" };
const markers = [
    { id: "m1", date: "2026-06-11", title: "DATA", description: "DATA" },
    { id: "m2", date: "2026-06-11", title: "DATA" },
];
const columns = [
    { key: "name", label: "DATA" },
    { key: "views", label: "DATA", elementName: UAX_TABLE_CELL.share, sortable: true, sortAs: "number", align: "end" },
    { key: "link", label: "DATA", elementName: UAX_TABLE_CELL.link },
    { key: "count", label: "DATA", elementName: UAX_TABLE_CELL.number, align: "end" },
    { key: "rate", label: "DATA", elementName: UAX_TABLE_CELL.percent, sortable: true, sortAs: "number", align: "end" },
];
const rows = Array.from({ length: 12 }, (_, i) => ({ name: `DATA${i}`, views: 100 - i, rate: 0.5, link: "DATA", count: i }));
const compareRows = rows.map((row) => ({ ...row, views: row.views + 5, rate: 0.4 }));

const wide = "width: 600px";
// Waits for the element and everything it renders, then lists the words that are not translated.
const wordsIn = async (el: UaxTestElement) => {
    await settle(el);
    return untranslatedWords(el);
};

describe("Feature: built-in text is translated, with nothing hard-coded", () => {
    let restore: () => void;
    const previousLanguage = umbLocalizationManager.documentLanguage;
    beforeAll(async () => {
        umbLocalizationManager.documentLanguage = "en-US";
        restore = await registerMarkerTranslations();
    });
    afterAll(() => {
        restore();
        umbLocalizationManager.documentLanguage = previousLanguage;
    });

    describe("Scenario: the markers are in effect", () => {
        it("shows the marker, not the English text", async () => {
            const el = await renderElement(html`<uax-empty-state></uax-empty-state>`, "uax-empty-state");
            expect(shadow(el).querySelector(".headline")?.textContent).toBe(markerFor("uaxAnalytics_emptyHeadline"));
        });
    });

    describe("Scenario: empty and error states", () => {
        it("has no hard-coded words in uax-empty-state", async () => {
            expect(await wordsIn(await renderElement(html`<uax-empty-state></uax-empty-state>`, "uax-empty-state"))).toEqual([]);
        });

        it("has no hard-coded words in uax-error-state", async () => {
            expect(await wordsIn(await renderElement(html`<uax-error-state retryable></uax-error-state>`, "uax-error-state"))).toEqual([]);
        });
    });

    describe("Scenario: delta badges", () => {
        it("has no hard-coded words in a rise, a fall, no change and percentage points", async () => {
            const el = await renderElement(
                html`<div>
                    <uax-delta-badge .value=${12.4}></uax-delta-badge>
                    <uax-delta-badge .value=${-3} lower-is-better></uax-delta-badge>
                    <uax-delta-badge .value=${0}></uax-delta-badge>
                    <uax-delta-badge .value=${2.5} unit="points"></uax-delta-badge>
                </div>`,
                "div",
            );
            expect(await wordsIn(el)).toEqual([]);
        });
    });

    describe("Scenario: KPI tiles", () => {
        it("has no hard-coded words in a tile with a value and a change", async () => {
            const el = await renderElement(html`<uax-kpi-tile label="DATA" value="12" .delta=${5}></uax-kpi-tile>`, "uax-kpi-tile");
            expect(await wordsIn(el)).toEqual([]);
        });

        it("has no hard-coded words in a tile with no data", async () => {
            const el = await renderElement(html`<uax-kpi-tile label="DATA" no-data></uax-kpi-tile>`, "uax-kpi-tile");
            expect(await wordsIn(el)).toEqual([]);
        });

        it("has no hard-coded words in a tile in error", async () => {
            const el = await renderElement(html`<uax-kpi-tile label="DATA" error></uax-kpi-tile>`, "uax-kpi-tile");
            expect(await wordsIn(el)).toEqual([]);
        });

        it("has no hard-coded words in a loading tile", async () => {
            const el = await renderElement(html`<uax-kpi-tile label="DATA" loading></uax-kpi-tile>`, "uax-kpi-tile");
            expect(await wordsIn(el)).toEqual([]);
        });
    });

    describe("Scenario: group by and segmented", () => {
        it("has no hard-coded words in uax-group-by", async () => {
            expect(await wordsIn(await renderElement(html`<uax-group-by></uax-group-by>`, "uax-group-by"))).toEqual([]);
        });

        it("has no hard-coded words in uax-segmented", async () => {
            const el = await renderElement(
                html`<uax-segmented label="DATA" value="a" .options=${[{ value: "a", label: "DATA" }, { value: "b", label: "DATA" }]}></uax-segmented>`,
                "uax-segmented",
            );
            expect(await wordsIn(el)).toEqual([]);
        });
    });

    describe("Scenario: table search", () => {
        it("has no hard-coded words in uax-table-search with a query to clear", async () => {
            const el = await renderElement(html`<uax-table-search value="DATA"></uax-table-search>`, "uax-table-search");
            expect(await wordsIn(el)).toEqual([]);
        });
    });

    describe("Scenario: loading bar", () => {
        it("has no hard-coded words in uax-loading-bar", async () => {
            expect(await wordsIn(await renderElement(html`<uax-loading-bar></uax-loading-bar>`, "uax-loading-bar"))).toEqual([]);
        });
    });

    describe("Scenario: date range button", () => {
        it("has no hard-coded words with a comparison on", async () => {
            const el = await renderWithModals(html`<uax-date-range .value=${range} .compare=${compare}></uax-date-range>`, "uax-date-range");
            expect(await wordsIn(el)).toEqual([]);
        });

        it("has no hard-coded words without one", async () => {
            const el = await renderWithModals(html`<uax-date-range .value=${range}></uax-date-range>`, "uax-date-range");
            expect(await wordsIn(el)).toEqual([]);
        });
    });

    describe("Scenario: date range dialog", () => {
        const openDialog = async (value: unknown, withCompare?: unknown) => {
            const el = await renderWithModals(html`<uax-date-range .value=${value} .compare=${withCompare}></uax-date-range>`, "uax-date-range");
            (shadow(el).querySelector("uui-button") as HTMLElement).click();
            await expect.poll(() => deepQuery<UaxTestElement>(document, "uax-date-range-modal")).not.toBe(null);
            return deepQuery<UaxTestElement>(document, "uax-date-range-modal")!;
        };

        it("has no hard-coded words with a comparison on", async () => {
            expect(await wordsIn(await openDialog(range, compare))).toEqual([]);
        });

        it("has no hard-coded words with a date missing", async () => {
            expect(await wordsIn(await openDialog({ from: "", to: "2026-06-12" }))).toEqual([]);
        });

        it("has no hard-coded words with the end before the start", async () => {
            expect(await wordsIn(await openDialog({ from: "2026-06-12", to: "2026-06-10" }))).toEqual([]);
        });
    });

    describe("Scenario: charts", () => {
        const chart = (attributes: ReturnType<typeof html>) => renderElement(attributes, "uax-time-series-chart");

        it("has no hard-coded words in a line chart with a comparison and markers", async () => {
            const el = await chart(
                html`<uax-time-series-chart style=${wide} .series=${[...series, second]} .compareSeries=${previous} .compare=${compare} .range=${range} .markers=${markers}></uax-time-series-chart>`,
            );
            await expect.poll(() => shadow(el).querySelectorAll(".marker").length).toBeGreaterThan(0);
            expect(await wordsIn(el)).toEqual([]);
        });

        it("has no hard-coded words in a stacked bar chart with a total and a comparison", async () => {
            const el = await chart(
                html`<uax-time-series-chart kind="stacked-bar" style=${wide} .series=${[...series, second]} .compareSeries=${previous}></uax-time-series-chart>`,
            );
            expect(await wordsIn(el)).toEqual([]);
        });

        it("has no hard-coded words in an empty chart", async () => {
            expect(await wordsIn(await chart(html`<uax-time-series-chart style=${wide}></uax-time-series-chart>`))).toEqual([]);
        });

        it("has no hard-coded words in a chart in error", async () => {
            expect(await wordsIn(await chart(html`<uax-time-series-chart style=${wide} error retryable></uax-time-series-chart>`))).toEqual([]);
        });

        it("has no hard-coded words in a chart loading for the first time", async () => {
            expect(await wordsIn(await chart(html`<uax-time-series-chart style=${wide} loading></uax-time-series-chart>`))).toEqual([]);
        });

        it("has no hard-coded words in a chart reloading", async () => {
            expect(await wordsIn(await chart(html`<uax-time-series-chart style=${wide} loading .series=${series}></uax-time-series-chart>`))).toEqual([]);
        });
    });

    describe("Scenario: chart tooltips", () => {
        it("has no hard-coded words in the hover tooltip with totals and comparisons", async () => {
            const compareRow = { value: 100, date: "DATA", current: 120 };
            const el = await renderElement(
                html`<uax-chart-tooltip
                    date="DATA"
                    bars
                    .rows=${[{ slot: 1, value: 120, label: "DATA", compare: compareRow }]}
                    .total=${{ value: 120, label: markerFor("uaxAnalytics_chartTotalLabel") }}
                    .compareTotal=${compareRow}></uax-chart-tooltip>`,
                "uax-chart-tooltip",
            );
            expect(await wordsIn(el)).toEqual([]);
        });

        it("has no hard-coded words in the marker tooltip with more markers than it lists", async () => {
            const el = await renderElement(
                html`<uax-chart-marker-tooltip .entries=${[{ date: "DATA", title: "DATA", description: "DATA" }]} .more=${3}></uax-chart-marker-tooltip>`,
                "uax-chart-marker-tooltip",
            );
            expect(await wordsIn(el)).toEqual([]);
        });
    });

    describe("Scenario: data table", () => {
        const table = (attributes: ReturnType<typeof html>) => renderElement(attributes, "uax-data-table");

        it("has no hard-coded words in a sortable, paged table with a comparison", async () => {
            const el = await table(
                html`<uax-data-table row-key="name" page-size="5" .columns=${columns} .rows=${rows} .compareRows=${compareRows}>
                    <uax-table-search slot="toolbar"></uax-table-search>
                </uax-data-table>`,
            );
            expect(await wordsIn(el)).toEqual([]);
        });

        it("has no hard-coded words in a table with no matching rows", async () => {
            const el = await table(html`<uax-data-table query="nothing like this" .columns=${columns} .rows=${rows}></uax-data-table>`);
            expect(await wordsIn(el)).toEqual([]);
        });

        it("has no hard-coded words in a table with no rows", async () => {
            expect(await wordsIn(await table(html`<uax-data-table .columns=${columns}></uax-data-table>`))).toEqual([]);
        });

        it("has no hard-coded words in a loading table", async () => {
            expect(await wordsIn(await table(html`<uax-data-table loading .columns=${columns}></uax-data-table>`))).toEqual([]);
        });

        it("has no hard-coded words in a table in error", async () => {
            expect(await wordsIn(await table(html`<uax-data-table error retryable .columns=${columns} .rows=${rows}></uax-data-table>`))).toEqual([]);
        });
    });
});
