import { execFile } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
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

let umbracoBuild: Promise<string> | undefined;

/** Builds the Umbraco library once per test run, into a scratch folder (never wwwroot), and returns that folder. */
function builtUmbracoDir(): Promise<string> {
    umbracoBuild ??= (async () => {
        const dir = mkdtempSync(join(tmpdir(), "uaui-umbraco-"));
        process.once("exit", () => rmSync(dir, { recursive: true, force: true }));
        const built = await node([viteBin, "build", "--outDir", dir, "--emptyOutDir"]);
        if (built.code !== 0) throw new Error(`The Umbraco build failed (exit ${built.code}):\n${built.output}`);
        return dir;
    })();
    return umbracoBuild;
}

/**
 * Vitest browser command: runs both library builds (the shared scratch builds, so each runs once per test run) and
 * says whether each one's main file was produced.
 */
export async function buildBothLibraries(): Promise<{ umbraco: boolean; core: boolean }> {
    const [umbracoDir, corePath] = await Promise.all([builtUmbracoDir(), builtCorePath()]);
    return { umbraco: existsSync(join(umbracoDir, "umbraco-analytics-ui.js")), core: existsSync(corePath) };
}

/** What the Umbraco build produced: every file path (relative, without source maps), its manifest's import map and its main bundle. */
export interface UmbracoBuildOutput {
    files: string[];
    importMap: Record<string, string>;
    mainBundle: string;
}

