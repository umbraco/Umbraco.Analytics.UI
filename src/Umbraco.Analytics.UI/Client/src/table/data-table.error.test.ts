// T27 — table error state
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import { deepQuery, pressed, recordEvents, renderElement, settle, shadow, type UaxTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import { pageColumns, pageRows } from "./table-fixtures.js";

const errorState = (el: Element) => shadow(el).querySelector("uax-error-state") as UaxTestElement | null;
const dataRows = (el: Element) => [...shadow(el).querySelectorAll("uui-table-row:not(.summary)")].filter((row) => !row.querySelector("uui-table-head-cell"));

describe("Feature: table error state", () => {
    describe("Scenario: the table has an error", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table .columns=${pageColumns} .rows=${pageRows} error retryable></uax-data-table>`,
                "uax-data-table",
            );
            await settle(el);
        });

        it("shows the error state", () => {
            expect(errorState(el)).not.toBe(null);
        });

        it("keeps the header row", () => {
            expect(shadow(el).querySelectorAll("uui-table-head-cell").length).toBe(3);
        });

        it("shows no rows", () => {
            expect(dataRows(el)).toHaveLength(0);
        });

        it("shows no pager", () => {
            expect(shadow(el).querySelector("uax-compact-pager")).toBe(null);
        });

        it("shows no empty state", () => {
            expect(shadow(el).querySelector("uax-empty-state")).toBe(null);
        });

        it("raises retry on the table", async () => {
            const events = recordEvents(el, "retry");
            await pressed(deepQuery(shadow(el), "uui-button")!);
            expect(events).toHaveLength(1);
        });

        it("hides the summary row", () => {
            expect(shadow(el).querySelector(".summary")?.hasAttribute("hidden")).toBe(true);
        });

        it("shows the rows again when the error is cleared", async () => {
            el.error = false;
            await settle(el);
            expect(dataRows(el)).toHaveLength(pageRows.length);
        });

        it("removes the error state when the error is cleared", async () => {
            el.error = false;
            await settle(el);
            expect(errorState(el)).toBe(null);
        });
    });

    describe("Scenario: the table has an error while loading", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-data-table .columns=${pageColumns} .rows=${[]} error loading></uax-data-table>`,
                "uax-data-table",
            );
            await settle(el);
        });

        it("shows the error state", () => {
            expect(errorState(el)).not.toBe(null);
        });

        it("shows no skeleton", () => {
            expect(deepQuery(shadow(el), "uax-skeleton")).toBe(null);
        });

        it("is not busy", () => {
            expect(shadow(el).querySelector("uui-table")?.getAttribute("aria-busy")).toBe("false");
        });
    });
});
