import { execFile } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const viteBin = join(process.cwd(), "node_modules/vite/bin/vite.js");

interface RunResult {
    code: number;
    output: string;
}

const node = async (args: string[]): Promise<RunResult> => {
    try {
        const { stdout, stderr } = await run(process.execPath, args, { cwd: process.cwd() });
        return { code: 0, output: stdout + stderr };
    } catch (error) {
        const failed = error as { code?: number; stdout?: string; stderr?: string };
        return { code: typeof failed.code === "number" ? failed.code : 1, output: `${failed.stdout ?? ""}${failed.stderr ?? ""}` };
    }
};

let coreBuild: Promise<string> | undefined;

/**
 * Builds the core once per test run, into a scratch folder (never dist/core, which `npm run build` owns and a parallel
 * engine could empty mid-read), and returns the path of analytics-ui-core.js. Every command shares the one promise.
 */
function builtCorePath(): Promise<string> {
    coreBuild ??= (async () => {
        const dir = mkdtempSync(join(tmpdir(), "uaui-core-"));
        process.once("exit", () => rmSync(dir, { recursive: true, force: true }));
        const built = await node([viteBin, "build", "-c", "vite.config.core.ts", "--outDir", dir, "--emptyOutDir"]);
        if (built.code !== 0) throw new Error(`The core build failed (exit ${built.code}):\n${built.output}`);
        return join(dir, "analytics-ui-core.js");
    })();
    return coreBuild;
}

/** Vitest browser command: the text of the freshly built core file, so a spec reads the real output, never a stale one. */
export async function buildCoreBundle(): Promise<string> {
    return readFileSync(await builtCorePath(), "utf8");
}

/** Vitest browser command: runs `check:size` on the freshly built core alone and returns its exit code and output. */
export async function checkCoreSize(): Promise<RunResult> {
    return node(["devops/check-bundle-size.js", "core", await builtCorePath()]);
}

/** A change to a copy of the built core (and its source map) that one `check:size` guard must catch. */
export type CoreDoctoring = "bundled-source" | "unlisted-import" | "backoffice-import" | "no-licence";

/**
 * Vitest browser command: copies the built core to a scratch folder, applies one change to the copy, and runs
 * `check:size` on it. The real build output is never touched.
 */
