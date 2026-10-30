// FND-1 — Theme tokens products can override
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, type UaxTestElement } from "../test/pending.js";
import "../../delta-badge/delta-badge.element.js";

/**
 * The colour `value` resolves to on `el`. A custom property that holds `light-dark()` isn't
 * evaluated until it's used, so apply it as `color` and read the computed colour back.
 */
const colourOf = (el: HTMLElement, value: string) => {
    const previous = el.style.color;
    el.style.color = value;
    const resolved = getComputedStyle(el).color;
    el.style.color = previous;
    return resolved;
};

describe("Feature: theme tokens products can override", () => {
    describe("Scenario: default series colours in the light theme", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-delta-badge .value=${1}></uax-delta-badge>`, "uax-delta-badge");
        });

        it("resolves --uax-color-series-1 to --uui-palette-space-cadet in the light theme", () => {
            expect(colourOf(el, "var(--uax-color-series-1)")).toBe(colourOf(el, "var(--uui-palette-space-cadet)"));
        });
    });

    describe("Scenario: override from a parent", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<div style="--uax-series-1: rgb(1, 2, 3)"><uax-delta-badge .value=${1}></uax-delta-badge></div>`,
                "uax-delta-badge",
            );
        });

        it("resolves --uax-color-series-1 to the parent's colour", () => {
            expect(colourOf(el, "var(--uax-color-series-1)")).toBe("rgb(1, 2, 3)");
        });
    });

    describe("Scenario: tints follow a parent that changes --uui-color-positive", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            // Changing the semantic colour changes the tint only if the tint is derived from it
            el = await renderElement(
                html`<div style="--uui-color-positive: rgb(1, 2, 3)">
                    <uax-delta-badge .value=${1}></uax-delta-badge>
                </div>`,
                "uax-delta-badge",
            );
        });

        it("derives --uax-color-tint-positive from the parent's --uui-color-positive", () => {
            const value = getComputedStyle(el).getPropertyValue("--uax-color-tint-positive");
            expect(value).toMatch(/rgb\(\s*1\s*,\s*2\s*,\s*3\s*\)/);
        });
    });

    describe("Scenario: dark theme picks the dark shade", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<div style="--uui-color-scheme: dark"><uax-delta-badge .value=${1}></uax-delta-badge></div>`,
                "uax-delta-badge",
            );
        });

        it("resolves --uax-color-series-1 to --uui-palette-malibu-light", () => {
            expect(colourOf(el, "var(--uax-color-series-1)")).toBe(colourOf(el, "var(--uui-palette-malibu-light)"));
        });
    });
});
