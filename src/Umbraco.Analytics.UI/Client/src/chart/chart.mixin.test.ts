// T60 — UauiChartMixin: one call, the base class's type inferred, so a subclass base keeps its own members; each chart
// narrows `series` to its own type. The type checks run in `tsc -p tsconfig.app.json` (part of `npm run build`).
import { describe, expect, expectTypeOf, it } from "vitest";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiChartMixin } from "./chart.mixin.js";
import type { UauiCategoryChartElement } from "./category-chart.element.js";
import type { UauiTimeSeriesChartElement } from "./time-series-chart.element.js";
import type { UauiCategorySeries, UauiChartScale, UauiSeries } from "./types.js";

class ProductBase extends UmbLitElement {
    productSetting = "kept";
    static productStatic = 42;
}

const Mixed = UauiChartMixin(ProductBase);
class TestMixedChartElement extends Mixed {
    declare series: UauiSeries[];
}
customElements.define("uaui-test-mixed-chart", TestMixedChartElement);

describe("Feature: the chart mixin", () => {
    describe("Scenario: applied to a subclass of UmbLitElement", () => {
        it("keeps the base's own members in the type and at runtime", () => {
            const el = new TestMixedChartElement();
            expectTypeOf(el.productSetting).toEqualTypeOf<string>();
            expectTypeOf(Mixed.productStatic).toEqualTypeOf<number>();
            expect(el.productSetting).toBe("kept");
            expect(Mixed.productStatic).toBe(42);
        });

        it("adds the shared settings and load states", () => {
            const el = new TestMixedChartElement();
            expectTypeOf(el.series).toEqualTypeOf<UauiSeries[]>();
            expectTypeOf(el.yScale).toEqualTypeOf<UauiChartScale>();
            expectTypeOf(el.loading).toEqualTypeOf<boolean>();
            expectTypeOf(el).toExtend<UmbLitElement>();
            expect(el.series).toEqual([]);
            expect(el.compareSeries).toEqual([]);
            expect(el.yScale).toBe("linear");
            expect(el.loading).toBe(false);
        });

        it("reads its attributes with the shared names", async () => {
            const el = new TestMixedChartElement();
            el.setAttribute("y-scale", "log");
            el.setAttribute("lower-is-better", "");
            el.setAttribute("empty-headline", "None");
            document.body.append(el);
            await el.updateComplete;
            expect([el.yScale, el.lowerIsBetter, el.emptyHeadline]).toEqual(["log", true, "None"]);
            el.remove();
        });
    });

    describe("Scenario: each chart's series type", () => {
        it("types series per chart, so another chart's series don't fit", () => {
            expectTypeOf<UauiTimeSeriesChartElement["series"]>().toEqualTypeOf<UauiSeries[]>();
            expectTypeOf<UauiTimeSeriesChartElement["compareSeries"]>().toEqualTypeOf<UauiSeries[]>();
            expectTypeOf<UauiCategoryChartElement["series"]>().toEqualTypeOf<UauiCategorySeries[]>();
            expectTypeOf<UauiCategoryChartElement["compareSeries"]>().toEqualTypeOf<UauiCategorySeries[]>();
            expectTypeOf<UauiCategorySeries[]>().not.toExtend<UauiTimeSeriesChartElement["series"]>();
        });
    });
});
