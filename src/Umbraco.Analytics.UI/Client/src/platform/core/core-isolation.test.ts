import { describe, expect, it } from "vitest";

// The core project must run without the backoffice: vite.config.ts aliases every `@umbraco-cms/*` import to a module
// that throws, so any core spec, or any module it loads, that reaches the backoffice fails where it imports it.
describe("core test project", () => {
    it("fails an import from @umbraco-cms", async () => {
        await expect(import("@umbraco-cms/backoffice/extension-registry")).rejects.toThrow();
    });
});
