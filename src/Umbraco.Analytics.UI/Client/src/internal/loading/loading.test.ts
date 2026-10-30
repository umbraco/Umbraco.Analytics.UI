// FND-3 — Empty and loading states (loading: AC3–AC6)
// Uses uan-data-table as the host until T5's test host element exists.
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, shadow, type UanTestElement } from "../test/pending.js";

const columns = [{ key: "name", label: "Name", type: "text" }];
const rows = [{ name: "Home" }, { name: "Contact" }];

describe("Feature: loading states", () => {
    describe("Scenario: first load", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-data-table .columns=${columns} loading></uan-data-table>`, "uan-data-table");
        });

        it.skip("shows a skeleton", () => {
            expect(shadow(el).querySelector("[part~='skeleton']")).not.toBe(null);
        });
    });

    describe("Scenario: switching from loading to loaded", () => {
        let el: UanTestElement;
        let loadingHeight: number;
        beforeEach(async () => {
            el = await renderElement(
                html`<uan-data-table .columns=${columns} .rows=${rows} loading></uan-data-table>`,
                "uan-data-table",
            );
            loadingHeight = el.getBoundingClientRect().height;
            el.loading = false;
            await el.updateComplete;
        });

        it.skip("keeps the same height", () => {
            expect(el.getBoundingClientRect().height).toBe(loadingHeight);
        });
    });

    describe("Scenario: reloading with data shown", () => {
        let el: UanTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uan-data-table .columns=${columns} .rows=${rows}></uan-data-table>`, "uan-data-table");
            el.loading = true;
            await el.updateComplete;
        });

        it.skip("keeps the old data visible", () => {
            expect(shadow(el).textContent).toContain("Contact");
        });

        it.skip("shows a loading bar at the top edge", () => {
            expect(shadow(el).querySelector("[part~='loading-bar']")).not.toBe(null);
        });
    });
});
