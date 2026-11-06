// KTD-1 to KTD-6 — A tile shows a second line under its value: `detail` ("{0} cached"), `detail-value` and `detail-format`.
// KTD-1 AC1–AC12 · KTD-2 AC1–AC5 · KTD-3 AC1–AC6 · KTD-4 AC1–AC7 · KTD-5 AC1–AC3 · KTD-6 AC1–AC3
/// <reference types="vite/client" />
import { beforeAll, describe, expect, it } from "vitest";
import { page } from "vitest/browser";
import latoBold from "../../node_modules/@umbraco-ui/uui/dist/assets/fonts/LatoLatin-Bold.woff2?url";
import latoRegular from "../../node_modules/@umbraco-ui/uui/dist/assets/fonts/LatoLatin-Regular.woff2?url";
import { html, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import darkCss from "@umbraco-ui/uui/themes/dark.css?inline";
import { render } from "vitest-browser-lit";
import { axeRun } from "../internal/test/a11y.js";
import { deepQuery, renderElement, settle, shadow } from "../internal/test/dom.js";
import type { UauiKpiTileElement } from "./kpi-tile.element.js";
import "./kpi-tile.element.js";

// The backoffice's font, so the layout specs measure real widths (see kpi-tile.narrow.test.ts).
beforeAll(async () => {
    for (const [weight, url] of [["400", latoRegular], ["700", latoBold]] as const) {
        document.fonts.add(await new FontFace("Lato", `url(${url})`, { weight }).load());
    }
});

const EUR: Intl.NumberFormatOptions = { style: "currency", currency: "EUR" };

const tile = async (template: TemplateResult) => {
    const el = await renderElement(template, "uaui-kpi-tile");
    await settle(el);
    return el;
};

/** Renders a tile in a cell of the given width, in the backoffice's font. */
async function tileIn(width: number, template: TemplateResult) {
    const { container } = render(html`<div class="cell" style="width: ${width}px; font-family: Lato, sans-serif">${template}</div>`);
    const el = container.querySelector("uaui-kpi-tile") as UauiKpiTileElement;
    await settle(el);
    return { el, cell: container.querySelector(".cell") as HTMLElement };
}

/** Text as it reaches the eye or the ear: skips the parts hidden from it. Intl's no-break spaces become spaces. */
function text(node: Node, skip: string): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    const element = node as Element;
    if (element.matches?.(skip)) return "";
    const parts: string[] = [];
    if (element.shadowRoot) parts.push(...[...element.shadowRoot.childNodes].map((child) => text(child, skip)));
    parts.push(...[...node.childNodes].map((child) => text(child, skip)));
    return parts.join("");
}
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

const line = (el: Element) => shadow(el).querySelector<HTMLElement>("uaui-figure-detail");
const value = (el: Element) => shadow(el).querySelector<HTMLElement>(".value")!;
const badge = (el: Element) => shadow(el).querySelector<HTMLElement>("uaui-delta-badge")!;
const label = (el: Element) => shadow(el).querySelector<HTMLElement>(".label")!;
/** What the line reads on screen. */
const reads = (el: Element) => (line(el) ? clean(text(line(el)!, ".visually-hidden")) : undefined);
/** What a screen reader hears from the line. */
const heard = (el: Element) => clean(text(line(el)!, "[aria-hidden=true]"));
/** Whether the tile shows a line with something in it. */
const hasLine = (el: Element) => reads(el) !== undefined && reads(el) !== "";
/** The short number's hover title, on the hidden compact text uaui-figure-value draws. */
const shortTitle = (el: Element) => deepQuery(shadow(line(el)!), "uaui-figure-value")?.shadowRoot?.querySelector("[aria-hidden=true][title]")?.getAttribute("title");
/** The line's own hover title: on the line, or the first titled element it draws itself. */
const lineTitle = (el: Element) => line(el)!.getAttribute("title") ?? shadow(line(el)!).querySelector(":not(uaui-figure-value)[title]")?.getAttribute("title");
const rect = (node: Element) => node.getBoundingClientRect();
/** The value, line and badge, top to bottom. */
const stack = (el: Element) =>
    ([["value", value(el)], ["line", line(el)!], ["badge", badge(el)]] as const)
        .map(([name, node]) => ({ name, top: rect(node).top }))
        .sort((a, b) => a.top - b.top)
        .map(({ name }) => name);

