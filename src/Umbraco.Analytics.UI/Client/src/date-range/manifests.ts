import type { ManifestModal } from "@umbraco-cms/backoffice/modal";
import { UAUI_DATE_RANGE_MODAL } from "./date-range-modal.token.js";

/** The `modal` extension for the date range dialog. The element is in the main bundle, so it is looked up by name. */
export const uauiDateRangeModalManifest: ManifestModal = {
    type: "modal",
    alias: UAUI_DATE_RANGE_MODAL.toString(),
    name: "Uaui Date Range Modal",
    elementName: "uaui-date-range-modal",
};

export const manifests: ManifestModal[] = [uauiDateRangeModalManifest];
