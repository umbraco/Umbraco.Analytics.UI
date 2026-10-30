import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { umbLocalizationManager } from "@umbraco-cms/backoffice/localization-api";
import type { UmbLocalizationSet } from "@umbraco-cms/backoffice/localization-api";
import en from "../../lang/en.js";
import { registerUaxLocalization } from "../localization/register.js";
import backofficeEn from "./backoffice-en.js";

const OVERRIDE_ALIAS = "Uax.Localization.TestOverride";

export function waitForKey(key: string, expected?: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const deadline = Date.now() + 5000;
        const check = () => {
            const value = (umbLocalizationManager.localizations.get("en") as UmbLocalizationSet | undefined)?.[key];
            if (typeof value === "string" && (expected === undefined || value === expected)) return resolve();
            if (Date.now() > deadline) return reject(new Error(`Translation ${key} did not load`));
            setTimeout(check, 10);
        };
        check();
    });
}

/**
 * Registers the package's English translations (the same dictionary lang/en.js ships) plus the
 * backoffice's own, and resolves once they are loaded, so elements render text instead of keys.
 */
export async function registerUaxTranslations(): Promise<void> {
    registerUaxLocalization(backofficeEn);
    await Promise.all([waitForKey("uaxAnalytics_emptyHeadline"), waitForKey("buttons_save")]);
}

/**
 * Registers a product-style localization that overrides one `uaxAnalytics_*` key, as a product's
 * own `localization` extension would. Returns a function that removes it and restores the package text.
 */
export async function registerUaxTranslationOverride(
    key: keyof typeof en.uaxAnalytics,
    value: string,
): Promise<() => Promise<void>> {
    const flatKey = `uaxAnalytics_${key}`;
    umbExtensionsRegistry.register({
        type: "localization",
        alias: OVERRIDE_ALIAS,
        name: "Uax product override (test)",
        // No weight, like a real product: it wins because the package registers at 200.
        meta: { culture: "en", localizations: { uaxAnalytics: { [key]: value } } },
    });
    await waitForKey(flatKey, value);
    return async () => {
        umbExtensionsRegistry.unregister(OVERRIDE_ALIAS);
        await waitForKey(flatKey, en.uaxAnalytics[key]);
    };
}
