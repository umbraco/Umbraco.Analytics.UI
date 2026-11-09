import { ESLint } from "eslint";

/** A lint finding, reduced to what a spec asserts on. */
export interface LintFinding {
    ruleId: string | null;
    message: string;
}

/**
 * Vitest browser command: lints source text with the project's ESLint config, as if it lived at `filePath`
 * (relative to the Client folder). Lets a browser-run spec check the lint rules without a file on disk.
 */
export async function lintText(_context: unknown, code: string, filePath: string): Promise<LintFinding[]> {
    const eslint = new ESLint({ cwd: process.cwd() });
    const [result] = await eslint.lintText(code, { filePath });
    return result.messages.map(({ ruleId, message }) => ({ ruleId, message }));
}