export async function checkDoctoredCore(_context: unknown, doctoring: CoreDoctoring): Promise<RunResult> {
    const source = await builtCorePath();
    const dir = mkdtempSync(join(tmpdir(), "uaui-core-doctored-"));
    try {
        const file = join(dir, "analytics-ui-core.js");
        let code = readFileSync(source, "utf8");
        let map = readFileSync(`${source}.map`, "utf8");
        if (doctoring === "bundled-source") map = map.replace(/"sources":\[/, '"sources":["../node_modules/lit-html/lit-html.js",');
        if (doctoring === "unlisted-import") code = `import "left-pad";\n${code}`;
        if (doctoring === "backoffice-import") code = `import "@umbraco-cms/backoffice/lit-element";\n${code}`;
        if (doctoring === "no-licence") code = code.split("ISC License").join("licence removed");
        writeFileSync(file, code);
        writeFileSync(`${file}.map`, map);
        return await node(["devops/check-bundle-size.js", "core", file]);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

/**
 * Vitest browser command: runs both library builds, each into a scratch folder (so tests never touch wwwroot or
 * dist/core), and says whether each one's main file was produced.
 */
export async function buildBothLibraries(): Promise<{ umbraco: boolean; core: boolean }> {
    const scratch = mkdtempSync(join(tmpdir(), "uaui-build-"));
    try {
        const umbracoDir = join(scratch, "umbraco");
        const coreDir = join(scratch, "core");
        const [umbracoBuild, coreBuildResult] = await Promise.all([
            node([viteBin, "build", "--outDir", umbracoDir, "--emptyOutDir"]),
            node([viteBin, "build", "-c", "vite.config.core.ts", "--outDir", coreDir, "--emptyOutDir"]),
        ]);
        const failed = [
            ["Umbraco build", umbracoBuild],
            ["core build", coreBuildResult],
        ] as const;
        const messages = failed.filter(([, result]) => result.code !== 0).map(([name, result]) => `The ${name} failed (exit ${result.code}):\n${result.output}`);
        if (messages.length > 0) throw new Error(messages.join("\n"));
        return {
            umbraco: existsSync(join(umbracoDir, "umbraco-analytics-ui.js")),
            core: existsSync(join(coreDir, "analytics-ui-core.js")),
        };
    } finally {
        rmSync(scratch, { recursive: true, force: true });
    }
}

/** Vitest browser command: the text of both committed API reports (the Umbraco package's and the core's). */
export function readApiReports(): { umbraco: string; core: string } {
    return {
        umbraco: readFileSync(join(process.cwd(), "api/analytics-ui.api.md"), "utf8"),
        core: readFileSync(join(process.cwd(), "api/analytics-ui-core.api.md"), "utf8"),
    };
}

let doctoredApi: Promise<{ config: string }> | undefined;

/**
 * Once per test run: emits the core declarations and writes the api-extractor setup (config, a package.json copy and a
 * doctored copy of the core report) into one scratch folder, so nothing is written into the worktree.
 */
function doctoredApiSetup(): Promise<{ config: string }> {
    doctoredApi ??= (async () => {
        const project = process.cwd();
        const dir = mkdtempSync(join(tmpdir(), "uaui-core-api-"));
        process.once("exit", () => rmSync(dir, { recursive: true, force: true }));
        const types = join(dir, "types");
        const declarations = await node([join(project, "node_modules/typescript/bin/tsc"), "-p", "tsconfig.core-api.json", "--outDir", types, "--tsBuildInfoFile", join(types, ".tsbuildinfo")]);
        if (declarations.code !== 0) throw new Error(`Emitting the core declarations failed:\n${declarations.output}`);
        const reportFolder = join(dir, "api");
        mkdirSync(reportFolder);
        const report = readFileSync(join(project, "api/analytics-ui-core.api.md"), "utf8");
        writeFileSync(join(reportFolder, "analytics-ui-core.api.md"), report.replace("// (No @packageDocumentation comment for this package)", "$&\n\nexport const uauiDoctored: number;"));
        // api-extractor looks for package.json from the config's folder, so a copy sits beside the config.
        copyFileSync(join(project, "package.json"), join(dir, "package.json"));
        // The real extractor tsconfig maps the swap points into temp/core-types, so this one maps them into the scratch types.
        const swapPoints = ["lit", "uui", "chart", "base-element", "context", "date-range-opener"];
        const tsconfig = join(dir, "tsconfig.json");
        writeFileSync(
            tsconfig,
            JSON.stringify({
                extends: join(project, "tsconfig.core-api-extractor.json"),
                compilerOptions: {
                    paths: {
                        "@umbraco/analytics-ui/external/chart.js": [join(types, "external/chart.js/index.d.ts")],
                        ...Object.fromEntries(swapPoints.map((name) => [`#platform/${name}`, [join(types, `platform/core/${name}.d.ts`)]])),
                    },
                },
            }),
        );
        const config = join(dir, "api-extractor.json");
        writeFileSync(
            config,
            JSON.stringify({
                extends: join(project, "api-extractor.core.json"),
                projectFolder: project,
                compiler: { tsconfigFilePath: tsconfig },
                mainEntryPointFilePath: join(types, "platform/core/index.d.ts"),
                apiReport: { reportFolder, reportTempFolder: join(dir, "temp") },
                dtsRollup: { enabled: false },
            }),
        );
        return { config };
    })();
    return doctoredApi;
}

/**
 * Vitest browser command: runs api-extractor on the core in non-local mode (what `check:api` does) against a scratch
 * copy of the committed core report with one extra export. The committed report is never touched.
 */
export async function checkDoctoredCoreApi(): Promise<RunResult> {
    const { config } = await doctoredApiSetup();
    const project = process.cwd();
    return node([join(project, "node_modules/@microsoft/api-extractor/bin/api-extractor"), "run", "-c", config, "--typescript-compiler-folder", join(project, "node_modules/typescript")]);
}
