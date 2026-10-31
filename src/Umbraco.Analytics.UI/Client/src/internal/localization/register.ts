import { umbExtensionsRegistry } from "@umbraco-cms/backoffice/extension-registry";
import { umbLocalizationRegistry } from "@umbraco-cms/backoffice/localization";
import type { UmbLocalizationDictionary } from "@umbraco-cms/backoffice/localization-api";
import en from "../../lang/en.js";

export const UAUI_EN_ALIAS = "Uaui.Localization.En";
const BACKOFFICE_EN_ALIAS = "Uaui.Localization.BackofficeEn";

/**
 * Lower weights are merged last and win. The package sits at 200 so a product's own
 * `localization` extension at the default weight (100) always overrides it.
 */
export const UAUI_LOCALIZATION_WEIGHT = 200;

/**
 * Registers the package's English translations the way its `localization` extension does, for
 * the test helper and Storybook (outside the backoffice). Pass the backoffice's own English
 * dictionary to make the Umbraco keys elements reuse (`buttons_save`, `general_close`, ...)
 * resolve too; it sits behind the package so it never overrides it.
 */
export function registerUauiLocalization(backofficeEn?: UmbLocalizationDictionary): void {
    if (backofficeEn && !umbExtensionsRegistry.isRegistered(BACKOFFICE_EN_ALIAS)) {
        umbExtensionsRegistry.register({
            type: "localization",
            alias: BACKOFFICE_EN_ALIAS,
            name: "Backoffice English (Uaui test and Storybook)",
            weight: UAUI_LOCALIZATION_WEIGHT + 100,
            meta: { culture: "en", localizations: backofficeEn },
        });
    }
    if (!umbExtensionsRegistry.isRegistered(UAUI_EN_ALIAS)) {
        umbExtensionsRegistry.register({
            type: "localization",
            alias: UAUI_EN_ALIAS,
            name: "Uaui English",
            weight: UAUI_LOCALIZATION_WEIGHT,
            meta: { culture: "en", localizations: en },
        });
    }
    umbLocalizationRegistry.loadLanguage("en");
}
