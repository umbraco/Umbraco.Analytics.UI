// The Umbraco keys the code reuses must exist in the backoffice's own English, and the core's built-in copy of them
// must say the same. Both need the backoffice's dictionary, so they run in the umbraco project.
import { describe, expect, it } from "vitest";
import { usedUmbracoKeys } from "../../internal/test/shipped-source.js";
import { fallbackEnglish } from "../core/fallback-en.js";
import backofficeEn from "./backoffice-en.js";

const flatten = (dictionary: Record<string, unknown>): string[] =>
    Object.entries(dictionary).flatMap(([section, terms]) =>
        Object.keys(terms as Record<string, unknown>).map((key) => `${section}_${key}`),
    );

const umbracoKeys = new Set(flatten(backofficeEn as Record<string, unknown>));

describe("Feature: every Umbraco key the code reuses is in the backoffice", () => {
    describe("Scenario: the code reuses an Umbraco key", () => {
        it("uses only keys the backoffice's English text has", () => {
            expect([...usedUmbracoKeys()].filter((key) => !umbracoKeys.has(key))).toEqual([]);
        });
    });

    describe("Scenario: the core carries English for the Umbraco keys the code reuses", () => {
        it("has the same English text as the backoffice", () => {
            const backoffice = Object.fromEntries(Object.keys(fallbackEnglish).map((key) => {
                const [section, ...rest] = key.split("_");
                return [key, (backofficeEn as Record<string, Record<string, string>>)[section]?.[rest.join("_")]];
            }));
            expect(fallbackEnglish).toEqual(backoffice);
        });
    });
});