describe("Feature: a tile shows a part of its total on a second line", () => {
    describe("Scenario: a pattern and a number", () => {
        it("fills the pattern with the formatted number", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`);
            expect(reads(el)).toBe("114,300 cached");
        });

        it("formats the number in the editor's language", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="da-DK" label="Input tokens" .value=${134800} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`);
            expect(reads(el)).toBe("114.300 cached");
        });

        it("uses the value's format by default", async () => {
            const el = await tile(
                html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${4837.4} .valueFormat=${EUR} detail="{0} refunded" .detailValue=${120.5}></uaui-kpi-tile>`,
            );
            expect(reads(el)).toBe("€120.50 refunded");
        });

        it("lets detailFormat win over the value's format", async () => {
            const el = await tile(
                html`<uaui-kpi-tile
                    lang="en-US"
                    label="Input tokens"
                    .value=${0.256}
                    .valueFormat=${{ style: "percent" }}
                    detail="{0} orders"
                    .detailValue=${1234}
                    .detailFormat=${{ style: "decimal" }}></uaui-kpi-tile>`,
            );
            expect(reads(el)).toBe("1,234 orders");
        });

        it("keeps the pattern's word order", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} detail="Cached: {0}" .detailValue=${114300}></uaui-kpi-tile>`);
            expect(reads(el)).toBe("Cached: 114,300");
        });

        it("reads detail, detail-value and detail-format from attributes", async () => {
            const el = await tile(
                html`<uaui-kpi-tile lang="en-US" label="Input tokens" value="134800" detail="{0} cached" detail-value="114300" detail-format='{"notation":"compact"}'></uaui-kpi-tile>`,
            );
            expect(reads(el)).toBe("114K cached");
        });
    });

    describe("Scenario: a pattern with no {0}", () => {
        it("shows it as a plain note", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${12.4} detail="Estimated"></uaui-kpi-tile>`);
            expect(reads(el)).toBe("Estimated");
        });
    });

    describe("Scenario: the line is quieter text", () => {
        const styled = () => tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`);

        it("is 13px", async () => {
            const el = await styled();
            expect(getComputedStyle(line(el)!).fontSize).toBe("13px");
        });

        it("is normal weight", async () => {
            const el = await styled();
            expect(getComputedStyle(line(el)!).fontWeight).toBe("400");
        });

        it("is in the label's grey, --uui-color-text-alt", async () => {
            const el = await styled();
            expect(getComputedStyle(line(el)!).color).toBe(getComputedStyle(label(el)).color);
        });
    });

    describe("Scenario (sad path): placeholders other than {0}", () => {
        it("fills every {0} and leaves {1} as typed", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} detail="{0} of {1} ({0})" .detailValue=${5}></uaui-kpi-tile>`);
            expect(reads(el)).toBe("5 of {1} (5)");
        });

        it("leaves %0% as typed", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} detail="%0% cached" .detailValue=${5}></uaui-kpi-tile>`);
            expect(reads(el)).toBe("%0% cached");
        });
    });

    describe("Scenario (sad path): markup in the pattern", () => {
        const marked = () => tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} .detail=${"<b>{0}</b> cached"} .detailValue=${5}></uaui-kpi-tile>`);

        it("shows the markup as text", async () => {
            const el = await marked();
            expect(reads(el)).toBe("<b>5</b> cached");
        });

        it("adds no elements from the markup", async () => {
            const el = await marked();
            expect(deepQuery(shadow(line(el)!), "b")).toBeNull();
        });
    });
    describe("Scenario: the value is shown short", () => {
        const agents = () => tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${1280000} detail="{0} from agents" .detailValue=${412000}></uaui-kpi-tile>`);

        it("shortens the line's number too", async () => {
            const el = await agents();
            expect(reads(el)).toBe("412K from agents");
        });

        it("gives the short number its exact amount as a hover title", async () => {
            const el = await agents();
            expect(shortTitle(el)).toBe("412,000");
        });

        it("gives screen readers the exact amount", async () => {
            const el = await agents();
            expect(heard(el)).toBe("412,000 from agents");
        });
    });

    describe("Scenario: the line's own number is big", () => {
        it("shortens it by the 1,000,000 rule", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} detail="{0} cached" .detailValue=${1143000}></uaui-kpi-tile>`);
            expect(reads(el)).toBe("1.14M cached");
        });
    });

    describe("Scenario (sad path): detailFormat sets a notation", () => {
        it("keeps the product's notation", async () => {
            const el = await tile(
                html`<uaui-kpi-tile
                    lang="en-US"
                    label="Input tokens"
                    .value=${1280000}
                    detail="{0} from agents"
                    .detailValue=${412000}
                    .detailFormat=${{ notation: "standard" }}></uaui-kpi-tile>`,
            );
            expect(reads(el)).toBe("412,000 from agents");
        });
    });
    describe("Scenario (sad path): a {0} pattern with no number", () => {
        it("shows no line without a detail value", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} detail="{0} cached"></uaui-kpi-tile>`);
            expect(hasLine(el)).toBe(false);
        });

        it("shows no line for a detail value that isn't finite", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} detail="{0} cached" .detailValue=${Number.NaN}></uaui-kpi-tile>`);
            expect(hasLine(el)).toBe(false);
        });
    });

    describe("Scenario (sad path): no figure for the line", () => {
        it("adds no line element for a {0} pattern with no detail value, even with a badge", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} .delta=${18.7} detail="{0} cached"></uaui-kpi-tile>`);
            expect(shadow(el).querySelector("uaui-figure-detail")).toBeNull();
        });
    });

    describe("Scenario (sad path): no value", () => {
        it("adds no line element when the tile has no value", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`);
            expect(shadow(el).querySelector("uaui-figure-detail")).toBeNull();
        });
    });

    describe("Scenario (sad path): no pattern", () => {
        it("shows no line without detail", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} .detailValue=${114300}></uaui-kpi-tile>`);
            expect(hasLine(el)).toBe(false);
        });

        it("shows no line for an empty detail", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} detail="" .detailValue=${114300}></uaui-kpi-tile>`);
            expect(hasLine(el)).toBe(false);
        });
    });

    describe("Scenario (sad path): error and no data", () => {
        it("shows no line on error", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" error detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`);
            expect(hasLine(el)).toBe(false);
        });

        it("shows no line with no data", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" no-data detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`);
            expect(hasLine(el)).toBe(false);
        });
    });

    describe("Scenario: a tile without a line", () => {
        it.skip("keeps today's height: 48px of content", async () => {
            const { el } = await tileIn(300, html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} .delta=${18.7}></uaui-kpi-tile>`);
            expect(rect(shadow(el).querySelector(".content")!).height).toBe(48);
        });
    });
    const withBadge = (shown: number | string = 134800) =>
        html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${shown} .delta=${18.7} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`;

    describe("Scenario: the value and the badge fit on one line (400px)", () => {
        it.skip("puts the badge beside the value, tops level", async () => {
            const { el } = await tileIn(400, withBadge());
            expect(Math.abs(rect(badge(el)).top - rect(value(el)).top)).toBeLessThanOrEqual(1);
        });

        it.skip("puts the line under both the value and the badge", async () => {
            const { el } = await tileIn(400, withBadge());
            expect(rect(line(el)!).top).toBeGreaterThanOrEqual(Math.max(rect(value(el)).bottom, rect(badge(el)).bottom) - 0.5);
        });
    });

    describe("Scenario: they don't fit (200px)", () => {
        it.skip("stacks the value, the line, then the badge", async () => {
            const { el } = await tileIn(200, withBadge());
            expect(stack(el)).toEqual(["value", "line", "badge"]);
        });
    });

    describe("Scenario: it follows the real widths, not the tile's (260px)", () => {
        it.skip("keeps the badge beside a short value", async () => {
            const { el } = await tileIn(260, withBadge(5));
            expect(Math.abs(rect(badge(el)).top - rect(value(el)).top)).toBeLessThanOrEqual(1);
        });

        it.skip("moves the badge below the line for a long value", async () => {
            const { el } = await tileIn(260, withBadge("€1,234,567.89"));
            expect(stack(el)).toEqual(["value", "line", "badge"]);
        });
    });

    describe("Scenario: the tile resizes", () => {
        it.skip("moves the badge below the line when the cell narrows from 400px to 200px", async () => {
            const { el, cell } = await tileIn(400, withBadge());
            cell.style.width = "200px";
            await expect.poll(() => stack(el)).toEqual(["value", "line", "badge"]);
        });
    });

    describe("Scenario: a long line (200px)", () => {
        const long = () => tileIn(200, html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} detail="{0} cached by the provider this period" .detailValue=${1143000}></uaui-kpi-tile>`);

        it.skip("doesn't overflow the tile", async () => {
            const { el } = await long();
            const box = shadow(el).querySelector(".tile")!;
            expect(rect(line(el)!).right).toBeLessThanOrEqual(rect(box).right - parseFloat(getComputedStyle(box).paddingRight) + 0.5);
        });

        it.skip("has the full text as its title", async () => {
            const { el } = await long();
            expect(lineTitle(el)).toBe("1.14M cached by the provider this period");
        });
    });

    describe("Scenario (sad path): no badge", () => {
        it.skip("puts the line directly below the value", async () => {
            const { el } = await tileIn(400, html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`);
            expect(rect(line(el)!).top).toBeGreaterThanOrEqual(rect(value(el)).bottom - 0.5);
        });
    });
    describe("Scenario: reading order", () => {
        it("reads the value, then the line, then the badge", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} .delta=${18.7} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`);
            const order = [...shadow(el).querySelectorAll(".value, uaui-figure-detail, uaui-delta-badge")].map((node) => (node.classList.contains("value") ? "value" : node.localName));
            expect(order).toEqual(["value", "uaui-figure-detail", "uaui-delta-badge"]);
        });
    });

    describe("Scenario: a link tile", () => {
        it("includes the line in the link's accessible name", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" href="/tokens" .value=${134800} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`);
            await expect.element(page.elementLocator(shadow(el).querySelector("a")!)).toHaveAccessibleName(/114,300 cached/);
        });
    });

    describe("Scenario: accessibility", () => {
        async function audit(themeCss?: string) {
            const theme = document.createElement("style");
            if (themeCss) {
                theme.textContent = themeCss;
                document.head.appendChild(theme);
            }
            try {
                const host = render(
                    html`<div style="display: grid; gap: 8px; width: 320px">
                        <uaui-kpi-tile lang="en-US" label="Input tokens" icon="icon-coins" .value=${134800} .delta=${18.7} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>
                    </div>`,
                ).container.querySelector("div")!;
                await Promise.all([...host.querySelectorAll("uaui-kpi-tile")].map((el) => settle(el)));
                return await axeRun(host);
            } finally {
                theme.remove();
            }
        }

        it("passes the a11y audit in the light theme", async () => {
            expect(await audit()).toHaveNoViolations();
        });

        it("passes the a11y audit in the dark theme", async () => {
            expect(await audit(darkCss)).toHaveNoViolations();
        });
    });
    const loaded = html`<uaui-kpi-tile lang="en-US" label="Input tokens" .value=${134800} .delta=${18.7} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`;
    const loading = html`<uaui-kpi-tile lang="en-US" label="Input tokens" loading detail="{0} cached"></uaui-kpi-tile>`;
    const height = (el: Element) => rect(shadow(el).querySelector(".tile")!).height;

    describe("Scenario: the placeholder makes room for the line", () => {
        it.skip("matches the loaded tile's height in a 300px cell", async () => {
            const [{ el: before }, { el: after }] = [await tileIn(300, loading), await tileIn(300, loaded)];
            expect(height(before)).toBe(height(after));
        });

        it.skip("matches the loaded tile's height in a 200px cell", async () => {
            const [{ el: before }, { el: after }] = [await tileIn(200, loading), await tileIn(200, loaded)];
            expect(height(before)).toBe(height(after));
        });
    });

    describe("Scenario (sad path): no line", () => {
        it.skip("keeps today's height: 48px of content", async () => {
            const { el } = await tileIn(300, html`<uaui-kpi-tile lang="en-US" label="Input tokens" loading></uaui-kpi-tile>`);
            expect(rect(shadow(el).querySelector(".content")!).height).toBe(48);
        });
    });

    describe("Scenario: reloading with a value", () => {
        it("keeps the line", async () => {
            const el = await tile(html`<uaui-kpi-tile lang="en-US" label="Input tokens" loading .value=${134800} detail="{0} cached" .detailValue=${114300}></uaui-kpi-tile>`);
            expect(reads(el)).toBe("114,300 cached");
        });
    });
});
