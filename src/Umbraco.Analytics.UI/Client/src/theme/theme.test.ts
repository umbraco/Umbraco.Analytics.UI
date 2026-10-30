// FND-1 — Theme tokens products can override
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, type UanTestElement } from "../internal/test/pending.js";
import "../delta-badge/delta-badge.element.js";

const token = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();
const uui = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

describe("Feature: theme tokens products can override", () => {
    describe("Scenario: default series colours", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-delta-badge .value=${1}></uan-delta-badge>`, "uan-delta-badge");
        });

        it.skip("sets --uan-series-1 from --uui-palette-space-cadet", () => {
            expect(token(el, "--uan-series-1")).toBe(uui("--uui-palette-space-cadet"));
        });
    });

    describe("Scenario: override from a parent", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<div style="--uan-series-1: rgb(1, 2, 3)"><uan-delta-badge .value=${1}></uan-delta-badge></div>`,
                "uan-delta-badge",
            );
        });

        it.skip("uses the parent's colour", () => {
            expect(token(el, "--uan-series-1")).toBe("rgb(1, 2, 3)");
        });
    });

    describe("Scenario: tints follow the theme", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-delta-badge .value=${1}></uan-delta-badge>`, "uan-delta-badge");
        });

        it.skip("derives --uan-tint-positive from --uui-color-positive", () => {
            expect(token(el, "--uan-tint-positive")).toContain("--uui-color-positive");
        });
    });
});
