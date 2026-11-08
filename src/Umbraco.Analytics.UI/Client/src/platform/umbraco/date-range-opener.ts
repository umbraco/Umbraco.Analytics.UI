import { UMB_MODAL_MANAGER_CONTEXT, UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { UauiDateRangeModalData, UauiDateRangeModalValue } from "../../date-range/types.js";
import type { UauiLitElement } from "./base-element.js";
// Registers uaui-date-range-modal, the element the modal manager shows
import "./date-range-modal.element.js";

/** Opens `uaui-date-range-modal`: a small centred dialog, like the backoffice's confirm dialog. Internal to the package. */
export const UAUI_DATE_RANGE_MODAL = new UmbModalToken<UauiDateRangeModalData, UauiDateRangeModalValue>(
    "Uaui.Modal.DateRange",
    { modal: { type: "dialog" }, value: { value: { from: "", to: "" } } },
);

/**
 * Opens the date range dialog through the backoffice modal manager, found from `host`.
 * Resolves with the saved value, or `undefined` when the editor closed it or there is no modal manager.
 * The modal context deep-freezes what it is given, so pass copies of values the caller owns.
 */
export async function openDateRange(
    host: UauiLitElement,
    data: UauiDateRangeModalData,
    value: UauiDateRangeModalValue,
): Promise<UauiDateRangeModalValue | undefined> {
    const manager = await host.getContext(UMB_MODAL_MANAGER_CONTEXT).catch(() => undefined);
    if (!manager) {
        console.warn("uaui-date-range: no UMB_MODAL_MANAGER_CONTEXT found, so the dialog can't open.", host);
        return undefined;
    }
    // Closing the dialog rejects it: that is the editor discarding their edits, not an error.
    return manager
        .open(host, UAUI_DATE_RANGE_MODAL, { data, value })
        .onSubmit()
        .catch(() => undefined);
}
