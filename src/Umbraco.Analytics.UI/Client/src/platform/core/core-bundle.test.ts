// SAC-5 AC1–AC5 — standalone core package (docs/plans/standalone-core).
// AC3 and AC5 read a real core build: the commands in devops/build-commands.ts build it once per run into a scratch
// folder (never dist/core), so a spec never sees a stale or missing file and parallel engines don't clash. AC1, AC2 and the icon and uui-input checks import that built file onto the test page (see loadBuiltCore).
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { commands } from "vitest/browser";

declare module "vitest/browser" {
    interface BrowserCommands {
        buildCoreBundle: () => Promise<string>;
        checkCoreSize: () => Promise<{ code: number; output: string }>;
        readApiReports: () => Promise<{ umbraco: string; core: string }>;
        checkDoctoredCore: (doctoring: "bundled-source" | "unlisted-import" | "backoffice-import" | "no-licence") => Promise<{ code: number; output: string }>;
    }
}


/**
 * The libraries the core leaves to its host. The page loads them with these dynamic imports, so they are the page's one
 * copy of each, the same ones this spec's own page would use. Nothing from src/ is imported by this file: a source element
 * would define its tag first and the spec would prove nothing about the built file.
 */
const pageLibraries: Record<string, () => Promise<Record<string, unknown>>> = {
    lit: () => import("lit"),
    "lit/decorators.js": () => import("lit/decorators.js"),
    "lit/directives/if-defined.js": () => import("lit/directives/if-defined.js"),
    "lit/directives/repeat.js": () => import("lit/directives/repeat.js"),
    "@umbraco-ui/uui": () => import("@umbraco-ui/uui"),
    "chart.js": () => import("chart.js"),
};

type PageLoader = (specifier: string) => Promise<Record<string, unknown>>;

/**
 * Imports the built core onto this page. A module in a blob URL can't resolve bare specifiers, and an import map can't be
 * added once the page has loaded modules, so each library import in the built text is pointed at a small blob module that
 * re-exports the names the core imports from the page's own copy (loaded lazily, when the core is imported: the core, not
 * this spec, is what brings UUI in). The built file is read from the shared scratch build and never written anywhere.
 */
async function loadBuiltCore(): Promise<Record<string, unknown>> {
    const urls: string[] = [];
    const blob = (code: string) => {
        const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
        urls.push(url);
        return url;
    };
    const rewritten = (await commands.buildCoreBundle()).replace(/^import \{([^}]*)\} from "([^"]+)";$/gm, (_line, names: string, specifier: string) => {
        if (!pageLibraries[specifier]) throw new Error(`The built core imports "${specifier}", which this page doesn't provide.`);
        const exported = names.split(",").map((name) => name.trim().split(/\s+as\s+/)[0]);
        // Like an ESM link error: a name the page's library doesn't have fails the import instead of being undefined.
        const proxy = [
            `const page = await globalThis.__uauiPageLibrary(${JSON.stringify(specifier)});`,
            ...exported.map((name) => `if (!(${JSON.stringify(name)} in page)) throw new SyntaxError(${JSON.stringify(`The page's "${specifier}" has no export named "${name}".`)});`),
            ...exported.map((name) => `export const ${name} = page.${name};`),
        ].join("\n");
        return `import { ${names} } from "${blob(proxy)}";`;
    });
    // Every import left must now point at a blob module. A form the rewrite doesn't know would load as a bare specifier and fail obscurely.
    const missed = [...rewritten.matchAll(/^(?:import|export)\b[^"'\n]*?\bfrom\s*["']([^"']+)["']|^import\s*["']([^"']+)["']|\bimport\(\s*["']([^"']+)["']\s*\)/gm)]
        .filter((match) => !(match[1] ?? match[2] ?? match[3]).startsWith("blob:"))
        .map((match) => match[0]);
    if (missed.length > 0) throw new Error(`the rewrite missed an import form: ${missed.join(", ")}`);
    const text = rewritten;
    const host = globalThis as { __uauiPageLibrary?: PageLoader };
    host.__uauiPageLibrary = (specifier) => pageLibraries[specifier]();
    try {
        return (await import(/* @vite-ignore */ blob(text))) as Record<string, unknown>;
    } finally {
        delete host.__uauiPageLibrary;
        urls.forEach((url) => URL.revokeObjectURL(url));
    }
}

/**
 * Elements are rendered bare, except these: with no data they draw nothing by design (a cell or badge with no value), so they
 * get the one property that makes them draw.
 */
