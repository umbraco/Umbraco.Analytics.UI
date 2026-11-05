import { describe, expect, it } from "vitest";
import { hourTicks } from "./hour-ticks.js";

describe("Feature: hour ticks", () => {
    it("shows a date that doesn't exist as written, not rolled over to another day", () => {
        const ticks = hourTicks(["2026-02-30T09:00"], ["2026-02-30T09:00"], new Intl.DateTimeFormat("en"), 800);
        expect(ticks).toEqual([{ label: "2026-02-30T09:00", bold: false }]);
    });
});
