/// <reference types="vite/client" />
// T61 — KPI tiles that drill down: a link (`href`) or a button that raises `open`, as `uui-card`; and status colours.
import { describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { render } from "vitest-browser-lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import lightCss from "@umbraco-ui/uui/themes/light.css?inline";
import highContrastCss from "@umbraco-ui/uui/themes/high-contrast.css?inline";
import { axeRun } from "../internal/test/a11y.js";
import "./kpi-tile.element.js";
import { recordEvents, renderElement, shadow, type UauiTestElement } from "../internal/test/dom.js";

const tile = (template: TemplateResult) => renderElement(template, "uaui-kpi-tile");
const link = (el: Element) => shadow(el).querySelector("a");
const button = (el: Element) => shadow(el).querySelector("button");

/** Stops a link's navigation, so a test can press it, and records the presses. */
function captureClicks(anchor: HTMLAnchorElement): Event[] {
    const clicks: Event[] = [];
    anchor.addEventListener("click", (e) => {
        e.preventDefault();
        clicks.push(e);
    });
    return clicks;
}

describe("Feature: KPI tiles that drill down", () => {
    describe("Scenario: a tile with an href", () => {
        it("renders the tile as a link to it", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="#history?status=approved"></uaui-kpi-tile>`);
            expect(link(el)?.getAttribute("href")).toBe("#history?status=approved");
            expect(link(el)?.classList.contains("tile")).toBe(true);
            expect(button(el)).toBeNull();
        });

        it("names the link by its label and value", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="#a"></uaui-kpi-tile>`);
            expect(link(el)?.textContent?.replace(/\s+/g, " ").trim()).toBe("Approved 128");
        });

        it("passes target on and adds noopener noreferrer for _blank, as uui-card", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="https://example.com/" target="_blank"></uaui-kpi-tile>`);
            expect(link(el)?.getAttribute("target")).toBe("_blank");
            expect(link(el)?.getAttribute("rel")).toBe("noopener noreferrer");
        });

        it("uses the product's rel when set", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="/a" target="_blank" rel="nofollow"></uaui-kpi-tile>`);
            expect(link(el)?.getAttribute("rel")).toBe("nofollow");
        });

        it("sets no target or rel without a target", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="/a"></uaui-kpi-tile>`);
            expect(link(el)?.hasAttribute("target")).toBe(false);
            expect(link(el)?.hasAttribute("rel")).toBe(false);
        });

        it("raises no open event when followed", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="#a" openable></uaui-kpi-tile>`);
            const events = recordEvents(el, "open");
            captureClicks(link(el)!);
            link(el)!.click();
            expect(events).toHaveLength(0);
        });

        it("keeps the height of a plain tile", async () => {
            const { container } = render(html`<div style="display:grid;grid-template-columns:repeat(2,160px)">
                <uaui-kpi-tile label="Carts created this period" value="1"></uaui-kpi-tile>
                <uaui-kpi-tile label="Orders" value="2" href="#a"></uaui-kpi-tile>
            </div>`);
            const tiles = [...container.querySelectorAll("uaui-kpi-tile")];
            await Promise.all(tiles.map((t) => t.updateComplete));
            const card = (t: Element) => t.shadowRoot!.querySelector(".tile")!.getBoundingClientRect();
            expect(card(tiles[1]!).height).toBe(card(tiles[0]!).height);
            expect(card(tiles[1]!).width).toBe(card(tiles[0]!).width);
        });

        it("isn't underlined at rest", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="#a"></uaui-kpi-tile>`);
            expect(getComputedStyle(link(el)!).textDecorationLine).toBe("none");
            expect(getComputedStyle(shadow(el).querySelector(".label")!).textDecorationLine).toBe("none");
        });
    });

    describe("Scenario (sad path): an href that isn't safe", () => {
        it("ignores a javascript: URL and draws a plain tile", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="javascript:alert(1)"></uaui-kpi-tile>`);
            expect(link(el)).toBeNull();
            expect(shadow(el).querySelector("div.tile")).not.toBeNull();
        });

        it("falls back to openable when set", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="javascript:alert(1)" openable></uaui-kpi-tile>`);
            expect(link(el)).toBeNull();
            expect(button(el)).not.toBeNull();
        });
    });

    describe("Scenario: keyboard on a link tile", () => {
        it("is reached with Tab and followed with Enter", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="#a"></uaui-kpi-tile>`);
            const clicks = captureClicks(link(el)!);
            await userEvent.tab();
            expect(shadow(el).activeElement).toBe(link(el));
            await userEvent.keyboard("{Enter}");
            expect(clicks).toHaveLength(1);
        });

        it("draws uui-card's focus outline: 3px of the focus colour, 3px off", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="#a"></uaui-kpi-tile>`);
            await userEvent.tab();
            const style = getComputedStyle(link(el)!);
            expect(style.outlineStyle).toBe("solid");
            expect(style.outlineWidth).toBe("3px");
            expect(style.outlineOffset).toBe("3px");
        });
    });

    describe("Scenario: hovering a link tile", () => {
        it("underlines the label in the interactive colour, as uui-card's open part", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Approved" value="128" href="#a"></uaui-kpi-tile>`);
            const label = shadow(el).querySelector(".label")!;
            const before = getComputedStyle(label).color;
            await userEvent.hover(page.elementLocator(link(el)!));
            expect(getComputedStyle(label).textDecorationLine).toBe("underline");
            expect(getComputedStyle(label).color).not.toBe(before);
            await userEvent.unhover(page.elementLocator(link(el)!));
        });
    });

    describe("Scenario: an openable tile", () => {
        it("is a plain button, not a toggle", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Pending" value="12" openable></uaui-kpi-tile>`);
            expect(button(el)?.hasAttribute("aria-pressed")).toBe(false);
        });

        it("raises open on click", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Pending" value="12" openable></uaui-kpi-tile>`);
            const events = recordEvents(el, "open");
            button(el)!.click();
            expect(events).toHaveLength(1);
        });

        it("raises open that doesn't bubble and isn't cancelable, as uui-card's", async () => {
            const { container } = render(html`<div><uaui-kpi-tile label="Pending" value="12" openable></uaui-kpi-tile></div>`);
            const el = container.querySelector("uaui-kpi-tile")!;
            await el.updateComplete;
            const outer = recordEvents(container.querySelector("div")!, "open");
            const events = recordEvents(el, "open");
            button(el)!.click();
            expect(events[0]?.cancelable).toBe(false);
            expect(outer).toHaveLength(0);
        });

        for (const key of ["Enter", "Space"]) {
            it(`raises open once on ${key}`, async () => {
                const el = await tile(html`<uaui-kpi-tile label="Pending" value="12" openable></uaui-kpi-tile>`);
                const events = recordEvents(el, "open");
                button(el)!.focus();
                await userEvent.keyboard(key === "Space" ? " " : "{Enter}");
                expect(events).toHaveLength(1);
            });
        }

        it("doesn't change selected", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Pending" value="12" openable></uaui-kpi-tile>`);
            button(el)!.click();
            expect(el.selected).toBe(false);
        });
    });

    describe("Scenario: selectable wins over href and openable", () => {
        let el: UauiTestElement;
        it("stays a toggle button with no link", async () => {
            el = await tile(html`<uaui-kpi-tile label="Orders" value="26" selectable href="#a" openable></uaui-kpi-tile>`);
            expect(link(el)).toBeNull();
            expect(button(el)?.getAttribute("aria-pressed")).toBe("false");
        });

        it("raises selected and no open when pressed", async () => {
            el = await tile(html`<uaui-kpi-tile label="Orders" value="26" selectable href="#a" openable></uaui-kpi-tile>`);
            const opens = recordEvents(el, "open");
            const selects = recordEvents(el, "selected");
            button(el)!.click();
            expect(opens).toHaveLength(0);
            expect(selects).toHaveLength(1);
        });
    });

    describe("Scenario: a tile that isn't a link, button or toggle", () => {
        it("raises no open when clicked", async () => {
            const el = await tile(html`<uaui-kpi-tile label="Orders" value="26"></uaui-kpi-tile>`);
            const events = recordEvents(el, "open");
            el.click();
            expect(events).toHaveLength(0);
        });
    });

    describe("Scenario: status colours", () => {
        const iconBg = (el: Element) => getComputedStyle(shadow(el).querySelector(".icon")!).backgroundColor;
        const iconFg = (el: Element) => getComputedStyle(shadow(el).querySelector(".icon")!).color;

        it("keeps the pink square without a color", async () => {
            const plain = await tile(html`<uaui-kpi-tile label="Orders" value="26" icon="icon-inbox"></uaui-kpi-tile>`);
            const probe = document.createElement("span");
            probe.style.color = "var(--uui-palette-spanish-pink)";
            document.body.appendChild(probe);
            const pink = getComputedStyle(probe).color;
            probe.remove();
            expect(iconBg(plain)).toBe(pink);
        });

        it("gives each color its own square", async () => {
            const colours = new Set<string>();
            for (const color of [undefined, "default", "positive", "warning", "danger"]) {
                const el = await tile(html`<uaui-kpi-tile label="Orders" value="26" icon="icon-inbox" color=${color ?? ""}></uaui-kpi-tile>`);
                colours.add(`${iconBg(el)}|${iconFg(el)}`);
            }
            expect(colours.size).toBe(5);
        });

        it("lets the product's --uaui-kpi-icon-bg win over the status tint", async () => {
            const el = await tile(html`<uaui-kpi-tile style="--uaui-kpi-icon-bg: rgb(1, 2, 3)" label="Orders" value="26" icon="icon-inbox" color="danger"></uaui-kpi-tile>`);
            expect(iconBg(el)).toBe("rgb(1, 2, 3)");
        });
    });

    describe("Scenario: an interactive tile while it first loads", () => {
        const variants = {
            href: html`<uaui-kpi-tile label="Approved" loading href="#a"></uaui-kpi-tile>`,
            openable: html`<uaui-kpi-tile label="Pending" loading openable></uaui-kpi-tile>`,
            selectable: html`<uaui-kpi-tile label="Orders" loading selectable></uaui-kpi-tile>`,
        };
        const names = { href: "Approved", openable: "Pending", selectable: "Orders" };

        for (const [name, template] of Object.entries(variants)) {
            it(`keeps the label as the ${name} tile's accessible name behind the skeleton`, async () => {
                const el = await tile(template);
                const target = shadow(el).querySelector<HTMLElement>("a, button")!;
                expect(shadow(el).querySelector("uaui-skeleton")).not.toBeNull();
                expect(target.textContent?.replace(/\s+/g, " ").trim()).toBe(names[name as keyof typeof names]);
                await expect.element(page.elementLocator(target)).toHaveAccessibleName(names[name as keyof typeof names]);
            });

            it(`passes the a11y audit: ${name} tile loading`, async () => {
                const host = render(html`<div style="background: var(--uui-color-background); padding: 8px; width: 320px">${template}</div>`).container.querySelector("div")!;
                await host.querySelector("uaui-kpi-tile")!.updateComplete;
                expect(await axeRun(host)).toHaveNoViolations();
            });
        }

        it("doesn't show the hidden label", async () => {
            const el = await tile(variants.href);
            const hidden = shadow(el).querySelector<HTMLElement>(".content .visually-hidden")!;
            expect(hidden.getBoundingClientRect().width).toBeLessThanOrEqual(1);
        });
    });

    describe("Scenario: accessibility", () => {
        async function audit(template: TemplateResult, themeCss: string) {
            const theme = document.createElement("style");
            theme.textContent = themeCss;
            document.head.appendChild(theme);
            try {
                const host = render(html`<div style="background: var(--uui-color-background); padding: 8px; width: 320px">${template}</div>`).container.querySelector("div")!;
                await Promise.all([...host.querySelectorAll("uaui-kpi-tile")].map((t) => t.updateComplete));
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        const tiles = {
            link: html`<uaui-kpi-tile label="Approved" value="128" icon="icon-check" color="positive" href="#a" .delta=${4}></uaui-kpi-tile>`,
            openable: html`<uaui-kpi-tile label="Pending" value="12" icon="icon-time" color="warning" openable></uaui-kpi-tile>`,
            "status row": html`<uaui-kpi-tile label="Rejected" value="7" icon="icon-wrong" color="danger" href="#r"></uaui-kpi-tile
                ><uaui-kpi-tile label="Cancelled" value="3" icon="icon-block" color="default" href="#c"></uaui-kpi-tile>`,
        };
        const themes = { light: lightCss, dark: darkCss, "high contrast": highContrastCss };

        for (const [name, template] of Object.entries(tiles)) {
            for (const [themeName, css] of Object.entries(themes)) {
                it(`passes the a11y audit: ${name}, ${themeName}`, async () => {
                    expect(await audit(template, css)).toHaveNoViolations();
                });
            }
        }
    });
});
