// TBL-1 AC5 details — compare rows matched by row-key
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQueryAll, renderElement, shadow } from "../internal/test/dom.js";
import "./data-table.element.js";
import { pageColumns, pageRows } from "./table-fixtures.js";

const compareRows = [{ url: "https://example.com/", pageviews: 190, sessions: 0 }];

const withCompare = () =>
    renderElement(
        html`<uax-data-table .columns=${pageColumns} .rows=${pageRows} .compareRows=${compareRows} row-key="url"></uax-data-table>`,
        "uax-data-table",
    );

const badges = (el: Element, row: number, column: number) =>
    deepQueryAll(shadow(el).querySelectorAll("uui-table-row:not(.summary)")[row].querySelectorAll("uui-table-cell")[column], "uax-delta-badge") as (HTMLElement & {
        value?: number;
    })[];

describe("Feature: table compare rows", () => {
    describe("Scenario: a row with a matching compare row", () => {
        it("gives the badge the percent change from the compare value", async () => {
            const el = await withCompare();
            expect(badges(el, 0, 1)[0].value).toBeCloseTo(((210 - 190) / 190) * 100);
        });
    });

    describe("Scenario: a compare value of zero", () => {
        it("shows no badge", async () => {
            const el = await withCompare();
            expect(badges(el, 0, 2)).toHaveLength(0);
        });
    });

    describe("Scenario: a row with no compare row", () => {
        it("shows no badge", async () => {
            const el = await withCompare();
            expect(badges(el, 1, 1)).toHaveLength(0);
        });
    });

    describe("Scenario: compare rows without a row-key", () => {
        it("shows no badges", async () => {
            const el = await renderElement(
                html`<uax-data-table .columns=${pageColumns} .rows=${pageRows} .compareRows=${compareRows}></uax-data-table>`,
                "uax-data-table",
            );
            expect(shadow(el).querySelectorAll("uax-delta-badge")).toHaveLength(0);
        });
    });

    describe("Scenario: compare rows set after the rows", () => {
        it("adds the badge", async () => {
            const el = await renderElement(
                html`<uax-data-table .columns=${pageColumns} .rows=${pageRows} row-key="url"></uax-data-table>`,
                "uax-data-table",
            );
            el.compareRows = compareRows;
            await el.updateComplete;
            expect(badges(el, 0, 1)).toHaveLength(1);
        });
    });

    describe("Scenario: a11y audit with compare rows", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface); color: var(--uui-color-text); width: 700px">
                        <uax-data-table
                            .columns=${pageColumns}
                            .rows=${pageRows}
                            .compareRows=${[
                                { url: "https://example.com/", pageviews: 190, sessions: 40 },
                                { url: "https://example.com/contact/", pageviews: 80, sessions: 21 },
                            ]}
                            row-key="url"></uax-data-table>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uax-data-table")!.updateComplete;
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
