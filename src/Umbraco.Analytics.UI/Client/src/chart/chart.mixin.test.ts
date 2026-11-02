// T60 — UauiChartMixin: the series type is given, the base class's type is inferred, so a subclass base keeps its own
// members. The type checks run in `tsc -p tsconfig.app.json` (part of `npm run build`); the runtime checks here.
import { describe, expect, expectTypeOf, it } from "vitest";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UauiChartMixin } from "./chart.mixin.js";
import type { UauiCategorySeries, UauiChartScale, UauiSeries } from "./types.js";

class ProductBase extends UmbLitElement {
    productSetting = "kept";
    static productStatic = 42;
}

const Mixed = UauiChartMixin<UauiSeries>()(ProductBase);
class TestMixedChartElement extends Mixed {}
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

        it("adds the shared settings, with the given series type", () => {
            const el = new TestMixedChartElement();
            expectTypeOf(el.series).toEqualTypeOf<UauiSeries[]>();
            expectTypeOf(el.compareSeries).toEqualTypeOf<UauiSeries[]>();
            expectTypeOf(el.yScale).toEqualTypeOf<UauiChartScale>();
            expectTypeOf(el).toExtend<UmbLitElement>();
            expect(el.series).toEqual([]);
            expect(el.yScale).toBe("linear");
            expect(el.loading).toBe(false);
        });

        it("keeps the series type per chart: another chart's series don't fit", () => {
            const el = new TestMixedChartElement();
            const categorySeries: UauiCategorySeries[] = [{ id: "a", label: "A", points: [{ category: "x", value: 1 }] }];
            // @ts-expect-error A category series has no dated points.
            el.series = categorySeries;
            expect(el.series).toBe(categorySeries);
        });

        it("reads its attributes with the shared names", async () => {
            const el = new TestMixedChartElement();
            el.setAttribute("y-scale", "log");
            el.setAttribute("lower-is-better", "");
            document.body.append(el);
            await el.updateComplete;
            expect(el.yScale).toBe("log");
            expect(el.lowerIsBetter).toBe(true);
            el.remove();
        });
    });
});
