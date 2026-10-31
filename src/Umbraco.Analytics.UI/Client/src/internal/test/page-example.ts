import { html, type TemplateResult } from "@umbraco-cms/backoffice/external/lit";
import { expect } from "vitest";
import { renderWithModals } from "./modal-host.js";
import { deepQuery, settle, type UauiTestElement } from "./dom.js";

/**
 * Renders a page example under a modal host (the date range dialog needs one), 1200px wide like a
 * backoffice workspace, and returns the element matching `tag`, once it has updated.
 */
export function renderPageExample(template: TemplateResult, tag: string): Promise<UauiTestElement> {
    return renderWithModals(html`<div style="width: 1200px">${template}</div>`, tag);
}

/**
 * Runs `run` with a UUI theme applied, and the body set up like the backoffice and Storybook set it up: the
 * theme's background and text colour. Passing no `themeCss` runs in the default light theme.
 */
export async function withTheme<T>(themeCss: string | undefined, run: () => Promise<T>): Promise<T> {
    const theme = document.createElement("style");
    if (themeCss) {
        theme.textContent = themeCss;
        document.head.appendChild(theme);
    }
    document.body.style.background = "var(--uui-color-background)";
    document.body.style.color = "var(--uui-color-text)";
    try {
        return await run();
    } finally {
        document.body.style.background = "";
        document.body.style.color = "";
        theme.remove();
    }
}

/**
 * Drives the real date range dialog of a page: opens it from the page's `uaui-date-range`, sets each named field
 * (`from`, `to`, `preset`) and presses Save. `compare: "off"` turns the comparison off.
 */
export async function saveDateRange(page: Element, fields: Record<string, string>): Promise<void> {
    const dateRange = page.shadowRoot!.querySelector("uaui-date-range")!;
    (dateRange.shadowRoot!.querySelector("uui-button") as HTMLElement).click();
    await expect.poll(() => deepQuery<UauiTestElement>(document, "uaui-date-range-modal")).not.toBe(null);
    const modal = deepQuery<UauiTestElement>(document, "uaui-date-range-modal")!;
    await modal.updateComplete;
    for (const [name, value] of Object.entries(fields)) {
        const field = deepQuery<HTMLInputElement>(modal.shadowRoot!, `[name='${name}']`);
        if (!field) throw new Error(`saveDateRange: the date range dialog has no field named "${name}"`);
        if (name === "compare") field.checked = value !== "off";
        else field.value = value;
        field.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
        await settle(modal);
    }
    const save = [...modal.shadowRoot!.querySelectorAll("uui-button")].find((b) => b.getAttribute("label") === "Save") as HTMLElement;
    save.click();
}
