// Docs: every public element is listed in both READMEs, so a new element can't ship undocumented,
// and every Storybook link in the READMEs and guide pages points at a page that exists.
import { describe, expect, it } from "vitest";
import repoReadme from "../../../../../../README.md?raw";
import clientReadme from "../../../README.md?raw";

const sources = import.meta.glob<string>(
    ["/src/**/*.element.ts", "!/src/internal/**", "!/src/**/internal/**", "!/src/examples/**"],
    { query: "?raw", import: "default", eager: true },
);

// Registered by the package manifest and opened by `uaui-date-range`. Not exported, so not documented.
const NOT_PUBLIC = new Set(["uaui-date-range-modal"]);

const stories = import.meta.glob<string>("/src/**/*.story.ts", { query: "?raw", import: "default", eager: true });
const guides = import.meta.glob<string>("/src/**/*.mdx", { query: "?raw", import: "default", eager: true });

// Storybook's id for a title: "Components/Data Table/Cells" is "components-data-table-cells".
const toId = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const titles = [
    ...Object.values(stories).flatMap((source) => [...source.matchAll(/^\s*title: "([^"]+)"/gm)].map((match) => match[1])),
    ...Object.values(guides).flatMap((source) => [...source.matchAll(/<Meta title="([^"]+)"/g)].map((match) => match[1])),
];
const pageIds = new Set(titles.map(toId));
const linkedIds = (text: string) => [...text.matchAll(/\?path=\/(?:docs|story)\/([a-z0-9-]+?)--/g)].map((match) => match[1]);

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

describe("Feature: Storybook links in the docs resolve", () => {
    it("finds the guide pages", () => {
        expect(Object.keys(guides).length).toBeGreaterThanOrEqual(5);
    });

    // A page with no Storybook link has nothing to check.
    describe.each(
        ([
            ["the repo README", repoReadme],
            ["the package README", clientReadme],
            ...Object.entries(guides),
        ] satisfies [string, string][]).filter(([, text]) => linkedIds(text).length > 0),
    )("Scenario: %s", (_name, text) => {
        it.each([...new Set(linkedIds(text))])("links to the existing page %s", (id) => {
            expect(pageIds.has(id)).toBe(true);
        });
    });
});
