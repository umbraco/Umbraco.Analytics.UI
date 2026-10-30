// Docs: every public element is listed in both READMEs, so a new element can't ship undocumented.
import { describe, expect, it } from "vitest";
import repoReadme from "../../../../../../README.md?raw";
import clientReadme from "../../../README.md?raw";

const sources = import.meta.glob<string>(
    ["/src/**/*.element.ts", "!/src/internal/**", "!/src/**/internal/**", "!/src/examples/**"],
    { query: "?raw", import: "default", eager: true },
);

// Registered by the package manifest and opened by `uax-date-range`. Not exported, so not documented.
const NOT_PUBLIC = new Set(["uax-date-range-modal"]);

const publicTags = Object.values(sources)
    .flatMap((source) => [...source.matchAll(/@customElement\("([^"]+)"\)/g)].map((match) => match[1]))
    .filter((tag) => !NOT_PUBLIC.has(tag));

describe("Feature: the READMEs list every public element", () => {
    it("finds the public elements", () => {
        expect(publicTags.length).toBeGreaterThanOrEqual(13);
    });

    describe.each([
        ["the repo README", repoReadme],
        ["the package README", clientReadme],
    ])("Scenario: %s", (_name, readme) => {
        it.each(publicTags)("mentions %s", (tag) => {
            expect(readme).toMatch(new RegExp(`(?<![\\w-])${tag}(?![\\w-])`));
        });
    });
});
