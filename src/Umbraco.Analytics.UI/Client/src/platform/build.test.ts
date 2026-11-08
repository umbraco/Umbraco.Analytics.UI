// SAC-13 AC1–AC4 — standalone core package (docs/plans/standalone-core).
// Pending: #platform/* doesn't exist yet, so nothing is imported. The builder adds the imports, arranges each
// scenario in beforeEach and writes the one assertion the Then names, then removes .skip.
import { beforeEach, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

// Registered in vite.config.ts (test.browser.commands): lints text in Node with the project's ESLint config.
declare module "vitest/browser" {
    interface BrowserCommands {
        lintText: (code: string, filePath: string) => Promise<{ ruleId: string | null; message: string }[]>;
        checkDoctoredCoreApi: () => Promise<{ code: number; output: string }>;
        buildBothLibraries: () => Promise<{ umbraco: boolean; core: boolean }>;
    }
}

describe("Feature: One build, one release", () => {
    describe("Scenario: One build makes both", () => {
        // Given a clean checkout
        // When  npm run build runs
        // The two builds run into scratch folders (devops/build-commands.ts), so the spec needs no earlier `npm run build`
        // and leaves wwwroot and dist/core alone. `npm run build` runs the same two configs.
        let produced: { umbraco: boolean; core: boolean };
        beforeEach(async () => {
            produced = await commands.buildBothLibraries();
        });
        it("both wwwroot and dist/core are produced", () => {
            expect(produced).toEqual({ umbraco: true, core: true });
        });
    });
    describe("Scenario: Both npm packages share the version", () => {
        // Given version.json says 19.1.0
        // When  both npm packages are packed
        it.skip("both package.json files say 19.1.0", () => {
            // AC2: one assertion.
        });
    });
    describe("Scenario: check:api checks both reports", () => {
        // Given a change to a core-only export
        // When  npm run check:api runs
        // The command runs api-extractor in non-local mode (as check:api does) against a scratch copy of the core report
        // with one extra export, so the committed report stays as it is.
        let check: { code: number; output: string };
        beforeEach(async () => {
            check = await commands.checkDoctoredCoreApi();
        });
        it("it fails on api/analytics-ui-core.api.md", () => {
            expect(check.output).toMatch(/analytics-ui-core\.api\.md/);
            expect(check.code).not.toBe(0);
        });
    });
    describe("Scenario: Lint stops real imports outside the platform folder", () => {
        // Given a component that imports from "lit"
        // When  npm run lint runs
        describe("a component importing lit", () => {
            let findings: { ruleId: string | null; message: string }[];
            beforeEach(async () => {
                const component = 'import { html } from "lit";\nexport const template = html`<p></p>`;\n';
                findings = await commands.lintText(component, "src/kpi-tile/fixture.element.ts");
            });
            it("it fails", () => {
                expect(findings.filter((f) => f.ruleId === "no-restricted-imports")).toHaveLength(1);
            });
        });
        // Given a component that imports from the backoffice's Lit
        describe("a component importing the backoffice's Lit", () => {
            let findings: { ruleId: string | null; message: string }[];
            beforeEach(async () => {
                const component = 'import { html } from "@umbraco-cms/backoffice/external/lit";\nexport const template = html`<p></p>`;\n';
                findings = await commands.lintText(component, "src/kpi-tile/fixture.element.ts");
            });
            it("it fails", () => {
                expect(findings.filter((f) => f.ruleId === "no-restricted-imports")).toHaveLength(1);
            });
        });
    });
    // AC5 (axe passes in both builds) runs in src/platform/umbraco/smoke.test.ts and the element specs: it needs a real
    // browser page per build, which a spec in this file can't start.
});
