import { describe, expect, it } from "vitest";
import { isRepeatedHour } from "./hour-ticks.js";
import { hoursOf25Oct } from "./hourly-fixtures.js";

// On 25 Oct 2026 (Copenhagen) hours 2 and 3 of the day's 25 are both 2 AM.
describe("Feature: the repeated hour", () => {
    it("is the first 2 AM", () => expect(isRepeatedHour(hoursOf25Oct[2])).toBe(true));
    it("is the second 2 AM", () => expect(isRepeatedHour(hoursOf25Oct[3])).toBe(true));
    it("is not the hour before", () => expect(isRepeatedHour(hoursOf25Oct[1])).toBe(false));
    it("is not the hour after", () => expect(isRepeatedHour(hoursOf25Oct[4])).toBe(false));
});
