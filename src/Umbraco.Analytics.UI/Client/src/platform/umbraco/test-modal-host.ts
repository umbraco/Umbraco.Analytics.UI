// Tests only; never imported by shipped code. Helpers for specs that run against the backoffice's modal manager.
import { html, type TemplateResult } from "#platform/lit";
import { renderElement, type UauiTestElement } from "../../internal/test/dom.js";
import "./test-modal-host.element.js";

/** Renders a template inside a modal host (see `uaui-test-modal-host`) and returns the element matching `tag`. */
export function renderWithModals(template: TemplateResult, tag: string): Promise<UauiTestElement> {
    return renderElement(html`<uaui-test-modal-host>${template}</uaui-test-modal-host>`, tag);
}

/**
 * Renders a page example under a modal host (the date range dialog needs one), 1200px wide like a
 * backoffice workspace, and returns the element matching `tag`, once it has updated.
 */
export function renderPageExample(template: TemplateResult, tag: string): Promise<UauiTestElement> {
    return renderWithModals(html`<div style="width: 1200px">${template}</div>`, tag);
}
