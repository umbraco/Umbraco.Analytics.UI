// SAC-13 AC5 — axe passes in both builds. The full element suite runs on the core build; this is the Umbraco build's
// smoke set: each public element renders against the backoffice's own Lit, UUI and base class, and passes axe.
import { describe, expect, it } from "vitest";
import { html, type TemplateResult } from "#platform/lit";
import { axeRun } from "../../internal/test/a11y.js";
import { renderElement, settle } from "../../internal/test/dom.js";
// The public entry, as a product loads it.
import "../../index.js";
import "../../table/cells/index.js";
import { UAUI_TABLE_CELL } from "../../table/cells/cell-names.js";

const points = (values: number[]) => values.map((value, i) => ({ date: `2026-06-${String(10 + i).padStart(2, "0")}`, value }));
const categoryPoints = (a: number, b: number) => [{ category: "a", value: a }, { category: "b", value: b }];
const range = { from: "2026-06-10", to: "2026-06-12" };
const columns = [
    { key: "name", label: "Name" },
    { key: "views", label: "Views", elementName: UAUI_TABLE_CELL.number, align: "end" as const },
    { key: "rate", label: "Rate", elementName: UAUI_TABLE_CELL.percent, align: "end" as const },
];
const rows = [{ name: "Home", views: 120, rate: 0.5 }, { name: "About", views: 80, rate: 0.25 }];
const wide = "width: 600px";

const elements: Record<string, TemplateResult> = {
    "uaui-kpi-tile": html`<uaui-kpi-tile label="Visitors" value="1,200" .delta=${5}></uaui-kpi-tile>`,
    "uaui-delta-badge": html`<uaui-delta-badge .value=${12}></uaui-delta-badge>`,
    "uaui-stat": html`<uaui-stat label="Visitors" value="1200" .delta=${5}></uaui-stat>`,
    "uaui-time-series-chart": html`<uaui-time-series-chart style=${wide} .range=${range} .series=${[{ id: "a", label: "Visitors", points: points([120, 280, 140]) }]}></uaui-time-series-chart>`,
    "uaui-category-chart": html`<uaui-category-chart style=${wide} .categories=${[{ id: "a", label: "A" }, { id: "b", label: "B" }]} .series=${[{ id: "s", label: "Visits", points: categoryPoints(3, 5) }]}></uaui-category-chart>`,
    "uaui-funnel": html`<uaui-funnel style=${wide} .steps=${[{ id: "a", label: "Visited", value: 100 }, { id: "b", label: "Signed up", value: 40 }]}></uaui-funnel>`,
    "uaui-data-table": html`<uaui-data-table .columns=${columns} .rows=${rows}></uaui-data-table>`,
    "uaui-table-compare-badge": html`<uaui-table-compare-badge .value=${120} .compareValue=${100}></uaui-table-compare-badge>`,
    "uaui-table-skeleton-cell": html`<uaui-table-skeleton-cell></uaui-table-skeleton-cell>`,
    // The built-in cells, each drawn on its own with the column meta it reads.
    "uaui-text-cell": html`<uaui-text-cell .column=${{ key: "name", label: "Name", meta: { secondaryKey: "path" } }} .item=${{ path: "/home" }} .value=${"Home"}></uaui-text-cell>`,
    "uaui-number-cell": html`<uaui-number-cell .column=${{ key: "views", label: "Views" }} .value=${1200}></uaui-number-cell>`,
    "uaui-percent-cell": html`<uaui-percent-cell .column=${{ key: "rate", label: "Rate" }} .value=${0.5}></uaui-percent-cell>`,
    "uaui-date-cell": html`<uaui-date-cell .column=${{ key: "when", label: "When" }} .value=${"2026-06-10"}></uaui-date-cell>`,
    "uaui-link-cell": html`<uaui-link-cell .column=${{ key: "name", label: "Page", meta: { hrefKey: "url" } }} .item=${{ url: "https://example.com" }} .value=${"Home"}></uaui-link-cell>`,
    "uaui-progress-cell": html`<uaui-progress-cell .column=${{ key: "done", label: "Done", meta: { totalKey: "total" } }} .item=${{ total: 10 }} .value=${4}></uaui-progress-cell>`,
    "uaui-share-cell": html`<uaui-share-cell .column=${{ key: "views", label: "Views" }} .value=${40} .total=${80}></uaui-share-cell>`,
    "uaui-status-cell": html`<uaui-status-cell .column=${{ key: "state", label: "State", meta: { colorKey: "color", textKey: "text" } }} .item=${{ color: "positive", text: "Healthy" }} .value=${"ok"}></uaui-status-cell>`,
    "uaui-search-field": html`<uaui-search-field value="home"></uaui-search-field>`,
    "uaui-date-range": html`<uaui-date-range .value=${range}></uaui-date-range>`,
    "uaui-toggle-group": html`<uaui-toggle-group label="View" value="a" .options=${[{ value: "a", label: "Daily" }, { value: "b", label: "Weekly" }]}></uaui-toggle-group>`,
    "uaui-group-by": html`<uaui-group-by></uaui-group-by>`,
    "uaui-empty-state": html`<uaui-empty-state></uaui-empty-state>`,
    "uaui-error-state": html`<uaui-error-state retryable></uaui-error-state>`,
};

// Given the element tests, When they run on the core build and the Umbraco smoke set, Then every axe check passes:
// the core build's element specs each end in an axe check, and this is the smoke set.
describe("Feature: axe passes in both builds", () => {
    for (const [tag, template] of Object.entries(elements)) {
        describe(`Scenario: ${tag} renders`, () => {
            it("draws something into its shadow root", async () => {
                const el = await renderElement(template, tag);
                await settle(el);
                expect(el.shadowRoot?.childElementCount).toBeGreaterThan(0);
            });

            it("passes axe", async () => {
                const el = await renderElement(template, tag);
                await settle(el);
                expect(await axeRun(el)).toHaveNoViolations();
            });
        });
    }
});
