// SAC-1 AC2–AC5 — standalone core package. AC1 (the API report doesn't move) is `npm run check:api`.
// AC2, AC3 and AC5 read a real Umbraco build: the readUmbracoBuild command (devops/build-commands.ts) builds it once per
// run into a scratch folder, never wwwroot, so a spec never sees a stale or missing file.
import { beforeAll, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import { html } from "#platform/lit";
import { renderElement } from "../../internal/test/dom.js";
import "../../kpi-tile/kpi-tile.element.js";

declare module "vitest/browser" {
    interface BrowserCommands {
        readUmbracoBuild: () => Promise<{ files: string[]; importMap: Record<string, string>; mainBundle: string }>;
    }
}

let build: Awaited<ReturnType<typeof commands.readUmbracoBuild>>;
beforeAll(async () => {
    build = await commands.readUmbracoBuild();
}, 120_000);

/** The module specifiers a built file imports: `import ... from "x"` and `import "x"`. */
const importedSpecifiers = (code: string) => [...code.matchAll(/^(?:import|export)\b[^"'\n]*?\bfrom\s*["']([^"']+)["']|^import\s*["']([^"']+)["']/gm)].map((m) => m[1] ?? m[2]);

describe("Feature: Products see no change", () => {
    describe("Scenario: The Umbraco output has the same files", () => {
        // Given the split is built
        // When  the wwwroot folder is listed
        it("it holds umbraco-analytics-ui.js, lang/en.js, external/chart.js/index.js and umbraco-package.json, as before", () => {
            expect(build.files).toEqual(expect.arrayContaining(["umbraco-analytics-ui.js", "lang/en.js", "external/chart.js/index.js", "umbraco-package.json"]));
        });
    });
    describe("Scenario: The import map is the same", () => {
        // Given the split is built
        // When  umbraco-package.json is read
        it("its import map has exactly @umbraco/analytics-ui and @umbraco/analytics-ui/external/chart.js", () => {
            expect(Object.keys(build.importMap).sort()).toEqual(["@umbraco/analytics-ui", "@umbraco/analytics-ui/external/chart.js"]);
        });
    });
    describe("Scenario: Elements are still Umbraco elements", () => {
        // Given the Umbraco build
        // When  a uaui-kpi-tile is created
        it("it is an instance of UmbLitElement", async () => {
            const el = await renderElement(html`<uaui-kpi-tile label="Visitors" value="12"></uaui-kpi-tile>`, "uaui-kpi-tile");
            expect(el).toBeInstanceOf(UmbLitElement);
        });
    });
    describe("Scenario: The Umbraco bundle loads Lit and UUI from the backoffice", () => {
        // Given the Umbraco build's main bundle
        // When  its imports are read
        it("Lit and UUI come only from @umbraco-cms/backoffice/external/*", () => {
            // Anything that is not a backoffice specifier, such as bare `lit`, `lit/decorators.js` or `@umbraco-ui/uui`, would load a second copy.
            const own = importedSpecifiers(build.mainBundle).filter((specifier) => /^(lit|@umbraco-ui\/uui)(\/|$)/.test(specifier));
            expect(own).toEqual([]);
        });
    });
});
