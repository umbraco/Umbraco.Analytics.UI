import { html, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { renderElement, type UauiTestElement } from "./dom.js";
import "./modal-host.element.js";

/** Renders a template inside a modal host (see `uaui-test-modal-host`) and returns the element matching `tag`. */
export function renderWithModals(template: TemplateResult, tag: string): Promise<UauiTestElement> {
    return renderElement(html`<uaui-test-modal-host>${template}</uaui-test-modal-host>`, tag);
}
