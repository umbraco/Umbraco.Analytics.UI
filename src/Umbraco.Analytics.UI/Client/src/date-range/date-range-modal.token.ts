import { UmbModalToken } from "@umbraco-cms/backoffice/modal";
import type { UaxDateRangeModalData, UaxDateRangeModalValue } from "./types.js";

/** Opens `uax-date-range-modal`: a small centred dialog, like the backoffice's confirm dialog. Internal to the package. */
export const UAX_DATE_RANGE_MODAL = new UmbModalToken<UaxDateRangeModalData, UaxDateRangeModalValue>(
    "Uax.Modal.DateRange",
    { modal: { type: "dialog" }, value: { value: { from: "", to: "" } } },
);
