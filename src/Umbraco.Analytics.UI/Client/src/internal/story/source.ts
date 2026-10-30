/// <reference types="vite/client" />
// Story-only helper: shows a story file's own code in the Storybook docs panel, so the example a
// product developer reads is the code that renders, and can't drift from it.

/** Returns the lines between `// #region <name>` and `// #endregion` in `raw` (a story file imported with `?raw`), under `header`. */
export function regionSource(raw: string, name: string, header = ""): string {
    const start = raw.indexOf(`// #region ${name}\n`);
    if (start < 0) throw new Error(`No "// #region ${name}" in the story source`);
    const bodyStart = raw.indexOf("\n", start) + 1;
    const end = raw.indexOf("// #endregion", bodyStart);
    if (end < 0) throw new Error(`"// #region ${name}" has no "// #endregion"`);
    const body = raw.slice(bodyStart, end).trimEnd();
    return header ? `${header.trimEnd()}\n\n${body}\n` : `${body}\n`;
}

/** The Storybook `parameters.docs` for a story whose docs panel shows a source region. */
export function sourceDocs(code: string) {
    return { source: { code, language: "ts", type: "code" } } as const;
}
