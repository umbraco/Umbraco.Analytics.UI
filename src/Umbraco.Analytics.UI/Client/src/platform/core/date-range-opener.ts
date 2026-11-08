import type { UauiDateRangeModalData, UauiDateRangeModalValue } from "../../date-range/types.js";
import type { UauiDateRangeDialogElement } from "../../date-range/date-range-dialog.element.js";
import "#platform/uui";
// Registers uaui-date-range-dialog, the element placed in the modal
import "../../date-range/date-range-dialog.element.js";
import type { UauiLitElement } from "./base-element.js";

let container: HTMLElement | undefined;

/** One `uui-modal-container` on the body, made on first use and reused, as the backoffice does with its own. */
function modalContainer(): HTMLElement {
    if (!container?.isConnected) {
        container = document.createElement("uui-modal-container");
        document.body.append(container);
    }
    return container;
}

/** The focused element, looking into shadow roots. */
function deepActiveElement(): HTMLElement | undefined {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return active instanceof HTMLElement ? active : undefined;
}

/**
 * Opens `uaui-date-range-dialog` in a `uui-modal-dialog`, the element the backoffice's modal manager uses for a
 * `dialog` modal. Resolves with the saved value, or `undefined` when the editor pressed Close or Escape.
 * Focus goes back to the element that had it before the dialog opened.
 */
export function openDateRange(
    _host: UauiLitElement,
    data: UauiDateRangeModalData,
    value: UauiDateRangeModalValue,
): Promise<UauiDateRangeModalValue | undefined> {
    return new Promise((resolve) => {
        const opener = deepActiveElement();
        const modal = document.createElement("uui-modal-dialog");
        const dialog = document.createElement("uaui-date-range-dialog") as UauiDateRangeDialogElement;
        dialog.data = data;
        dialog.value = value;
        modal.append(dialog);

        // Escape and Close both end in uui:modal-close and then close-end, which also removes the modal.
        // Save resolves first, so the later close does not turn it into a discard.
        modal.addEventListener("uui:modal-close", () => resolve(undefined));
        modal.addEventListener("uui:modal-close-end", () => {
            resolve(undefined);
            if (opener?.isConnected) opener.focus();
        });
        // The dialog keeps its working value in `value`, which is what its submit event carries.
        dialog.addEventListener("submit", () => {
            resolve(dialog.value);
            (modal as HTMLElement & { close: () => void }).close();
        });
        dialog.addEventListener("close", () => (modal as HTMLElement & { close: () => void }).close());

        modalContainer().append(modal);
    });
}
