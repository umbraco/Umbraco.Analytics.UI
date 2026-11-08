import { LitElement, property } from "./lit.js";
import { UauiLocalizationController } from "./localization.js";

export type { UauiLocalize } from "../localize.js";

// Swap point: the base class of every element in this package. In the core it is a LitElement with the same
// `lang` and `dir` properties as the backoffice's `UmbLitElement`, and our own `localize`.
export class UauiLitElement extends LitElement {
    /** The direction of the element, not of the page. */
    @property()
    override dir = "";

    /** The language of the element, not of the page. Empty means follow the nearest `lang`, then `<html lang>`. */
    @property()
    override lang = "";

    readonly localize = new UauiLocalizationController(this);
}
