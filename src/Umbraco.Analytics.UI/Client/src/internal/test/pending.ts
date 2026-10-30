// Helpers for specs written before their element exists (bdd-specs, pending by default).
// They render elements by tag name, so a spec file compiles before the element module does.
// When a builder implements the element, it adds the element's static import to the spec
// file and turns `it.skip` into `it`.
import { render } from "vitest-browser-lit";
import type { TemplateResult } from "@umbraco-cms/backoffice/external/lit";

export type UanTestElement = HTMLElement & {
    updateComplete: Promise<boolean>;
    [key: string]: unknown;
};

/** Renders a template and returns the first element matching `tag`, once it has updated. */
export async function renderElement(template: TemplateResult, tag: string): Promise<UanTestElement> {
    const el = render(template).container.querySelector(tag) as UanTestElement;
    await el?.updateComplete;
    return el;
}

/** The element's shadow root. */
export function shadow(el: Element): ShadowRoot {
    return el.shadowRoot!;
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
