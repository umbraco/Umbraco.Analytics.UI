// T27 — the data elements in error pass axe in every theme
/// <reference types="vite/client" />
/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { settle } from "../internal/test/dom.js";
import "../chart/time-series-chart.element.js";
import "../kpi-tile/kpi-tile.element.js";
import "../table/data-table.element.js";
import { pageColumns } from "../table/table-fixtures.js";

describe("Feature: data elements in error", () => {
    describe("Scenario: a11y audit of the data elements in error", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface)">
                        <uaui-kpi-tile label="Revenue" icon="icon-coins" error></uaui-kpi-tile>
                        <uaui-time-series-chart .series=${[]} error retryable></uaui-time-series-chart>
                        <uaui-data-table .columns=${pageColumns} .rows=${[]} error retryable></uaui-data-table>
                    </div>`,
                ).container.querySelector("div")!;
                await Promise.all([...host.children].map((child) => settle(child)));
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
