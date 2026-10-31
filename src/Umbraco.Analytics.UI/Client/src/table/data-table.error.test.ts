// T27 — table error state
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import { deepQuery, pressed, recordEvents, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import { pageColumns, pageRows } from "./table-fixtures.js";

const errorState = (el: Element) => shadow(el).querySelector("uaui-error-state") as UauiTestElement | null;
const dataRows = (el: Element) => [...shadow(el).querySelectorAll("uui-table-row:not(.summary)")].filter((row) => !row.querySelector("uui-table-head-cell"));

describe("Feature: table error state", () => {
    describe("Scenario: the table has an error", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-data-table .columns=${pageColumns} .rows=${pageRows} error retryable></uaui-data-table>`,
                "uaui-data-table",
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
            expect(shadow(el).querySelector("uaui-compact-pager")).toBe(null);
        });

        it("shows no empty state", () => {
            expect(shadow(el).querySelector("uaui-empty-state")).toBe(null);
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
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uaui-data-table .columns=${pageColumns} .rows=${[]} error loading></uaui-data-table>`,
                "uaui-data-table",
            );
            await settle(el);
        });

        it("shows the error state", () => {
            expect(errorState(el)).not.toBe(null);
        });

        it("shows no skeleton", () => {
            expect(deepQuery(shadow(el), "uaui-skeleton")).toBe(null);
        });

        it("is not busy", () => {
            expect(shadow(el).querySelector("uui-table")?.getAttribute("aria-busy")).toBe("false");
        });
    });
});
