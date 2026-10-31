/// <reference types="vite/client" />
// Tests only; never imported by shipped code. The source of every file that ends up in the bundle, as text, for
// the localization specs that scan it. Stories, specs, fixtures, examples and test helpers are product or test text.
const files = import.meta.glob(
    [
        "../../**/*.ts",
        "!../../**/*.test.ts",
        "!../../**/*.story.ts",
        "!../../**/*fixtures.ts",
        "!../../examples/**",
        "!../../internal/test/**",
        "!../../internal/story/**",
        "!../../lang/**",
    ],
    { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const withoutComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

/** The path and source of every shipped file, comments removed so a key named in a comment doesn't count as used. */
export function shippedSources(): [path: string, source: string][] {
    return Object.entries(files).map(([path, source]) => [path, withoutComments(source)]);
}

/** Every `uauiAnalytics_*` key written out in shipped code. */
export function usedUauiKeys(): Set<string> {
    return new Set(shippedSources().flatMap(([, source]) => source.match(/uauiAnalytics_[A-Za-z0-9]+/g) ?? []));
}

/** Every other key passed to `term(...)` as a literal, such as Umbraco's `general_close`. */
export function usedUmbracoKeys(): Set<string> {
    const found = new Set<string>();
    for (const [, source] of shippedSources()) {
        for (const match of source.matchAll(/\bterm\(\s*"((?!uauiAnalytics_)[a-z]+_[A-Za-z0-9]+)"/g)) found.add(match[1]);
    }
    return found;
}
