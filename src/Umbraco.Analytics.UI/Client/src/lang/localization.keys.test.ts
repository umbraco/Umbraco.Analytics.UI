// FND-2 — Built-in text is translated: the keys the code uses and the keys the dictionary has agree.
import { describe, expect, it } from "vitest";
import backofficeEn from "../internal/test/backoffice-en.js";
import { shippedSources, usedUauiKeys, usedUmbracoKeys } from "../internal/test/shipped-source.js";
import en from "./en.js";

const flatten = (dictionary: Record<string, unknown>): string[] =>
    Object.entries(dictionary).flatMap(([section, terms]) =>
        Object.keys(terms as Record<string, unknown>).map((key) => `${section}_${key}`),
    );

const dictionaryKeys = new Set(flatten(en));
const umbracoKeys = new Set(flatten(backofficeEn as Record<string, unknown>));

describe("Feature: every key is defined and used", () => {
    describe("Scenario: the code asks for a package key", () => {
        it("has every uauiAnalytics_ key it uses in en.ts", () => {
            expect([...usedUauiKeys()].filter((key) => !dictionaryKeys.has(key))).toEqual([]);
        });
    });

    describe("Scenario: en.ts defines a key", () => {
        it("uses every key it defines", () => {
            expect([...dictionaryKeys].filter((key) => !usedUauiKeys().has(key))).toEqual([]);
        });
    });

    describe("Scenario: the code reuses an Umbraco key", () => {
        it("uses only keys the backoffice's English text has", () => {
            expect([...usedUmbracoKeys()].filter((key) => !umbracoKeys.has(key))).toEqual([]);
        });
    });

    describe("Scenario: a template passes literal text to a label", () => {
        it("passes only translated text to label, headline, placeholder and title", () => {
            const literal = /(?:\.|\b)(?:label|headline|placeholder|title|aria-label)(?:=\$\{\s*["'`][^"'`]*[A-Za-z][^"'`]*["'`]\s*\}|="[^"$]*[A-Za-z][^"]*")/;
            expect(shippedSources().filter(([, source]) => literal.test(source)).map(([path]) => path)).toEqual([]);
        });
    });

    describe("Scenario: a key is built from parts", () => {
        it("writes every key out whole, so the scan above can see it", () => {
            const built = shippedSources().filter(([, source]) => /uauiAnalytics_\$\{|term\(\s*`/.test(source));
            expect(built.map(([path]) => path)).toEqual([]);
        });
    });
});
