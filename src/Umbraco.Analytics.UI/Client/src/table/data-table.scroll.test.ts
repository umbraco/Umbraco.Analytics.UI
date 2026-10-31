// TBL-8 — Columns that don't fit scroll sideways
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./data-table.element.js";
import { UAUI_TABLE_CELL } from "./cells/cell-names.js";

// Like Umbraco AI's usage table: a text column, two share columns, a percent and a number column.
const columns = [
    { key: "name", label: "Model", elementName: UAUI_TABLE_CELL.text, width: "28%" },
    { key: "requests", label: "Requests", elementName: UAUI_TABLE_CELL.share, width: "24%" },
    { key: "tokens", label: "Tokens", elementName: UAUI_TABLE_CELL.share, width: "24%" },
    { key: "rate", label: "Success rate", elementName: UAUI_TABLE_CELL.percent, align: "end" },
    { key: "duration", label: "Avg duration", elementName: UAUI_TABLE_CELL.number, align: "end" },
];
const rows = [
    { name: "gpt-4o", requests: 120, tokens: 52000, rate: 0.98, duration: 840 },
    { name: "claude-sonnet", requests: 80, tokens: 31000, rate: 0.99, duration: 910 },
];

const NARROW = "width: 420px";
const WIDE = "width: 1440px";

const scroller = (el: Element) => shadow(el).querySelector<HTMLElement>(".scroll")!;
const lastCell = (el: Element) => shadow(el).querySelector<HTMLElement>("uui-table-row:not(.column-toolbar) uui-table-cell:last-child")!;

async function renderTable(width: string): Promise<{ host: HTMLElement; el: UauiTestElement }> {
    const host = render(
        html`<div style="${width}; background: var(--uui-color-surface); color: var(--uui-color-text)">
            <uaui-data-table .columns=${columns} .rows=${rows}></uaui-data-table>
        </div>`,
    ).container.querySelector("div")!;
    const el = host.querySelector("uaui-data-table") as unknown as UauiTestElement;
    await settle(el);
    // The observer reports after layout, then the table renders the attributes.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await settle(el);
    return { host, el };
}

describe("Feature: columns that don't fit scroll sideways", () => {
    describe("Scenario: a narrow container", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            ({ el } = await renderTable(NARROW));
        });

        it("scrolls the columns sideways", () => {
            expect(scroller(el).scrollWidth).toBeGreaterThan(scroller(el).clientWidth);
        });

        it("reaches the last column by scrolling", () => {
            const area = scroller(el);
            area.scrollLeft = area.scrollWidth;
            expect(lastCell(el).getBoundingClientRect().right).toBeLessThanOrEqual(area.getBoundingClientRect().right + 0.5);
        });

        it("is reachable by keyboard", () => {
            expect(scroller(el).getAttribute("tabindex")).toBe("0");
        });

        it("is a region", () => {
            expect(scroller(el).getAttribute("role")).toBe("region");
        });

        it("is named in plain words", () => {
            expect(scroller(el).getAttribute("aria-label")).toBe("Table, scroll sideways to see more columns");
        });
    });

    describe("Scenario: a wide container", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            ({ el } = await renderTable(WIDE));
        });

        it("doesn't scroll", () => {
            expect(scroller(el).scrollWidth).toBeLessThanOrEqual(scroller(el).clientWidth);
        });

        it("adds no tab stop", () => {
            expect(scroller(el).hasAttribute("tabindex")).toBe(false);
        });

        it("is not a region", () => {
            expect(scroller(el).hasAttribute("role")).toBe(false);
        });
    });

    describe("Scenario: the container widens", () => {
        it("drops the tab stop", async () => {
            const { host, el } = await renderTable(NARROW);
            host.style.width = "1440px";
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            await settle(el);
            expect(scroller(el).hasAttribute("tabindex")).toBe(false);
        });

        it("drops the region role", async () => {
            const { host, el } = await renderTable(NARROW);
            host.style.width = "1440px";
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            await settle(el);
            expect(scroller(el).hasAttribute("role")).toBe(false);
        });
    });

    describe("Scenario: the container narrows", () => {
        it("adds the tab stop", async () => {
            const { host, el } = await renderTable(WIDE);
            host.style.width = "420px";
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            await settle(el);
            expect(scroller(el).getAttribute("tabindex")).toBe("0");
        });
    });

    describe("Scenario: the table is moved in the page", () => {
        const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

        it("drops the tab stop when it fits after the move", async () => {
            const { host, el } = await renderTable(NARROW);
            const parent = host.parentElement!;
            host.remove();
            host.style.width = "1440px";
            parent.appendChild(host);
            await frames();
            await settle(el);
            expect(scroller(el).hasAttribute("tabindex")).toBe(false);
        });

        it("adds the tab stop when it overflows after the move", async () => {
            const { host, el } = await renderTable(WIDE);
            const parent = host.parentElement!;
            host.remove();
            host.style.width = "420px";
            parent.appendChild(host);
            await frames();
            await settle(el);
            expect(scroller(el).getAttribute("tabindex")).toBe("0");
        });
    });

    describe("Scenario: the container widens while the area has focus", () => {
        it("keeps the tab stop", async () => {
            const { host, el } = await renderTable(NARROW);
            scroller(el).focus();
            host.style.width = "1440px";
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            await settle(el);
            expect(scroller(el).getAttribute("tabindex")).toBe("0");
        });
    });

    describe("Scenario: the area loses focus after the container widens", () => {
        it("drops the tab stop", async () => {
            const { host, el } = await renderTable(NARROW);
            scroller(el).focus();
            host.style.width = "1440px";
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            await settle(el);
            scroller(el).blur();
            await settle(el);
            expect(scroller(el).hasAttribute("tabindex")).toBe(false);
        });
    });

    describe("Scenario: a11y audit while scrolling", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const { host } = await renderTable(NARROW);
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        it("passes in the light theme", async () => {
            expect(await audit()).toHaveNoViolations();
        });

        it("passes in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });

        it("passes in the high contrast theme", async () => {
            expect(await audit(highContrastCss)).toHaveNoViolations();
        });
    });
});
