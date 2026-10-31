import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { UauiDateRangeModalData, UauiDateRangeModalValue } from "./types.js";

/** Opens `uaui-date-range-modal`: a small centred dialog, like the backoffice's confirm dialog. Internal to the package. */
export const UAUI_DATE_RANGE_MODAL = new UmbModalToken<UauiDateRangeModalData, UauiDateRangeModalValue>(
    "Uaui.Modal.DateRange",
    { modal: { type: "dialog" }, value: { value: { from: "", to: "" } } },
);
