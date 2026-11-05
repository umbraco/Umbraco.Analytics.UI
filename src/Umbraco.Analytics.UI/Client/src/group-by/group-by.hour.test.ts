// HRS-7 — Group by hour. Pending until T10 (docs/plans/hourly-buckets/PLAN.md).
// `uauiGroupByOptions` doesn't exist yet, so it's read from the module namespace; T10 swaps this for a plain named
// import from "../date-helpers/index.js" when it turns the specs on.
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import * as helpers from "../date-helpers/index.js";
import { axeRun } from "../internal/test/a11y.js";
import { deepQueryAll, nextEvent, renderElement } from "../internal/test/dom.js";
import "./group-by.element.js";

const { uauiGroupByOptions } = helpers as unknown as { uauiGroupByOptions: (range: { from: string; to: string }) => string[] };
const optionLabels = (el: Element) => deepQueryAll(el.shadowRoot!, "[role='radio']").map((o) => o.textContent?.trim());
const option = (el: Element, label: string) =>
    deepQueryAll(el.shadowRoot!, "[role='radio']").find((o) => o.textContent?.trim() === label) as HTMLElement;

describe("Feature: group by hour", () => {
    describe("Scenario: hour and day options", () => {
        it.skip("labels the hour option Hour", async () => {
            const el = await renderElement(html`<uaui-group-by .options=${["hour", "day"]}></uaui-group-by>`, "uaui-group-by");
            expect(optionLabels(el)[0]).toBe("Hour");
        });

        it.skip("raises change with hour when Hour is picked", async () => {
            const el = await renderElement(html`<uaui-group-by value="day" .options=${["hour", "day"]}></uaui-group-by>`, "uaui-group-by");
            const event = nextEvent(el, "change");
            option(el, "Hour").click();
            expect((await event).detail).toEqual({ value: "hour" });
        });

        it.skip("has no axe violations", async () => {
            const el = await renderElement(html`<uaui-group-by value="hour" .options=${["hour", "day"]}></uaui-group-by>`, "uaui-group-by");
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: no options set", () => {
        it.skip("keeps Day, Week and Month", async () => {
            const el = await renderElement(html`<uaui-group-by></uaui-group-by>`, "uaui-group-by");
            expect(optionLabels(el)).toEqual(["Day", "Week", "Month"]);
        });
    });

    describe("Scenario: options for a range", () => {
        it.skip("offers hour and day for two days", () => {
            expect(uauiGroupByOptions({ from: "2026-11-04", to: "2026-11-05" })).toEqual(["hour", "day"]);
        });

        it.skip("offers day, week and month for three days", () => {
            expect(uauiGroupByOptions({ from: "2026-11-03", to: "2026-11-05" })).toEqual(["day", "week", "month"]);
        });
    });

    describe("Scenario: sad path, an invalid range", () => {
        it.skip("offers day, week and month", () => {
            expect(uauiGroupByOptions({ from: "2026-11-05", to: "2026-11-04" })).toEqual(["day", "week", "month"]);
        });
    });
});
