import { describe, expect, it } from "vitest";
import { displayIsoDate, formatIsoDate } from "./format-date.js";

describe("Feature: formatting an ISO date", () => {
    const format = new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" });

    it("formats the calendar day", () => {
        expect(formatIsoDate("2026-06-11", format)).toBe("Jun 11, 2026");
    });

    it("gives back text that isn't a real date as it is", () => {
        expect(formatIsoDate("2026-06-1", format)).toBe("2026-06-1");
    });

    it("displays a date with the localizer's medium style", () => {
        const localize = { date: (date: Date, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en", options).format(date) };
        expect(displayIsoDate("2026-06-11", localize)).toBe("Jun 11, 2026");
    });
});
