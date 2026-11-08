import { execFile } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
