import { describe, expect, it } from "vitest";

// The core project must run without the backoffice. Every module the test page loaded is a resource entry, so a
// backoffice import from a setup file or a spec would show up here whatever it registers.
describe("core test project", () => {
    it("loads no module from @umbraco-cms", () => {
        const loaded = performance.getEntriesByType("resource").map((entry) => entry.name);
        expect(loaded.filter((url) => url.includes("umbraco-cms"))).toEqual([]);
    });
});
