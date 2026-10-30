// FND-3 — Empty and loading states (loading: AC3–AC6)
// Runs against a test host that uses the loading parts the way a data element (T6, T9, T15) will.
/// <reference types="vite/client" />
import { beforeEach, describe, expect, it } from "vitest";
import { css, customElement, html, nothing, property } from "@umbraco-cms/backoffice/external/lit";
import { UmbLitElement } from "@umbraco-cms/backoffice/lit-element";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../test/a11y.js";
import { renderElement, shadow, type UaxTestElement } from "../test/dom.js";
import { getLoadingMode } from "./loading-mode.js";
import "./skeleton.element.js";
import "./loading-bar.element.js";

const HOST_HEIGHT = 200;

/**
 * Stands in for a data element. It declares its loaded height with `--_uax-skeleton-height`, uses that
 * as the min-height of its region, and picks what to render with `getLoadingMode`.
 */
@customElement("uax-loading-test-host")
class LoadingTestHost extends UmbLitElement {
    @property({ type: Boolean })
    loading = false;

    @property({ type: Array })
    rows: string[] = [];

    override render() {
        const mode = getLoadingMode(this.loading, this.rows.length > 0);
        return html`<div class="region" aria-busy=${this.loading ? "true" : "false"}>
            ${mode === "reload" ? html`<uax-loading-bar></uax-loading-bar>` : nothing}
            ${mode === "skeleton"
                ? html`<uax-skeleton></uax-skeleton>`
                : html`<ul>
                      ${this.rows.map((row) => html`<li>${row}</li>`)}
                  </ul>`}
        </div>`;
    }

    static override styles = css`
        :host {
            display: block;
            --_uax-skeleton-height: ${HOST_HEIGHT}px;
        }
        .region {
            position: relative;
            min-height: var(--_uax-skeleton-height);
            background: var(--uui-color-surface);
            color: var(--uui-color-text);
        }
        ul {
            margin: 0;
            padding: 0;
            list-style: none;
        }
    `;
}

const rows = ["Home", "Contact"];

describe("Feature: loading states", () => {
    describe("Scenario: first load", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(html`<uax-loading-test-host loading></uax-loading-test-host>`, "uax-loading-test-host");
        });

        it("shows a skeleton", () => {
            expect(shadow(el).querySelector("uax-skeleton")).not.toBe(null);
        });

        it("shows no loading bar", () => {
            expect(shadow(el).querySelector("uax-loading-bar")).toBe(null);
        });

        it("takes the height the host declares", () => {
            expect(shadow(el).querySelector("uax-skeleton")!.getBoundingClientRect().height).toBe(HOST_HEIGHT);
        });

        it("marks its region busy", () => {
            expect(shadow(el).querySelector(".region")!.getAttribute("aria-busy")).toBe("true");
        });
    });

    describe("Scenario: switching from loading to loaded", () => {
        let el: UaxTestElement;
        let loadingHeight: number;
        beforeEach(async () => {
            el = await renderElement(html`<uax-loading-test-host loading></uax-loading-test-host>`, "uax-loading-test-host");
            loadingHeight = el.getBoundingClientRect().height;
            el.rows = rows;
            el.loading = false;
            await el.updateComplete;
        });

        it("keeps the same height", () => {
            expect(el.getBoundingClientRect().height).toBe(loadingHeight);
        });

        it("removes the skeleton", () => {
            expect(shadow(el).querySelector("uax-skeleton")).toBe(null);
        });

        it("clears the busy mark", () => {
            expect(shadow(el).querySelector(".region")!.getAttribute("aria-busy")).toBe("false");
        });
    });

    describe("Scenario: reloading with data shown", () => {
        let el: UaxTestElement;
        let rowTop: number;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-loading-test-host .rows=${rows}></uax-loading-test-host>`,
                "uax-loading-test-host",
            );
            rowTop = shadow(el).querySelector("li")!.getBoundingClientRect().top;
            el.loading = true;
            await el.updateComplete;
        });

        it("keeps the old data visible", () => {
            expect(shadow(el).textContent).toContain("Contact");
        });

        it("shows a loading bar", () => {
            expect(shadow(el).querySelector("uax-loading-bar")).not.toBe(null);
        });

        it("puts the loading bar on the top edge", () => {
            const bar = shadow(el).querySelector("uax-loading-bar")!;
            expect(bar.getBoundingClientRect().top).toBe(el.getBoundingClientRect().top);
        });

        it("doesn't move the old data", () => {
            expect(shadow(el).querySelector("li")!.getBoundingClientRect().top).toBe(rowTop);
        });

        it("shows no skeleton", () => {
            expect(shadow(el).querySelector("uax-skeleton")).toBe(null);
        });

        it("names the loading bar for assistive tech", () => {
            const bar = shadow(el).querySelector("uax-loading-bar")!;
            expect(bar.shadowRoot!.querySelector("[role='progressbar']")!.getAttribute("aria-label")).toBe("Loading");
        });

        it("marks its region busy", () => {
            expect(shadow(el).querySelector(".region")!.getAttribute("aria-busy")).toBe("true");
        });
    });

    describe("Scenario: loaded and idle", () => {
        let el: UaxTestElement;
        beforeEach(async () => {
            el = await renderElement(
                html`<uax-loading-test-host .rows=${rows}></uax-loading-test-host>`,
                "uax-loading-test-host",
            );
        });

        it("shows no loading bar", () => {
            expect(shadow(el).querySelector("uax-loading-bar")).toBe(null);
        });
    });

    describe("Scenario: a11y audit", () => {
        // Renders the host in a state, optionally under a real UUI theme stylesheet, and audits it.
        async function audit(state: "skeleton" | "reload", themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="background: var(--uui-color-surface)">
                        <uax-loading-test-host
                            loading
                            .rows=${state === "reload" ? rows : []}></uax-loading-test-host>
                    </div>`,
                ).container.querySelector("div")!;
                await host.querySelector("uax-loading-test-host")!.updateComplete;
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        it("passes the skeleton in the light theme", async () => {
            expect(await audit("skeleton")).toHaveNoViolations();
        });

        it("passes the skeleton in the dark theme", async () => {
            expect(await audit("skeleton", darkCss)).toHaveNoViolations();
        });

        it("passes the skeleton in the high contrast theme", async () => {
            expect(await audit("skeleton", highContrastCss)).toHaveNoViolations();
        });

        it("passes the loading bar in the light theme", async () => {
            expect(await audit("reload")).toHaveNoViolations();
        });

        it("passes the loading bar in the dark theme", async () => {
            expect(await audit("reload", darkCss)).toHaveNoViolations();
        });

        it("passes the loading bar in the high contrast theme", async () => {
            expect(await audit("reload", highContrastCss)).toHaveNoViolations();
        });
    });
});

declare global {
    interface HTMLElementTagNameMap {
        "uax-loading-test-host": LoadingTestHost;
    }
}
