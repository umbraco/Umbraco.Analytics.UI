import { describe, expect, it } from "vitest";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { UmbLocalizationController } from "@umbraco-cms/backoffice/localization-api";
import * as chart from "@umbraco/analytics-ui/external/chart.js";
import { UauiLitElement } from "#platform/base-element";
import type { UauiLocalize as UauiLocalizeShape } from "../localize.js";
import * as platformChart from "#platform/chart";
import { LitElement, html } from "#platform/lit";
import { UUIButtonElement } from "#platform/uui";

describe("#platform swap points in the Umbraco build", () => {
    it("#platform/base-element is UmbLitElement", () => {
        expect(UauiLitElement).toBe(UmbLitElement);
    });

    it("#platform/lit is the backoffice's Lit", () => {
        expect(typeof html).toBe("function");
        expect(UmbLitElement.prototype instanceof LitElement).toBe(true);
    });

    it("#platform/uui is the backoffice's UUI", () => {
        expect(customElements.get("uui-button")).toBe(UUIButtonElement);
    });

    it("#platform/chart is the shared Chart.js entry", () => {
        expect(platformChart.Chart).toBe(chart.Chart);
    });

    it("UmbLocalizationController satisfies UauiLocalizeShape", () => {
        // Compile-time check: tsc fails here if the shape drifts.
        const localize: UauiLocalizeShape = null as unknown as UmbLocalizationController;
        expect(localize).toBeNull();
    });
});
