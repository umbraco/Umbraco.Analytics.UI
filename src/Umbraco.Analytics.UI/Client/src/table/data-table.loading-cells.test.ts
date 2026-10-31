// TBL-1 — Loading rows draw each column's own cell
import { describe, expect, it } from "vitest";
import { customElement, html, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import "@umbraco-cms/backoffice/external/uui";
import { deepQueryAll, renderElement, settle, shadow } from "../internal/test/dom.js";
import "./data-table.element.js";
import "./cells/index.js";
import type { UauiTableCellElement, UauiTableColumn } from "./types.js";

/** A product's own cell that draws its own placeholder while `loading`. */
@customElement("uaui-test-loading-cell")
class TestLoadingCellElement extends UmbLitElement implements UauiTableCellElement {
    @property({ attribute: false }) column: UauiTableColumn = { key: "", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;
    @property({ type: Boolean }) loading = false;

    override render() {
        return this.loading ? html`<span class="mine-loading"></span>` : html`${String(this.value ?? "")}`;
    }
}

/** A product's own cell that knows nothing about `loading`. */
@customElement("uaui-test-plain-cell")
class TestPlainCellElement extends UmbLitElement implements UauiTableCellElement {
    @property({ attribute: false }) column: UauiTableColumn = { key: "", label: "" };
    @property({ attribute: false }) item: Record<string, unknown> = {};
    @property({ attribute: false }) value: unknown;

    override render() {
        return html`${String(this.value ?? "")}`;
    }
}

const loadingTable = (elementName: string) =>
    renderElement(
        html`<div style="width: 600px"><uaui-data-table loading .columns=${[{ key: "n", label: "N", elementName }]} .rows=${[]}></uaui-data-table></div>`,
        "uaui-data-table",
    );
const mine = (el: Element) => deepQueryAll(shadow(el), ".mine-loading");
const generic = (el: Element) => shadow(el).querySelectorAll("uaui-table-skeleton-cell");

describe("Feature: loading rows draw each column's own cell", () => {
    describe("Scenario: a product cell with a loading property", () => {
        it("draws its own placeholder in every loading row", async () => {
            const el = await loadingTable("uaui-test-loading-cell");
            await settle(el);
            expect(mine(el).length).toBe(5);
        });

        it("gets no generic placeholder", async () => {
            const el = await loadingTable("uaui-test-loading-cell");
            await settle(el);
            expect(generic(el).length).toBe(0);
        });
    });

    describe("Scenario: a product cell without a loading property", () => {
        it("gets the generic placeholder", async () => {
            const el = await loadingTable("uaui-test-plain-cell");
            await settle(el);
            expect(generic(el).length).toBe(5);
        });
    });

    describe("Scenario: a cell that is registered after the table renders", () => {
        it("shows the generic placeholder until the cell is defined, then the cell's own", async () => {
            const el = await loadingTable("uaui-test-late-cell");
            await settle(el);
            const before = generic(el).length;
            customElements.define("uaui-test-late-cell", class extends TestLoadingCellElement {});
            await customElements.whenDefined("uaui-test-late-cell");
            await settle(el);
            expect([before, generic(el).length, mine(el).length]).toEqual([5, 0, 5]);
        });
    });
});

declare global {
    interface HTMLElementTagNameMap {
        "uaui-test-loading-cell": TestLoadingCellElement;
        "uaui-test-plain-cell": TestPlainCellElement;
    }
}
