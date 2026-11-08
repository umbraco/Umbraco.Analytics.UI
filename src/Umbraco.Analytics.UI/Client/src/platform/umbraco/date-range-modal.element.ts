import { customElement, html } from "#platform/lit";
import { UmbModalBaseElement } from "@umbraco-cms/backoffice/modal";
import "../../date-range/date-range-dialog.element.js";
import type { UauiDateRangeModalData, UauiDateRangeModalValue } from "../../date-range/types.js";

/**
 * The backoffice modal around `uaui-date-range-dialog`. Opened through the modal manager with
 * `UAUI_DATE_RANGE_MODAL`, not placed on a page: Save submits the dialog's value, Close rejects it.
 *
 * @element uaui-date-range-modal
 */
@customElement("uaui-date-range-modal")
export class UauiDateRangeModalElement extends UmbModalBaseElement<UauiDateRangeModalData, UauiDateRangeModalValue> {
    #onSubmit(e: CustomEvent<UauiDateRangeModalValue>) {
        this.updateValue(e.detail);
        this._submitModal();
    }

    override render() {
        return html`<uaui-date-range-dialog
            .data=${this.data}
            .value=${this.value}
            @submit=${this.#onSubmit}
            @close=${() => this._rejectModal()}></uaui-date-range-dialog>`;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "uaui-date-range-modal": UauiDateRangeModalElement;
    }
}
