import type { ManifestModal } from "@umbraco-cms/backoffice/modal";
import { UAX_DATE_RANGE_MODAL } from "./date-range-modal.token.js";

/** The `modal` extension for the date range dialog. The element is in the main bundle, so it is looked up by name. */
export const uaxDateRangeModalManifest: ManifestModal = {
    type: "modal",
    alias: UAX_DATE_RANGE_MODAL.toString(),
    name: "Uax Date Range Modal",
    elementName: "uax-date-range-modal",
};

export const manifests: ManifestModal[] = [uaxDateRangeModalManifest];
