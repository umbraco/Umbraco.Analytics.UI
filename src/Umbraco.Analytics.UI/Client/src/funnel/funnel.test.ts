// T42 — conversion funnel (SPEC.md §10)
import { beforeEach, describe, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { html } from "@umbraco-cms/backoffice/external/lit";
import "@umbraco-cms/backoffice/external/uui";
import { axeRun } from "../internal/test/a11y.js";
import { deepQuery, deepText, pressed, recordEvents, renderElement, settle, shadow, type UauiTestElement } from "../internal/test/dom.js";
import "./funnel.element.js";
import { cartSteps, cartStepsPrevious, compareRangeLabel, currentRangeLabel, visitSteps, visitStepsPrevious } from "./internal/funnel-fixtures.js";

const steps = (el: Element) => [...shadow(el).querySelectorAll<HTMLElement>(".step")];
const links = (el: Element) => [...shadow(el).querySelectorAll<HTMLElement>(".link")];
const bar = (el: Element, index: number) => steps(el)[index].querySelector<HTMLElement>(".bar");
const bracket = (el: Element, index: number) => steps(el)[index].querySelector<HTMLElement>(".bracket");
const tooltip = (el: Element) => shadow(el).querySelector<HTMLElement>("uaui-funnel-tooltip");
const tooltipText = (el: Element) => deepText(tooltip(el)!);
const hiddenTable = (el: Element) => deepQuery<HTMLTableElement>(shadow(el), "table")!;
const widthOf = (el: HTMLElement | null) => el?.getBoundingClientRect().width ?? 0;
const tableRows = (el: Element) =>
    [...hiddenTable(el).querySelectorAll("tbody tr")].map((tr) => [...tr.children].map((cell) => cell.textContent?.trim()));
const box = (el: Element) => el.getBoundingClientRect();
const parkPointer = (el: Element) => userEvent.hover(page.elementLocator(el), { position: { x: 1, y: 1 } });

const render = async (template: ReturnType<typeof html>) => {
    const el = await renderElement(template, "uaui-funnel");
    await settle(el);
    return el;
};

describe("Feature: conversion funnel", () => {
    describe("Scenario: three steps, no comparison", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await render(html`<uaui-funnel style="width: 560px" .steps=${cartSteps}></uaui-funnel>`);
        });

        it("draws one row per step", () => {
            expect(steps(el)).toHaveLength(3);
        });

        it("draws a link between each pair of steps", () => {
            expect(links(el)).toHaveLength(2);
        });

        it("shows each step's label and value", () => {
            expect(steps(el)[1].textContent).toMatch(/Reached checkout[\s\S]*532/);
        });

        it("sizes the bars by their value", () => {
            expect(widthOf(bar(el, 2)) / widthOf(bar(el, 0))).toBeCloseTo(318 / 1240, 2);
        });

        it("shows the share that moved on, on the link", () => {
            expect(links(el)[0].textContent).toContain("42.9%");
        });

        it("draws no brackets", () => {
            expect(bracket(el, 0)).toBe(null);
        });

        it("shows no legend", () => {
            expect(shadow(el).querySelector("uaui-funnel-legend")).toBe(null);
        });

        it("shows no change badges", () => {
            expect(shadow(el).querySelector(".link uaui-delta-badge")).toBe(null);
        });

        it("has no accessibility violations", async () => {
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: comparing with last period", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await render(
                html`<uaui-funnel
                    style="width: 560px"
                    .steps=${cartSteps}
                    .compareSteps=${cartStepsPrevious}
                    current-label=${currentRangeLabel}
                    compare-label=${compareRangeLabel}></uaui-funnel>`,
            );
        });

        it("draws a bracket on every matched step", () => {
            expect(steps(el).every((step) => step.querySelector(".bracket"))).toBe(true);
        });

        it("draws the bracket at the compare value's width", () => {
            expect(widthOf(bracket(el, 1)) / widthOf(bar(el, 0))).toBeCloseTo(498 / 1240, 2);
        });

        it("shows the change in points on each link", () => {
            const badge = links(el)[0].querySelector("uaui-delta-badge")!;
            expect([badge.unit, badge.value?.toFixed(1)]).toEqual(["points", "-2.2"]);
        });

        it("names both periods in the legend", () => {
            expect(deepText(shadow(el).querySelector("uaui-funnel-legend")!)).toMatch(/Jun 1, 2026[\s\S]*May 2, 2026/);
        });

        it("adds compare columns to the hidden table", () => {
            expect(hiddenTable(el).querySelectorAll("thead th")).toHaveLength(8);
        });

        it("has no accessibility violations", async () => {
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario: bar and bracket sizes", () => {
        it("draws a tiny value at least 2px wide", async () => {
            const el = await render(
                html`<uaui-funnel style="width: 560px" .steps=${[{ id: "a", label: "A", value: 100000 }, { id: "b", label: "B", value: 1 }]}></uaui-funnel>`,
            );
            expect(widthOf(bar(el, 1))).toBeGreaterThanOrEqual(2);
        });

        it("measures the bars against a compare value when it is the largest", async () => {
            const el = await render(
                html`<uaui-funnel
                    style="width: 560px"
                    .steps=${[{ id: "a", label: "A", value: 50 }]}
                    .compareSteps=${[{ id: "a", label: "A", value: 100 }]}></uaui-funnel>`,
            );
            const cell = steps(el)[0].querySelector(".bar-cell")!;
            expect(widthOf(bracket(el, 0)) / box(cell).width).toBeCloseTo(1, 2);
            expect(widthOf(bar(el, 0)) / box(cell).width).toBeCloseTo(0.5, 2);
        });

        it("pokes the bracket 5px out above and below the bar", async () => {
            const el = await render(html`<uaui-funnel style="width: 560px" .steps=${cartSteps} .compareSteps=${cartStepsPrevious}></uaui-funnel>`);
            const [b, k] = [box(bar(el, 1)!), box(bracket(el, 1)!)];
            expect([b.top - k.top, k.bottom - b.bottom]).toEqual([5, 5]);
        });

        it("draws no bracket for a compare value of 0", async () => {
            const el = await render(
                html`<uaui-funnel
                    .steps=${cartSteps}
                    .compareSteps=${[cartStepsPrevious[0], { id: "checkout", label: "Reached checkout", value: 0 }]}></uaui-funnel>`,
            );
            expect(bracket(el, 1)).toBe(null);
        });

        it("keeps every value on one line at 280px", async () => {
            const el = await render(html`<uaui-funnel style="width: 280px" .steps=${visitSteps} .valueFormat=${{ minimumFractionDigits: 2 }}></uaui-funnel>`);
            const heights = steps(el).map((step) => box(step.querySelector(".value")!).height);
            expect(heights.every((h) => h <= 18)).toBe(true);
        });

        it("keeps every value inside the funnel at 280px", async () => {
            const el = await render(html`<uaui-funnel style="width: 280px" .steps=${visitSteps} .valueFormat=${{ minimumFractionDigits: 2 }}></uaui-funnel>`);
            const right = box(el).right;
            expect(steps(el).map((step) => box(step.querySelector(".value")!).right <= right)).toEqual([true, true, true, true]);
        });
    });

    describe("Scenario: what assistive tech gets", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await render(
                html`<uaui-funnel .steps=${cartSteps} .compareSteps=${[cartStepsPrevious[0], cartStepsPrevious[1]]}></uaui-funnel>`,
            );
        });

        it("is a group named Funnel", () => {
            const region = shadow(el).querySelector(".region")!;
            expect([region.getAttribute("role"), region.getAttribute("aria-label")]).toEqual(["group", "Funnel"]);
        });

        it("leaves the first step's from-previous cells blank", () => {
            expect(tableRows(el)[0]).toEqual(["Carts created", "1,240", "100.0%", "", "", "1,105", "", ""]);
        });

        it("lists each later step's figures, drop-off and compare figures", () => {
            expect(tableRows(el)[1]).toEqual(["Reached checkout", "532", "42.9%", "42.9%", "708", "498", "45.1%", "607"]);
        });

        it("says No value where the funnel has none", () => {
            expect(tableRows(el)[2]).toEqual(["Orders placed", "318", "25.6%", "59.8%", "214", "No value", "No value", "No value"]);
        });
    });

    describe("Scenario: a step is larger than the one before it", () => {
        it("says 0 dropped off, not a negative count", async () => {
            const el = await render(
                html`<uaui-funnel
                    .steps=${[{ id: "a", label: "A", value: 100 }, { id: "b", label: "B", value: 120 }]}
                    .compareSteps=${[{ id: "a", label: "A", value: 80 }, { id: "b", label: "B", value: 90 }]}></uaui-funnel>`,
            );
            expect([tableRows(el)[1][4], tableRows(el)[1][7]]).toEqual(["0", "0"]);
        });
    });

    describe("Scenario: a screen reader user focuses a step", () => {
        const description = (el: Element, index: number) => {
            const id = steps(el)[index].getAttribute("aria-describedby")!;
            return shadow(el).getElementById(id);
        };

        it("describes it with the tooltip's figures when comparing", async () => {
            const el = await render(
                html`<uaui-funnel .steps=${cartSteps} .compareSteps=${cartStepsPrevious} compare-label=${compareRangeLabel}></uaui-funnel>`,
            );
            expect(description(el, 1)?.textContent).toBe(
                "This period: 532. May 2, 2026 to May 31, 2026: 498, +6.8%, improvement. Of Carts created: 42.9%. From previous step: 42.9%",
            );
        });

        it("describes it without the compare line when not comparing", async () => {
            const el = await render(html`<uaui-funnel .steps=${cartSteps}></uaui-funnel>`);
            expect(description(el, 2)?.textContent).toBe("This period: 318. Of Carts created: 25.6%. From previous step: 59.8%");
        });

        it("gives the first step only its values", async () => {
            const el = await render(html`<uaui-funnel .steps=${cartSteps} .compareSteps=${cartStepsPrevious}></uaui-funnel>`);
            expect(description(el, 0)?.textContent).toBe("This period: 1,240. Comparison: 1,105, +12.2%, improvement");
        });

        it("says No value where the link shows a dash", async () => {
            const el = await render(
                html`<uaui-funnel
                    .steps=${[{ id: "a", label: "A", value: 40 }, { id: "b", label: "B", value: 0 }, { id: "c", label: "C", value: 0 }]}></uaui-funnel>`,
            );
            expect(description(el, 2)?.textContent).toBe("This period: 0. Of A: 0.0%. From previous step: No value");
        });

        it("gives the browser that description for the focused step, when comparing", async () => {
            const el = await render(
                html`<uaui-funnel .steps=${cartSteps} .compareSteps=${cartStepsPrevious} compare-label=${compareRangeLabel}></uaui-funnel>`,
            );
            steps(el)[1].focus();
            await settle(el);
            await expect
                .element(page.elementLocator(steps(el)[1]))
                .toHaveAccessibleDescription(
                    "This period: 532. May 2, 2026 to May 31, 2026: 498, +6.8%, improvement. Of Carts created: 42.9%. From previous step: 42.9%",
                );
        });

        it("gives the browser that description for the focused step, when not comparing", async () => {
            const el = await render(html`<uaui-funnel .steps=${cartSteps}></uaui-funnel>`);
            steps(el)[1].focus();
            await settle(el);
            await expect
                .element(page.elementLocator(steps(el)[1]))
                .toHaveAccessibleDescription("This period: 532. Of Carts created: 42.9%. From previous step: 42.9%");
        });

        it("follows a change of language", async () => {
            const el = await render(html`<uaui-funnel .steps=${cartSteps}></uaui-funnel>`);
            el.lang = "da-DK";
            await settle(el);
            try {
                await expect.poll(() => description(el, 2)?.textContent).toContain("59,8");
            } finally {
                el.removeAttribute("lang");
            }
        });

        it("keeps the description out of the reading order, so it is not read twice", async () => {
            const el = await render(html`<uaui-funnel .steps=${cartSteps}></uaui-funnel>`);
            expect(steps(el).map((_, i) => description(el, i)?.hidden)).toEqual([true, true, true]);
        });

        it("updates the description when the steps change", async () => {
            const el = await render(html`<uaui-funnel .steps=${cartSteps}></uaui-funnel>`);
            el.steps = [cartSteps[0], { ...cartSteps[1], value: 620 }];
            await settle(el);
            expect(description(el, 1)?.textContent).toBe("This period: 620. Of Carts created: 50.0%. From previous step: 50.0%");
        });
    });

    describe("Scenario: a step is missing from the comparison", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await render(html`<uaui-funnel .steps=${cartSteps} .compareSteps=${cartStepsPrevious.slice(0, 2)}></uaui-funnel>`);
        });

        it("draws no bracket on it", () => {
            expect(bracket(el, 2)).toBe(null);
        });

        it("shows no badge on its link", () => {
            expect(links(el)[1].querySelector("uaui-delta-badge")).toBe(null);
        });

        it("still badges the steps that match", () => {
            expect(links(el)[0].querySelector("uaui-delta-badge")).not.toBe(null);
        });
    });

    describe("Scenario: the editor hovers a step", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await render(
                html`<uaui-funnel style="width: 560px" .steps=${cartSteps} .compareSteps=${cartStepsPrevious} compare-label=${compareRangeLabel}></uaui-funnel>`,
            );
            await userEvent.hover(page.elementLocator(steps(el)[1]));
            await settle(el);
        });

        it("shows its tooltip", async () => {
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
        });

        it("lists both values", () => {
            expect(tooltipText(el)).toMatch(/Reached checkout[\s\S]*532[\s\S]*498/);
        });

        it("lists the share of the first and the previous step", () => {
            expect(tooltipText(el)).toMatch(/Of Carts created[\s\S]*42\.9%[\s\S]*From previous step[\s\S]*42\.9%/);
        });

        it("hides the tooltip when the pointer leaves", async () => {
            await parkPointer(document.body);
            await settle(el);
            expect(tooltip(el)).toBe(null);
        });

        it("hides the tooltip on Escape", async () => {
            await userEvent.keyboard("{Escape}");
            await settle(el);
            expect(tooltip(el)).toBe(null);
        });

        it("shows the % change from last period", () => {
            expect(deepText(deepQuery(tooltip(el)!.shadowRoot!, "uaui-delta-badge")!)).toContain("6.8%");
        });

        it("drops the tooltip when the steps are replaced", async () => {
            el.steps = [...cartSteps];
            await settle(el);
            expect(tooltip(el)).toBe(null);
        });

        it("drops the tooltip when the funnel goes into error", async () => {
            el.error = true;
            await settle(el);
            el.error = false;
            await settle(el);
            expect(tooltip(el)).toBe(null);
        });
    });

    describe("Scenario: where the tooltip opens", () => {
        let el: UauiTestElement;
        const show = async (index: number) => {
            await userEvent.hover(page.elementLocator(steps(el)[index]));
            await settle(el);
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
        };
        beforeEach(async () => {
            el = await render(
                html`<uaui-funnel
                    style="width: 360px"
                    .steps=${visitSteps}
                    .compareSteps=${visitStepsPrevious}
                    current-label=${currentRangeLabel}
                    compare-label=${compareRangeLabel}></uaui-funnel>`,
            );
        });

        it("opens below the first step", async () => {
            await show(0);
            expect(box(tooltip(el)!).top).toBeGreaterThanOrEqual(box(steps(el)[0].querySelector(".bar-cell")!).bottom);
        });

        it("opens above the last step, where there is no room below", async () => {
            await show(3);
            expect(box(tooltip(el)!).bottom).toBeLessThanOrEqual(box(steps(el)[3].querySelector(".bar-cell")!).top);
        });

        it("stays inside the funnel", async () => {
            await show(3);
            const [tip, host] = [box(tooltip(el)!), box(el)];
            expect([tip.top >= host.top, tip.bottom <= host.bottom, tip.left >= host.left, tip.right <= host.right]).toEqual([true, true, true, true]);
        });
    });

    describe("Scenario: the tooltip fits neither above nor below", () => {
        // One step under a long period name that wraps, so the tooltip is taller than the room on either side.
        const longLabel = `${currentRangeLabel}, ${currentRangeLabel}, ${currentRangeLabel}, ${currentRangeLabel}`;
        const showFirst = async (padding: string) => {
            const el = await render(
                html`<uaui-funnel
                    style="width: 360px; --uaui-funnel-padding: ${padding}"
                    .steps=${[visitSteps[0]]}
                    .compareSteps=${[visitStepsPrevious[0]]}
                    current-label=${longLabel}
                    compare-label=${compareRangeLabel}></uaui-funnel>`,
            );
            await userEvent.hover(page.elementLocator(steps(el)[0]));
            await settle(el);
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
            const [tip, host, cell] = [box(tooltip(el)!), box(el), box(steps(el)[0].querySelector(".bar-cell")!)];
            // Neither side fits, but the funnel is taller than the tooltip, so where it lands shows the side it chose.
            expect([tip.height > cell.top - host.top - 8, tip.height > host.bottom - cell.bottom - 8, tip.height < host.height]).toEqual([true, true, true]);
            return { tip, host };
        };

        it("opens on the side with more room, above", async () => {
            const { tip, host } = await showFirst("50px 18px 24px");
            expect([tip.top, tip.bottom < host.bottom]).toEqual([host.top, true]);
        });

        it("opens on the side with more room, below", async () => {
            const { tip, host } = await showFirst("24px 18px 120px");
            expect([tip.bottom, tip.top > host.top]).toEqual([host.bottom, true]);
        });
    });

    describe("Scenario: the tooltip is wider than the room beside its bar", () => {
        // Padding on one side squeezes the bar column to the other edge, so a centred tooltip would stick out.
        const showFirst = async (padding: string) => {
            const el = await render(
                html`<uaui-funnel
                    style="width: 360px; --uaui-funnel-padding: ${padding}"
                    .steps=${cartSteps}
                    .compareSteps=${cartStepsPrevious}
                    current-label=${currentRangeLabel}
                    compare-label=${compareRangeLabel}></uaui-funnel>`,
            );
            await userEvent.hover(page.elementLocator(steps(el)[0]));
            await settle(el);
            await expect.poll(() => tooltip(el)?.style.visibility).toBe("visible");
            const cell = box(steps(el)[0].querySelector(".bar-cell")!);
            return { tip: box(tooltip(el)!), host: box(el), centre: cell.left + cell.width / 2 };
        };

        it("never goes past the right edge", async () => {
            const { tip, host, centre } = await showFirst("12px 4px 18px 200px");
            expect([centre + tip.width / 2 > host.right, tip.right]).toEqual([true, host.right]);
        });

        it("never goes past the left edge", async () => {
            const { tip, host, centre } = await showFirst("12px 200px 18px 4px");
            expect([centre - tip.width / 2 < host.left, tip.left]).toEqual([true, host.left]);
        });
    });

    describe("Scenario: the editor uses the keyboard", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await render(html`<button>before</button><uaui-funnel .steps=${cartSteps}></uaui-funnel>`);
            await parkPointer(document.body);
            (el.previousElementSibling as HTMLElement).focus();
            await userEvent.tab();
            await settle(el);
        });

        it("makes the steps one tab stop", () => {
            expect(steps(el).map((step) => step.tabIndex)).toEqual([0, -1, -1]);
        });

        it("focuses the first step on Tab", () => {
            expect(shadow(el).activeElement).toBe(steps(el)[0]);
        });

        it("shows the focused step's tooltip", () => {
            expect(tooltipText(el)).toContain("Carts created");
        });

        it("moves to the next step on Down", async () => {
            await userEvent.keyboard("{ArrowDown}");
            await settle(el);
            expect(shadow(el).activeElement).toBe(steps(el)[1]);
        });

        it("stops at the last step", async () => {
            await userEvent.keyboard("{End}{ArrowDown}");
            await settle(el);
            expect(shadow(el).activeElement).toBe(steps(el)[2]);
        });

        it("moves back on Up", async () => {
            await userEvent.keyboard("{ArrowDown}{ArrowUp}");
            await settle(el);
            expect(shadow(el).activeElement).toBe(steps(el)[0]);
        });

        it("names each step by its label and value", () => {
            expect(steps(el)[2].getAttribute("aria-label")).toBe("Orders placed: 318");
        });

        it("hides the tooltip when focus leaves", async () => {
            await userEvent.tab();
            await settle(el);
            expect(tooltip(el)).toBe(null);
        });

        it("hides the focused step's tooltip on Escape, keeping focus", async () => {
            await userEvent.keyboard("{Escape}");
            await settle(el);
            expect([tooltip(el), shadow(el).activeElement]).toEqual([null, steps(el)[0]]);
        });

        it("keeps the hovered step's tooltip when focus leaves", async () => {
            await userEvent.hover(page.elementLocator(steps(el)[1]));
            steps(el)[0].focus();
            await settle(el);
            await userEvent.tab();
            await settle(el);
            expect(tooltipText(el)).toContain("Reached checkout");
        });

        it("moves the tab stop to the last step when the steps get fewer", async () => {
            await userEvent.keyboard("{End}");
            el.steps = cartSteps.slice(0, 2);
            await settle(el);
            expect(steps(el).map((step) => step.tabIndex)).toEqual([-1, 0]);
        });
    });

    describe("Scenario: a step of 0", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await render(
                html`<uaui-funnel
                    .steps=${[
                        { id: "a", label: "Carts created", value: 40 },
                        { id: "b", label: "Reached checkout", value: 0 },
                        { id: "c", label: "Orders placed", value: 0 },
                    ]}></uaui-funnel>`,
            );
        });

        it("draws no bar for it", () => {
            expect(bar(el, 1)).toBe(null);
        });

        it("shows a dash for the share after it", () => {
            expect(links(el)[1].querySelector(".rate")?.textContent).toBe("–");
        });
    });

    describe("Scenario: values in the product's format", () => {
        it("formats the values with value-format", async () => {
            const el = await render(html`<uaui-funnel .steps=${cartSteps} .valueFormat=${{ minimumFractionDigits: 2 }}></uaui-funnel>`);
            expect(steps(el)[0].querySelector(".value")?.textContent).toBe("1,240.00");
        });
    });

    describe("Scenario: loading", () => {
        it("shows one grey bar per step on first load", async () => {
            const el = await render(html`<uaui-funnel loading .steps=${[{ id: "a", label: "A", value: 0 }, { id: "b", label: "B", value: 0 }]}></uaui-funnel>`);
            expect(shadow(el).querySelectorAll("uaui-skeleton")).toHaveLength(2);
        });

        it("draws its rows at the loaded height, so nothing jumps", async () => {
            const loaded = await render(html`<uaui-funnel style="width: 560px" .steps=${cartSteps}></uaui-funnel>`);
            const loading = await render(html`<uaui-funnel style="width: 560px" loading></uaui-funnel>`);
            const heights = (el: Element) => [box(steps(el)[0]).height, box(links(el)[0]).height];
            expect(heights(loading)).toEqual(heights(loaded));
        });

        it("draws its grey bars with the loaded bars' corners", async () => {
            const loaded = await render(html`<uaui-funnel .steps=${cartSteps}></uaui-funnel>`);
            const loading = await render(html`<uaui-funnel loading></uaui-funnel>`);
            const block = shadow(loading).querySelector("uaui-skeleton")!.shadowRoot!.querySelector(".block")!;
            const radius = getComputedStyle(block).borderTopLeftRadius;
            expect(radius).toBe("2px");
            expect(radius).toBe(getComputedStyle(bar(loaded, 0)!).borderTopLeftRadius);
        });

        it("shows four grey bars when the steps are not known yet", async () => {
            const el = await render(html`<uaui-funnel loading></uaui-funnel>`);
            expect(shadow(el).querySelectorAll("uaui-skeleton")).toHaveLength(4);
        });

        it("keeps the old funnel under a loading bar when reloading", async () => {
            const el = await render(html`<uaui-funnel loading .steps=${cartSteps}></uaui-funnel>`);
            expect([steps(el).length, !!shadow(el).querySelector("uaui-loading-bar")]).toEqual([3, true]);
        });

        it("marks the funnel busy", async () => {
            const el = await render(html`<uaui-funnel loading .steps=${cartSteps}></uaui-funnel>`);
            expect(shadow(el).querySelector(".region")?.getAttribute("aria-busy")).toBe("true");
        });

        it("has no accessibility violations on first load", async () => {
            const el = await render(html`<uaui-funnel loading></uaui-funnel>`);
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });

    describe("Scenario (sad path): nothing to show", () => {
        it("shows the empty state with no steps", async () => {
            const el = await render(html`<uaui-funnel></uaui-funnel>`);
            expect(shadow(el).querySelector("uaui-empty-state")).not.toBe(null);
        });

        it("shows the empty state when the first step is 0", async () => {
            const el = await render(html`<uaui-funnel .steps=${[{ id: "a", label: "A", value: 0 }]}></uaui-funnel>`);
            expect(shadow(el).querySelector("uaui-empty-state")).not.toBe(null);
        });

        it("passes on the product's empty text", async () => {
            const el = await render(html`<uaui-funnel empty-headline="No carts yet"></uaui-funnel>`);
            expect(deepText(shadow(el))).toContain("No carts yet");
        });
    });

    describe("Scenario (sad path): the load failed", () => {
        let el: UauiTestElement;
        beforeEach(async () => {
            el = await render(html`<uaui-funnel .steps=${cartSteps} error loading retryable></uaui-funnel>`);
        });

        it("shows the error state instead of the funnel", () => {
            expect([!!shadow(el).querySelector("uaui-error-state"), steps(el).length]).toEqual([true, 0]);
        });

        it("is not busy", () => {
            expect(shadow(el).querySelector(".region")?.getAttribute("aria-busy")).toBe("false");
        });

        it("raises retry on the funnel once", async () => {
            const events = recordEvents(el.parentElement!, "retry");
            await pressed(deepQuery(shadow(el), "uui-button")!);
            expect(events).toHaveLength(1);
        });

        it("has no accessibility violations", async () => {
            expect(await axeRun(el)).toHaveNoViolations();
        });
    });
});
