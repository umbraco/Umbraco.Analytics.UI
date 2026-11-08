// SAC-5 AC1–AC5 — standalone core package (docs/plans/standalone-core).
// AC3 and AC5 read a real core build: the commands in devops/build-commands.ts build it once per run into a scratch
// folder (never dist/core), so a spec never sees a stale or missing file and parallel engines don't clash. AC1, AC2 and AC4 are pending: other tasks own them.
import { beforeEach, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

declare module "vitest/browser" {
    interface BrowserCommands {
        buildCoreBundle: () => Promise<string>;
        checkCoreSize: () => Promise<{ code: number; output: string }>;
        checkDoctoredCore: (doctoring: "bundled-source" | "unlisted-import" | "backoffice-import" | "no-licence") => Promise<{ code: number; output: string }>;
    }
}

describe("Feature: The core loads on its own", () => {
    describe("Scenario: Every public element is defined", () => {
        // Given the core build on a page with Lit, UUI and the UUI theme CSS
        // When  @umbraco/analytics-ui-core is imported
        it.skip("every public uaui-* element name is a defined custom element", () => {
            // AC1: one assertion.
        });
    });
    describe("Scenario: No errors on load", () => {
        // Given the same page
        // When  the core is imported and a uaui-kpi-tile is rendered
        it.skip("the console has no errors", () => {
            // AC2: one assertion.
        });
    });
    describe("Scenario: Nothing from Umbraco is in the core", () => {
        // Given the core build output
        // When  its imports are read
        let imports: string[];
        beforeEach(async () => {
            const bundle = await commands.buildCoreBundle();
            // Every module specifier the file imports, statically (`from "x"`, `import "x"`) or dynamically (`import("x")`).
            imports = [...bundle.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*["']([^"']+)["']/g)].map((match) => match[1]);
        });
        it("none start with @umbraco-cms/", () => {
            expect(imports.filter((specifier) => specifier.startsWith("@umbraco-cms/"))).toEqual([]);
        });
    });
    describe("Scenario: Same public names as the Umbraco package", () => {
        // Given both API reports
        // When  their exports are compared
        it.skip("the core has every Umbraco export plus registerUauiTranslations, and nothing else", () => {
            // AC4: one assertion.
        });
    });
    describe("Scenario: Lit, UUI and Chart.js aren't bundled in", () => {
        // Given the core build output
        // When  check:size runs
        let check: { code: number; output: string };
        beforeEach(async () => {
            check = await commands.checkCoreSize();
        });
        // check:size fails when the core file is over budget, bundles Lit, UUI or Chart.js, or doesn't import them.
        it("the core file is within its budget and imports lit, @umbraco-ui/uui and chart.js rather than containing them", () => {
            expect(check.code, check.output).toBe(0);
        });
    });
    describe("Scenario: check:size catches a doctored core", () => {
        // Given a copy of the core build changed in one way
        // When  check:size runs on the copy
        it("it fails when a library's source is in the source map", async () => {
            const check = await commands.checkDoctoredCore("bundled-source");
            expect(check.output).toContain("contains source from node_modules/");
        });
        it("it fails when the file imports a module outside lit, @umbraco-ui/uui and chart.js", async () => {
            const check = await commands.checkDoctoredCore("unlisted-import");
            expect(check.output).toContain('imports "left-pad"');
        });
        it("it fails when the file imports from @umbraco-cms/", async () => {
            const check = await commands.checkDoctoredCore("backoffice-import");
            expect(check.output).toContain('imports "@umbraco-cms/backoffice/lit-element"');
        });
        it("it fails when the Lucide licence is missing", async () => {
            const check = await commands.checkDoctoredCore("no-licence");
            expect(check.output).toContain("licence is missing");
        });
    });
});
