import { html, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, type UaxTestElement } from "./pending.js";
import "./modal-host.element.js";

/** Renders a template inside a modal host (see `uax-test-modal-host`) and returns the element matching `tag`. */
export function renderWithModals(template: TemplateResult, tag: string): Promise<UaxTestElement> {
    return renderElement(html`<uax-test-modal-host>${template}</uax-test-modal-host>`, tag);
}

/** The first element matching `selector` anywhere in the document, looking inside shadow roots. */
export function queryDeep(selector: string, root: ParentNode = document): UaxTestElement | null {
    const found = root.querySelector(selector);
    if (found) return found as UaxTestElement;
    for (const el of root.querySelectorAll("*")) {
        if (el.shadowRoot) {
            const inner = queryDeep(selector, el.shadowRoot);
            if (inner) return inner;
        }
    }
    return null;
}
