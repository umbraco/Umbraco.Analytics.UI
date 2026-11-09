import { beforeEach, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import { html } from "#platform/lit";
import { axeRun } from "../../internal/test/a11y.js";
import { renderElement, shadow, type UauiTestElement } from "../../internal/test/dom.js";
import "./chart-data-table.element.js";

const labels = ["1 Jun 2026", "2 Jun 2026", "3 Jun 2026"];
const series = ["Pageviews", "Sessions", "Unique visitors", "Bounce rate"].map((label, i) => ({
    id: `s${i}`,
    label,
    values: [1234567, 2345678, 3456789],
    compare: [1200000, 2300000, 3400000],
}));

describe("Feature: the chart's hidden data table", () => {
    describe("Scenario: a wide table in a narrow column", () => {
        // Regression: a table can't be narrower than its min-content, so `width: 1px` on the table is ignored. A 1px
        // wrapper must clip it, or the invisible table gives the page a horizontal scrollbar.
        let el: UauiTestElement;
        let table: HTMLTableElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<div style="width: 320px">
                    <uaui-chart-data-table labels-header="Date" total-label="Total" .labels=${labels} .series=${series}></uaui-chart-data-table>
                </div>`,
                "uaui-chart-data-table",
            );
            table = shadow(el).querySelector("table")!;
        });

        it("doesn't widen the page", () => {
            expect(table.getBoundingClientRect().width).toBeGreaterThan(document.documentElement.clientWidth);
            expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(document.documentElement.clientWidth);
        });

        it("still exposes the table as a table", async () => {
            expect(getComputedStyle(table).display).toBe("table");
            await expect.element(page.getByRole("table", { name: "Chart data" })).toBeInTheDocument();
        });

        it("has no accessibility violations", async () => {
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });
});