const sampleProperties: Record<string, Record<string, unknown>> = {
    "uaui-date-cell": { value: "2026-01-02" },
    "uaui-delta-badge": { value: 5 },
    "uaui-link-cell": { value: "Home" },
    "uaui-number-cell": { value: 5 },
    "uaui-percent-cell": { value: 0.5 },
    "uaui-progress-cell": { value: 5 },
    "uaui-share-cell": { value: 5 },
    "uaui-status-cell": { value: "ok" },
    "uaui-table-compare-badge": { value: 5, compareValue: 4 },
    "uaui-text-cell": { value: "Home" },
};

/** Public element classes from the committed core report: `UauiKpiTileElement` is `uaui-kpi-tile`. */
function publicElements(report: string): { className: string; tag: string }[] {
    return [...report.matchAll(/^export (?:abstract )?class (Uaui\w+Element)\b/gm)].map((match) => ({
        className: match[1],
        tag: match[1].replace(/^Uaui|Element$/g, "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase().replace(/^/, "uaui-"),
    }));
}

describe("Feature: The core loads on its own", () => {
    // Given the core build on a page with Lit, UUI and the UUI theme CSS
    // When  the built core file is imported
    describe("Scenarios on the loaded core", () => {
        let core: Record<string, unknown>;
        let elements: { className: string; tag: string }[];
        let errors: unknown[][];
        let unrendered: string[];
        beforeAll(async () => {
            elements = publicElements((await commands.readApiReports()).core);
            // The console watch is on only while the core loads and renders, and is in place before the import, so a load-time error is caught too.
            const spy = vi.spyOn(console, "error").mockImplementation(() => {});
            unrendered = [];
            try {
                core = await loadBuiltCore();
                // And every public element is rendered
                for (const { tag } of elements) {
                    const el = document.createElement(tag) as HTMLElement & { updateComplete?: Promise<boolean> };
                    Object.assign(el, sampleProperties[tag]);
                    document.body.append(el);
                    try {
                        await el.updateComplete;
                        // Lit's marker comments don't count as content.
                        if (!el.shadowRoot || el.shadowRoot.innerHTML.replace(/<!--.*?-->/g, "").trim() === "") unrendered.push(tag);
                    } catch {
                        unrendered.push(tag);
                    } finally {
                        el.remove();
                    }
                }
                errors = [...spy.mock.calls];
            } finally {
                spy.mockRestore();
            }
        });
        describe("Scenario: Every public element is defined", () => {
            it("every public uaui-* element name is a defined custom element", () => {
                // The class the tag is defined as must be the one the built file exports, not a source copy or nothing.
                const wrong = elements.filter(({ className, tag }) => !core[className] || customElements.get(tag) !== core[className]).map(({ tag }) => tag);
                expect(elements.length > 0 ? wrong : ["no public elements found in the core API report"]).toEqual([]);
            });
        });
        describe("Scenario: No errors on load", () => {
            it("the console has no errors", () => {
                expect(errors).toEqual([]);
            });
            it("every public element renders content in its shadow root", () => {
                expect(unrendered).toEqual([]);
            });
        });
        describe("Scenario: The core brings what it needs", () => {
            it("a uui-icon named icon-alert draws an svg with no icon registry on the page", async () => {
                const icon = document.createElement("uui-icon");
                icon.setAttribute("name", "icon-alert");
                document.body.append(icon);
                try {
                    await expect.poll(() => icon.shadowRoot?.querySelector("svg") ?? null).not.toBeNull();
                } finally {
                    icon.remove();
                }
            });
            it("uaui-search-field's uui-input is defined, with only the built core importing UUI", () => {
                expect(customElements.get("uui-input")).toBeDefined();
            });
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
        let umbracoExports: string[];
        let coreExports: string[];
        beforeEach(async () => {
            const reports = await commands.readApiReports();
            // Every top-level `export <kind> <Name>` line of a report is one export of the package.
            const exportsOf = (report: string) =>
                [...report.matchAll(/^export (?:declare )?(?:abstract )?(?:const|class|function|interface|type|enum) (\w+)/gm)].map((match) => match[1]).sort();
            umbracoExports = exportsOf(reports.umbraco);
            coreExports = exportsOf(reports.core);
        });
        it("the core has every Umbraco export plus registerUauiTranslations, UauiTranslations and UauiLocalize, and nothing else", () => {
            expect(coreExports).toEqual([...umbracoExports, "registerUauiTranslations", "UauiTranslations", "UauiLocalize"].sort());
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
