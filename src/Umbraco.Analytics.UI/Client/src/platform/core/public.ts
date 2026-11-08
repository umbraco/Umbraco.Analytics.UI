// What the core package exports for its host to call.
export { registerUauiTranslations } from "./localization.js";
export type { UauiTranslations } from "./localization.js";
export type { UauiLocalize } from "../localize.js";
// Registers the fallback icons for our own elements (no export: loading the core is enough).
import "./icons.js";
