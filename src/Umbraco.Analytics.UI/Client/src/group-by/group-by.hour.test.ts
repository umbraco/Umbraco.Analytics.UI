// HRS-7: group by hour.
import { describe, expect, it } from "vitest";
import { html } from "#platform/lit";
import { uauiGroupByOptions } from "../date-helpers/index.js";
import { axeRun } from "../internal/test/a11y.js";
import { deepQueryAll, nextEvent, renderElement } from "../internal/test/dom.js";
import "./group-by.element.js";

const optionLabels = (el: Element) => deepQueryAll(el.shadowRoot!, "[role='radio']").map((o) => o.textContent?.trim());
const option = (el: Element, label: string) =>
    deepQueryAll(el.shadowRoot!, "[role='radio']").find((o) => o.textContent?.trim() === label) as HTMLElement;

describe("Feature: group by hour", () => {
    describe("Scenario: hour and day options", () => {
        it("labels the hour option Hour", async () => {
            const el = await renderElement(html`<uaui-group-by .options=${["hour", "day"]}></uaui-group-by>`, "uaui-group-by");
            expect(optionLabels(el)[0]).toBe("Hour");
        });

        it("raises change with hour when Hour is picked", async () => {
            const el = await renderElement(html`<uaui-group-by value="day" .options=${["hour", "day"]}></uaui-group-by>`, "uaui-group-by");
            const event = nextEvent(el, "change");
            option(el, "Hour").click();
            expect((await event).detail).toEqual({ value: "hour" });
        });

        it("has no axe violations", async () => {
            const el = await renderElement(html`<uaui-group-by value="hour" .options=${["hour", "day"]}></uaui-group-by>`, "uaui-group-by");
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: no options set", () => {
        it("keeps Day, Week and Month", async () => {
            const el = await renderElement(html`<uaui-group-by></uaui-group-by>`, "uaui-group-by");
            expect(optionLabels(el)).toEqual(["Day", "Week", "Month"]);
        });
    });

    describe("Scenario: options for a range", () => {
        it("offers hour and day for two days", () => {
            expect(uauiGroupByOptions({ from: "2026-11-04", to: "2026-11-05" })).toEqual(["hour", "day"]);
        });

        it("offers day, week and month for three days", () => {
            expect(uauiGroupByOptions({ from: "2026-11-03", to: "2026-11-05" })).toEqual(["day", "week", "month"]);
        });
    });

    describe("Scenario: sad path, an invalid range", () => {
        it("offers day, week and month", () => {
            expect(uauiGroupByOptions({ from: "2026-11-05", to: "2026-11-04" })).toEqual(["day", "week", "month"]);
        });
    });
});