/** Vitest browser command: reads the shared scratch Umbraco build, so a spec sees the real output, never a stale wwwroot. */
export async function readUmbracoBuild(): Promise<UmbracoBuildOutput> {
    const dir = await builtUmbracoDir();
    const files = (readdirSync(dir, { recursive: true, encoding: "utf8" }) as string[])
        .filter((file) => statSync(join(dir, file)).isFile() && !file.endsWith(".map"))
        .map((file) => file.split(sep).join("/"))
        .sort();
    const manifest = JSON.parse(readFileSync(join(dir, "umbraco-package.json"), "utf8")) as { importmap?: { imports?: Record<string, string> } };
    return { files, importMap: manifest.importmap?.imports ?? {}, mainBundle: readFileSync(join(dir, "umbraco-analytics-ui.js"), "utf8") };
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
        // api-extractor names the report after the package.json nearest the config, so the core's sits beside it.
        copyFileSync(join(project, "core/package.json"), join(dir, "package.json"));
        // The real extractor tsconfig maps the swap points into temp/core-types, so this one maps them into the scratch types.
        const tsconfig = join(dir, "tsconfig.json");
        writeFileSync(
            tsconfig,
            JSON.stringify({
                extends: join(project, "tsconfig.core-api-extractor.json"),
                compilerOptions: {
                    paths: {
                        "@umbraco/analytics-ui/external/chart.js": [join(types, "external/chart.js/index.d.ts")],
                        "#platform/*": [join(types, "platform/core/*.d.ts")],
                    },
                },
            }),
        );
        const config = join(dir, "api-extractor.json");
        writeFileSync(
            config,
            JSON.stringify({
                extends: join(project, "core/api-extractor.json"),
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

/**
 * Vitest browser command: packs both npm packages in a scratch project whose version.json says `version`, and returns the
 * `version` in each tarball's package.json. The scratch project mirrors the Client folder's depth (the publish scripts
 * read ../../../version.json and ../../../LICENSE.md), so the worktree's package.json and artifacts are never touched.
 */
export async function packBothPackages(_context: unknown, version: string): Promise<{ umbraco: string; core: string }> {
    const scratch = mkdtempSync(join(tmpdir(), "uaui-pack-"));
    try {
        const client = join(scratch, "a/b/c");
        mkdirSync(join(client, "dist/core"), { recursive: true });
        mkdirSync(join(client, "types/core"), { recursive: true });
        mkdirSync(join(client, "artifacts"));
        writeFileSync(join(scratch, "version.json"), JSON.stringify({ version }));
        writeFileSync(join(scratch, "LICENSE.md"), "licence");
        writeFileSync(join(client, "dist/core/analytics-ui-core.js"), "export {};\n");
        writeFileSync(join(client, "types/core/analytics-ui-core.d.ts"), "export {};\n");
        copyFileSync(join(process.cwd(), "package.json"), join(client, "package.json"));
        const publish = join(process.cwd(), "devops/publish");
        const env = { ...process.env, NPM_PACKAGE_VERSION: "" };
        const npm = (args: string[], cwd: string) => run("npm", args, { cwd, env });
        await run(process.execPath, [join(publish, "sync-package-version.js")], { cwd: client, env });
        await npm(["pack", "--pack-destination", join(client, "artifacts")], client);
        await run(process.execPath, [join(publish, "pack-core.js")], { cwd: client, env });
        const versionIn = async (tarball: string) => {
            const { stdout } = await run("tar", ["-xzOf", join(client, "artifacts", tarball), "package/package.json"]);
            return (JSON.parse(stdout) as { version: string }).version;
        };
        return {
            umbraco: await versionIn(`umbraco-analytics-ui-${version}.tgz`),
            core: await versionIn(`umbraco-analytics-ui-core-${version}.tgz`),
        };
    } finally {
        rmSync(scratch, { recursive: true, force: true });
    }
}

/**
 * Vitest browser command: runs the root `ci:pack-client` script the way the Azure pipeline does (BUILD_BUILDID set, so
 * `prepack:api` rewrites the Client package.json and drops its scripts) in a scratch copy of the repo, and returns the
 * tarballs that land in NPM_OUTPUT_DIR with the version in each one. Only the type build is swapped for a no-op, and the
 * scratch project reuses the worktree's node_modules, so nothing in the worktree is touched.
 */
export async function packLikeCi(_context: unknown, version: string): Promise<{ files: string[]; versions: Record<string, string> }> {
    const scratch = mkdtempSync(join(tmpdir(), "uaui-ci-pack-"));
    try {
        const project = process.cwd();
        const repoRoot = join(project, "../../..");
        const client = join(scratch, "src/Umbraco.Analytics.UI/Client");
        mkdirSync(join(client, "dist/core"), { recursive: true });
        mkdirSync(join(client, "types/core"), { recursive: true });
        copyFileSync(join(repoRoot, "package.json"), join(scratch, "package.json"));
        writeFileSync(join(scratch, "LICENSE.md"), "licence");
        writeFileSync(join(client, "dist/core/analytics-ui-core.js"), "export {};\n");
        writeFileSync(join(client, "types/core/analytics-ui-core.d.ts"), "export {};\n");
        const packageJson = JSON.parse(readFileSync(join(project, "package.json"), "utf8")) as { scripts: Record<string, string> };
        packageJson.scripts["build:api"] = `"${process.execPath}" -e 0`;
        writeFileSync(join(client, "package.json"), JSON.stringify(packageJson));
        writeFileSync(join(client, "README.md"), "readme");
        cpSync(join(project, "devops/publish"), join(client, "devops/publish"), { recursive: true });
        cpSync(join(project, "core"), join(client, "core"), { recursive: true });
        symlinkSync(join(project, "node_modules"), join(client, "node_modules"), "dir");
        const output = join(scratch, "output");
        const env = { ...process.env, BUILD_BUILDID: "1", NPM_PACKAGE_VERSION: version, NPM_OUTPUT_DIR: output };
        await run("npm", ["run", "ci:pack-client"], { cwd: scratch, env });
        const files = readdirSync(output).sort();
        const versions: Record<string, string> = {};
        for (const file of files) {
            const { stdout } = await run("tar", ["-xzOf", join(output, file), "package/package.json"]);
            versions[file] = (JSON.parse(stdout) as { version: string }).version;
        }
        return { files, versions };
    } finally {
        rmSync(scratch, { recursive: true, force: true });
    }
}
