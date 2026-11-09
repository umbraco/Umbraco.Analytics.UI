// Core swap point: UUI from `@umbraco-ui/uui`. Importing it defines every uui-* element, which our templates use
// (box, breadcrumbs, button, dialog-layout, form-layout-item, icon, input, loader-bar, select, symbol-sort, table,
// toggle). The backoffice does this for the Umbraco build; here the core has to. Names match what src imports.
import "@umbraco-ui/uui";

export { UUITextStyles } from "@umbraco-ui/uui";
export type { UUIInputElement, UUIInputEvent } from "@umbraco-ui/uui";
