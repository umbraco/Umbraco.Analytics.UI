import { describe, expect, it } from "vitest";
import { deltaChange } from "./delta-change.js";

describe("deltaChange", () => {
    describe("with a value", () => {
        it("uses the value over current and previous", () => {
            expect(deltaChange(5, 200, 100, "percent")).toBe(5);
        });

        it("keeps a value of 0", () => {
            expect(deltaChange(0, 200, 100, "percent")).toBe(0);
        });

        it("keeps a value that is not finite, for the caller to reject", () => {
            expect(deltaChange(Number.NaN, 200, 100, "percent")).toBeNaN();
        });
    });

    describe("with current and previous as percent", () => {
        it("works out the percent change", () => {
            expect(deltaChange(undefined, 150, 100, "percent")).toBe(50);
        });

        it("measures a fall against the size of previous", () => {
            expect(deltaChange(undefined, 50, 100, "percent")).toBe(-50);
        });

        it("measures against the size of a negative previous", () => {
            expect(deltaChange(undefined, -50, -100, "percent")).toBe(50);
        });

        it("is unknown when previous is 0", () => {
            expect(deltaChange(undefined, 10, 0, "percent")).toBeUndefined();
        });
    });

    describe("with current and previous as points", () => {
        it("works out the difference", () => {
            expect(deltaChange(undefined, 12.5, 10, "points")).toBe(2.5);
        });

        it("works out a difference from a previous of 0", () => {
            expect(deltaChange(undefined, 4, 0, "points")).toBe(4);
        });
    });

    describe("with a number missing", () => {
        it("is unknown without current", () => {
            expect(deltaChange(undefined, undefined, 100, "percent")).toBeUndefined();
        });

        it("is unknown without previous", () => {
            expect(deltaChange(undefined, 100, undefined, "percent")).toBeUndefined();
        });

        it("is unknown when current is not finite", () => {
            expect(deltaChange(undefined, Number.NaN, 100, "points")).toBeUndefined();
        });

        it("is unknown when previous is not finite", () => {
            expect(deltaChange(undefined, 100, Number.POSITIVE_INFINITY, "percent")).toBeUndefined();
        });
    });
});
