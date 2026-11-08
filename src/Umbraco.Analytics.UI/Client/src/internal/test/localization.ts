// Tests only; never imported by shipped code. Translation helpers for specs on the core build, where a host
// adds text with registerUauiTranslations. The Umbraco build's equivalents are in src/platform/umbraco/test-localization.ts.
import en from "../../lang/en.js";
import { registerUauiTranslations } from "../../platform/core/public.js";
import { resetUauiTranslations } from "../../platform/core/localization.js";

/**
 * Registers a product-style override of one `uauiAnalytics_*` key, as a host would with `registerUauiTranslations`.
 * Returns a function that puts the package's own text back.
 */
export function registerUauiTranslationOverride(key: keyof typeof en.uauiAnalytics, value: string): () => void {
    registerUauiTranslations("en", { [`uauiAnalytics_${key}`]: value });
    return resetUauiTranslations;
}
