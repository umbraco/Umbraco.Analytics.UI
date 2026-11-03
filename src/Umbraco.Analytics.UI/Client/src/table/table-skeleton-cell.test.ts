/// <reference types="vite/client" />
// T68 — The exported table skeleton cell: `lines` and `align`.
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { settle, shadow } from "../internal/test/dom.js";
import "./index.js";

async function mount(attrs: { lines?: number; align?: "start" | "end" } = {}): Promise<HTMLElement> {
    const cell = render(html`<div style="width: 200px"><uaui-table-skeleton-cell .lines=${(attrs.lines ?? 1) as 1 | 2} .align=${attrs.align ?? "start"}></uaui-table-skeleton-cell></div>`).container.querySelector<HTMLElement>("uaui-table-skeleton-cell")!;
    await settle(cell);
    return cell;
}
const lines = (cell: Element) => shadow(cell).querySelectorAll(".line");

describe("Feature: the table skeleton cell", () => {
    it("is exported from the table entry", async () => {
        const exported = await import("./index.js");
        expect(exported.UauiTableSkeletonCellElement).toBe(customElements.get("uaui-table-skeleton-cell"));
    });

    it("draws one line by default", async () => {
        expect(lines(await mount()).length).toBe(1);
    });

    it("draws two lines for lines of 2", async () => {
        expect(lines(await mount({ lines: 2 })).length).toBe(2);
    });

    it("reads any other number as one line", async () => {
        expect(lines(await mount({ lines: 5 })).length).toBe(1);
    });

    it("is as tall as a loaded two-line cell: a 20px line and a 16px line", async () => {
        const cell = await mount({ lines: 2 });
        expect(cell.getBoundingClientRect().height).toBe(36);
    });

    it("puts the blocks at the end for align end", async () => {
        const cell = await mount({ align: "end" });
        const block = shadow(cell).querySelector("uaui-skeleton")!.getBoundingClientRect();
        expect(Math.round(block.right)).toBe(Math.round(cell.getBoundingClientRect().right));
    });

    it("has no accessibility violations", async () => {
        expect(await axeRun(await mount({ lines: 2 }))).toHaveNoViolations();
    });
});
