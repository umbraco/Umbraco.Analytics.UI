// DOM helpers shared by the specs: render an element by tag name, query through shadow roots, wait for nested
// elements to settle, and record events.
import { render } from "vitest-browser-lit";
import type { TemplateResult } from "@umbraco-cms/backoffice/external/lit";

export type UaxTestElement = HTMLElement & {
    updateComplete: Promise<boolean>;
    [key: string]: unknown;
};

/** Renders a template and returns the first element matching `tag`, once it has updated. */
export async function renderElement(template: TemplateResult, tag: string): Promise<UaxTestElement> {
    const el = render(template).container.querySelector(tag) as UaxTestElement;
    await el?.updateComplete;
    return el;
}

/** The element's shadow root. */
export function shadow(el: Element): ShadowRoot {
    return el.shadowRoot!;
}

/** Every element under `root` matching `selector`, looking inside the shadow roots of the elements it holds too. */
export function deepQueryAll<T extends Element = Element>(root: ParentNode, selector: string): T[] {
    const found = [...root.querySelectorAll<T>(selector)];
    for (const host of root.querySelectorAll("*")) {
        if (host.shadowRoot) found.push(...deepQueryAll<T>(host.shadowRoot, selector));
    }
    return found;
}

/** The first element under `root` matching `selector`, looking inside shadow roots too. */
export function deepQuery<T extends Element = Element>(root: ParentNode, selector: string): T | null {
    return deepQueryAll<T>(root, selector)[0] ?? null;
}

/** The text of `node` including what its descendants render in their shadow roots (`textContent` stops at a shadow root). */
export function deepText(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    const parts: string[] = [];
    const element = node as Element;
    if (element.shadowRoot) parts.push(...[...element.shadowRoot.childNodes].map(deepText));
    parts.push(...[...node.childNodes].map(deepText));
    return parts.join("");
}

/**
 * Waits for `el` and every element it renders, at any depth, to finish updating. A table's cells are elements
 * of their own, so they draw a microtask after the table's `updateComplete` resolves.
 */
export async function settle(el: Element & { updateComplete?: Promise<unknown> }): Promise<void> {
    for (let round = 0; round < 3; round++) {
        await el.updateComplete;
        const nested = deepQueryAll<Element & { updateComplete?: Promise<unknown> }>(el.shadowRoot ?? el, "*");
        await Promise.all(nested.map((child) => child.updateComplete));
    }
}

/** Resolves with the next event of `name` raised by `el`. */
export function nextEvent<T = unknown>(el: Element, name: string): Promise<CustomEvent<T>> {
    return new Promise((resolve) => el.addEventListener(name, (e) => resolve(e as CustomEvent<T>), { once: true }));
}

/** Records every event of `name` raised by `el`. */
export function recordEvents(el: Element, name: string): Event[] {
    const events: Event[] = [];
    el.addEventListener(name, (e) => events.push(e));
    return events;
}
