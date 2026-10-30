import { html, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, type UaxTestElement } from "./dom.js";
import "./modal-host.element.js";

/** Renders a template inside a modal host (see `uax-test-modal-host`) and returns the element matching `tag`. */
export function renderWithModals(template: TemplateResult, tag: string): Promise<UaxTestElement> {
    return renderElement(html`<uax-test-modal-host>${template}</uax-test-modal-host>`, tag);
}
