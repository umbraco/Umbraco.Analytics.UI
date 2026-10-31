// T51 — An empty slotted element is no content, so a live region can stay mounted
/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { html, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import { axeRun } from "../internal/test/a11y.js";
import { renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import "../stat/stat.element.js";
import { hasSlotContent } from "./internal/slot-content.controller.js";
import { nameColumns } from "./table-fixtures.js";

const rows = [
    { name: "Contact", views: 62 },
    { name: "Home", views: 210 },
];
const footer = (el: Element) => shadow(el).querySelector(".footer") as HTMLElement;
/**
 * The footer section; with two rows there is no pager, so it shows only for slot content. When empty it is visually
 * hidden (1px, clipped) rather than `display: none`, so whether it shows is whether it takes up space.
 */
const footerShown = (el: Element) => footer(el).getBoundingClientRect().height > 1;
const columnToolbarShown = (el: Element) => (shadow(el).querySelector("uui-table-row.column-toolbar") as HTMLElement).checkVisibility();
/** The toolbar is always drawn; it pads itself, and the headings get a top border, only while it has content. */
const toolbarShown = (el: Element) => shadow(el).querySelector(".region")!.classList.contains("has-toolbar");
const table = (slotted: TemplateResult) =>
    renderElement(html`<uaui-data-table .columns=${nameColumns} .rows=${rows}>${slotted}</uaui-data-table>`, "uaui-data-table");
const status = (el: Element) => el.querySelector("[role='status']") as HTMLElement;

describe("Feature: an empty slotted element counts as no content", () => {
    describe("Scenario: the footer slot", () => {
        it("hides the footer for an empty element", async () => {
            expect(footerShown(await table(html`<div slot="footer" role="status"></div>`))).toBe(false);
        });

        it("hides the footer for an element with only whitespace", async () => {
            expect(footerShown(await table(html`<div slot="footer" role="status">  \n  </div>`))).toBe(false);
        });

        it("shows the footer for an element with text", async () => {
            expect(footerShown(await table(html`<div slot="footer" role="status">Showing orders for Ada</div>`))).toBe(true);
        });

        it("shows the footer for an element holding an element", async () => {
            expect(footerShown(await table(html`<div slot="footer"><uui-icon name="icon-check"></uui-icon></div>`))).toBe(true);
        });

        it("shows the footer for a custom element with no children, as it draws itself", async () => {
            expect(footerShown(await table(html`<uaui-stat slot="footer" label="Views" value="272"></uaui-stat>`))).toBe(true);
        });

        it("shows the footer when one of several slotted elements has content", async () => {
            expect(footerShown(await table(html`<div slot="footer"></div><span slot="footer">Updated</span>`))).toBe(true);
        });
    });

    describe("Scenario: an empty footer stays in the accessibility tree", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await table(html`<div slot="footer" role="status" aria-label="Opened buyer"></div>`);
        });

        it("is not display: none", () => {
            expect(getComputedStyle(footer(el)).display).not.toBe("none");
            expect(footer(el).hasAttribute("hidden")).toBe(false);
        });

        it("takes no visible space and draws no border or padding", () => {
            const style = getComputedStyle(footer(el));
            expect(footer(el).getBoundingClientRect().height).toBeLessThanOrEqual(1);
            expect([style.position, style.borderTopWidth, style.paddingTop, style.clipPath]).toEqual(["absolute", "0px", "0px", "inset(50%)"]);
        });

        it("adds no height to the table", async () => {
            const bare = await renderElement(html`<uaui-data-table .columns=${nameColumns} .rows=${rows}></uaui-data-table>`, "uaui-data-table");
            expect(el.getBoundingClientRect().height).toBe(bare.getBoundingClientRect().height);
        });

        it("leaves the status element in the accessibility tree while empty", () => {
            // An element under display: none (or `hidden`) is not rendered, so it has no box and is out of the tree.
            expect(status(el).checkVisibility()).toBe(true);
            expect([status(el).getAttribute("role"), status(el).getAttribute("aria-label")]).toEqual(["status", "Opened buyer"]);
        });

        it("adds no focusable stop", () => {
            expect(footer(el).querySelector("uaui-compact-pager")).toBe(null);
            expect(footer(el).querySelectorAll("[tabindex], button, a, input, select")).toHaveLength(0);
        });

        it("passes the a11y audit", async () => {
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: a forwarded slot", () => {
        it("counts as content, so a product wrapping the table keeps its footer and toolbar", async () => {
            const el = await table(html`<slot name="note" slot="footer"></slot><slot name="search" slot="toolbar"></slot>`);
            expect([footerShown(el), toolbarShown(el)]).toEqual([true, true]);
        });
    });

    describe("Scenario: an element moves into and out of the footer slot", () => {
        let el: UauiTestElement;
        let note: HTMLElement;
        beforeEach(async () => {
            el = await table(html`<span slot="toolbar">Updated</span>`);
            note = el.querySelector("span")!;
        });

        it("shows the footer when its slot becomes footer", async () => {
            expect(footerShown(el)).toBe(false);
            note.slot = "footer";
            await expect.poll(() => footerShown(el)).toBe(true);
        });

        it("hides the footer when its slot changes away from footer", async () => {
            note.slot = "footer";
            await expect.poll(() => footerShown(el)).toBe(true);
            note.slot = "toolbar";
            await expect.poll(() => footerShown(el)).toBe(false);
        });

        it("hides the footer when the slot attribute is removed", async () => {
            note.slot = "footer";
            await expect.poll(() => footerShown(el)).toBe(true);
            note.removeAttribute("slot");
            await expect.poll(() => footerShown(el)).toBe(false);
        });
    });

    describe("Scenario: a live region gains and loses text", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await table(html`<div slot="footer" role="status"></div>`);
        });

        it("shows the footer when text is put in", async () => {
            status(el).textContent = "Showing orders for Ada";
            await expect.poll(() => footerShown(el)).toBe(true);
        });

        it("shows the footer when a text node changes from whitespace to text", async () => {
            const text = document.createTextNode(" ");
            status(el).append(text);
            await settle(el);
            expect(footerShown(el)).toBe(false);
            text.data = "Showing orders for Ada";
            await expect.poll(() => footerShown(el)).toBe(true);
        });

        it("shows the footer when an element is put in", async () => {
            const strong = document.createElement("strong");
            status(el).append(strong);
            await expect.poll(() => footerShown(el)).toBe(true);
        });

        it("hides the footer again when the text is cleared", async () => {
            status(el).textContent = "Showing orders for Ada";
            await expect.poll(() => footerShown(el)).toBe(true);
            status(el).textContent = "";
            await expect.poll(() => footerShown(el)).toBe(false);
        });

        it("keeps the live region in the DOM throughout", async () => {
            status(el).textContent = "Showing orders for Ada";
            await expect.poll(() => footerShown(el)).toBe(true);
            status(el).textContent = "";
            await expect.poll(() => footerShown(el)).toBe(false);
            expect(status(el).isConnected).toBe(true);
        });

        it("passes the a11y audit while empty and while filled", async () => {
            expect(await axeRun(el)).toHaveNoViolations();
            status(el).textContent = "Showing orders for Ada";
            await expect.poll(() => footerShown(el)).toBe(true);
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: the table is taken out of the page", () => {
        let el: UauiTestElement;
        let parent: Element;
        beforeEach(async () => {
            el = await table(html`<div slot="footer" role="status"></div>`);
            parent = el.parentElement!;
        });
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("stops watching its slotted content", async () => {
            el.remove();
            const update = vi.spyOn(el as UauiTestElement & { requestUpdate(): void }, "requestUpdate");
            status(el).textContent = "Showing orders for Ada";
            // Mutation records are delivered as a microtask; give them a few turns.
            await new Promise((resolve) => setTimeout(resolve, 20));
            expect(update).not.toHaveBeenCalled();
        });

        it("looks again when put back, so text added while detached shows the footer", async () => {
            el.remove();
            status(el).textContent = "Showing orders for Ada";
            parent.append(el);
            await expect.poll(() => footerShown(el)).toBe(true);
        });

        it("keeps watching after it is put back", async () => {
            el.remove();
            parent.append(el);
            await settle(el);
            status(el).textContent = "Showing orders for Ada";
            await expect.poll(() => footerShown(el)).toBe(true);
        });
    });

    describe("Scenario: the toolbar slots follow the same rule", () => {
        it("hides the toolbar for an empty element", async () => {
            expect(toolbarShown(await table(html`<div slot="toolbar" role="status"></div>`))).toBe(false);
        });

        it("hides the column toolbar for empty elements", async () => {
            const el = await table(html`<span slot="toolbar-start"></span><span slot="toolbar-views"> </span>`);
            expect(columnToolbarShown(el)).toBe(false);
        });

        it("shows the toolbar when its element gains text", async () => {
            const el = await table(html`<div slot="toolbar" role="status"></div>`);
            status(el).textContent = "3 matches";
            await expect.poll(() => toolbarShown(el)).toBe(true);
        });

        it("shows the column toolbar when its element gains text", async () => {
            const el = await table(html`<span slot="toolbar-views"></span>`);
            el.querySelector("[slot='toolbar-views']")!.textContent = "272";
            await expect.poll(() => columnToolbarShown(el)).toBe(true);
        });
    });

    describe("Scenario: content that was already slotted", () => {
        it("still shows the footer for text", async () => {
            expect(footerShown(await table(html`<span slot="footer">Updated</span>`))).toBe(true);
        });

        it("still shows the toolbar for text", async () => {
            expect(toolbarShown(await table(html`<div slot="toolbar">Total 272</div>`))).toBe(true);
        });

        it("still shows the column toolbar for a stat", async () => {
            expect(columnToolbarShown(await table(html`<uaui-stat slot="toolbar-views" label="Views" value="272"></uaui-stat>`))).toBe(true);
        });

        it("hides the footer when the slotted element is removed", async () => {
            const el = await table(html`<span slot="footer">Updated</span>`);
            el.querySelector("[slot='footer']")!.remove();
            await expect.poll(() => footerShown(el)).toBe(false);
        });
    });
});

describe("hasSlotContent", () => {
    const make = (markup: string) => {
        const host = document.createElement("div");
        host.innerHTML = markup;
        return host.firstElementChild!;
    };

    it("is false for an empty or whitespace-only plain element", () => {
        expect([make("<div></div>"), make("<span> \n </span>")].map(hasSlotContent)).toEqual([false, false]);
    });

    it("is true for text, a child element, or a comment beside text", () => {
        expect([make("<div>a</div>"), make("<div><b></b></div>"), make("<div><!-- x -->a</div>")].map(hasSlotContent)).toEqual([true, true, true]);
    });

    it("is false for a comment alone", () => {
        expect(hasSlotContent(make("<div><!-- x --></div>"))).toBe(false);
    });

    it("is true for elements that draw themselves, and a forwarded slot", () => {
        const drawn = [make("<img alt=''>"), make("<input>"), make("<hr>"), make("<svg></svg>"), make("<my-widget></my-widget>"), make("<slot name='x'></slot>")];
        const shadowed = document.createElement("div");
        shadowed.attachShadow({ mode: "open" });
        expect([...drawn, shadowed].map(hasSlotContent)).toEqual([true, true, true, true, true, true, true]);
    });
});
